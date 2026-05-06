from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
import os
from dotenv import load_dotenv

from drive_service import download_excel
from parser import parse_excel
from cache import get_cached_data, set_cache
import pandas as pd

def parse_excel(file_stream):
    try:
        df = pd.read_excel(file_stream)

        # ✅ Normalize column names
        df.columns = [str(c).strip().lower() for c in df.columns]

        print("📊 Columns detected:", df.columns)

        # ✅ CLEAN FUNCTION (KEY FIX)
        def clean(val):
            if pd.isna(val):   # handles NaN properly
                return ""
            val = str(val).strip()
            if val.lower() in ["nan", "none"]:
                return ""
            return val

        questions = []

        for i, row in df.iterrows():
            row = row.to_dict()

            question = clean(row.get("question"))

            # Skip empty questions
            if not question:
                continue

            questions.append({
                "id": str(len(questions) + 1),
                "question": question,

                # ✅ FIXED OPTIONS (NO "nan" EVER)
                "option_a": clean(row.get("option a")),
                "option_b": clean(row.get("option b")),
                "option_c": clean(row.get("option c")),
                "option_d": clean(row.get("option d")),

                "correct": clean(row.get("answer")).upper()
            })

        print(f"✅ Parsed {len(questions)} questions")

        return questions

    except Exception as e:
        print("❌ PARSER ERROR:", e)
        raise e  # ← IMPORTANT (don’t hide error)
# ---------------- ENV ----------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Missing Supabase credentials")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------- APP ----------------
app = FastAPI()
origins = [
    "http://localhost:5174",
    "http://localhost:3000",
    "https://lms-student-ch346aguv-jakkiharshini2001-7309s-projects.vercel.app/",  # 🔥 replace with your frontend URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- MODEL ----------------
class Submission(BaseModel):
    student_id: str
    answers: dict


# ---------------- STUDENT ----------------
@app.get("/student/{student_id}")
def get_student(student_id: str):
    res = supabase.table("students").select("*").eq("id", student_id).execute()
    if not res.data:
        raise HTTPException(404, "Student not found")
    return res.data[0]


# ---------------- HELPERS ----------------
def get_file_id(assessment_id: str):
    res = supabase.table("assessments").select("file_id").eq("id", assessment_id).execute()
    if not res.data:
        raise HTTPException(404, "Assessment not found")
    return res.data[0]["file_id"]


# ---------------- ASSIGNMENTS (FIXED CORE LOGIC) ----------------
@app.get("/assignments/{student_id}")
def get_assignments(student_id: str):
    try:
        stu = supabase.table("students") \
            .select("department, year, semester") \
            .eq("id", student_id) \
            .execute()

        if not stu.data:
            return []

        student = stu.data[0]

        student_department = (student.get("department") or "").lower()
        student_year = int(student.get("year")) if student.get("year") else None
        student_semester = student.get("semester")

        print("🔍 Student:", student)

        # 🔥 GET ALL ASSIGNMENTS
        ass_res = supabase.table("assessments").select("*").execute()
        all_assignments = ass_res.data or []

        filtered = []

        for a in all_assignments:
            dept = (a.get("department") or "").lower()

            # ✅ FLEXIBLE MATCH (FIXED)
            if not any(word in dept for word in student_department.split()):
                continue

            # ✅ YEAR MATCH
            if a.get("year") and int(a.get("year")) != student_year:
                continue

            # ✅ SEMESTER MATCH
            if student_year != 1:
                if a.get("semester") and a.get("semester") != student_semester:
                    continue

            filtered.append(a)

        print("✅ FINAL assignments:", filtered)

        # 🔥 ATTEMPTS
        att_res = supabase.table("student_attempts") \
            .select("assessment_id, score, total") \
            .eq("student_id", student_id) \
            .execute()

        attempts = {a["assessment_id"]: a for a in att_res.data}

        for a in filtered:
            attempt = attempts.get(a["id"])
            if attempt:
                a["score"] = f"{attempt['score']}/{attempt['total']}"
            else:
                a["score"] = None

        return filtered

    except Exception as e:
        print("ASSIGNMENT ERROR:", e)
        return []

# ---------------- QUESTIONS ----------------
@app.get("/assessment/{assessment_id}")
def get_assessment(assessment_id: str):
    try:
        cached = get_cached_data(assessment_id)

        if not cached:
            file_id = get_file_id(assessment_id)

            print("📥 Downloading file:", file_id)

            file_stream = download_excel(file_id)

            print("📄 File downloaded")

            cached = parse_excel(file_stream)

            print("📊 Parsed questions:", cached)

            if not cached:
                raise Exception("No questions parsed from Excel")

            set_cache(assessment_id, cached)

        safe = []
        for i, q in enumerate(cached):
            safe.append({
                "id": str(i + 1),
                "question": q.get("question", ""),
                "option_a": q.get("option_a", ""),
                "option_b": q.get("option_b", ""),
                "option_c": q.get("option_c", ""),
                "option_d": q.get("option_d", ""),
            })

        return safe

    except Exception as e:
        print("🔥 REAL ERROR:", str(e))   # ← IMPORTANT
        raise HTTPException(500, f"Error: {str(e)}")


# ---------------- SUBMIT ----------------
@app.post("/submit/{assessment_id}")
def submit(assessment_id: str, data: Submission):
    try:
        questions = get_cached_data(assessment_id)

        if not questions:
            file_id = get_file_id(assessment_id)
            file_stream = download_excel(file_id)
            questions = parse_excel(file_stream)
            set_cache(assessment_id, questions)

        questions = sorted(questions, key=lambda x: int(x["id"]))

        existing = supabase.table("student_attempts") \
            .select("id") \
            .eq("student_id", data.student_id) \
            .eq("assessment_id", assessment_id) \
            .execute()

        if existing.data:
            raise HTTPException(400, "Already attempted")

        score = 0
        correct_answers = {}

        for q in questions:
            qid = str(q["id"])
            correct = str(q.get("correct", "")).upper()
            user = str(data.answers.get(qid, "")).upper()

            correct_answers[qid] = correct
            if user == correct:
                score += 1

        # student snapshot
        stu = supabase.table("students") \
            .select("department, year, semester") \
            .eq("id", data.student_id) \
            .execute()

        student = stu.data[0]

        ass = supabase.table("assessments") \
            .select("subject") \
            .eq("id", assessment_id) \
            .execute()

        assessment = ass.data[0]

        supabase.table("student_attempts").upsert(
            {
                "student_id": data.student_id,
                "assessment_id": assessment_id,
                "department": student.get("department"),
                "year": student.get("year"),
                "semester": student.get("semester"),
                "subject": assessment.get("subject"),
                "answers_json": data.answers,
                "score": score,
                "total": len(questions)
            },
            on_conflict="student_id,assessment_id"
        ).execute()

        return {
            "score": score,
            "total": len(questions),
            "correctAnswers": correct_answers
        }

    except Exception as e:
        print("SUBMIT ERROR:", e)
        raise HTTPException(500, "Submission failed")


# ---------------- ATTEMPT ----------------
@app.get("/attempt/{assessment_id}/{student_id}")
def get_attempt(assessment_id: str, student_id: str):
    res = supabase.table("student_attempts") \
        .select("*") \
        .eq("assessment_id", assessment_id) \
        .eq("student_id", student_id) \
        .limit(1) \
        .execute()

    if not res.data:
        return None

    attempt = res.data[0]

    questions = get_cached_data(assessment_id)
    correct_answers = {
        str(q["id"]): str(q["correct"]).upper()
        for q in questions
    }

    return {**attempt, "correctAnswers": correct_answers}


# ---------------- ROOT ----------------
@app.get("/")
def root():
    return {"message": "LMS Backend Running 🚀"}