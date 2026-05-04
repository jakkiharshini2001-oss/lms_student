from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
import os
from dotenv import load_dotenv

from drive_service import download_excel
from parser import parse_excel
from cache import get_cached_data, set_cache

# ---------------- ENV ----------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Missing Supabase credentials")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------- APP ----------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    try:
        res = supabase.table("students") \
            .select("*") \
            .eq("id", student_id) \
            .execute()

        if not res.data:
            raise HTTPException(404, "Student not found")

        return res.data[0]

    except Exception as e:
        print("STUDENT ERROR:", e)
        raise HTTPException(500, "Failed to fetch student")


# ---------------- HELPERS ----------------
def get_file_id(assessment_id: str):
    res = supabase.table("assessments") \
        .select("file_id") \
        .eq("id", assessment_id) \
        .execute()

    if not res.data:
        raise HTTPException(404, "Assessment not found")

    return res.data[0]["file_id"]


# ---------------- ASSIGNMENTS ----------------
@app.get("/assignments/{student_id}")
def get_assignments(student_id: str):
    try:
        # 1. Get student
        stu = supabase.table("students") \
            .select("department, year, semester") \
            .eq("id", student_id) \
            .execute()

        if not stu.data:
            return []

        student = stu.data[0]

        # 2. Get assignments
        ass_res = supabase.table("assessments") \
            .select("*") \
            .ilike("department", student["department"]) \
            .eq("year", student["year"]) \
            .eq("semester", student["semester"]) \
            .execute()

        assignments = ass_res.data or []

        # 3. Get attempts
        att_res = supabase.table("student_attempts") \
            .select("assessment_id, score, total") \
            .eq("student_id", student_id) \
            .execute()

        attempts = {a["assessment_id"]: a for a in att_res.data}

        # 4. Merge
        for a in assignments:
            attempt = attempts.get(a["id"])

            if attempt:
                a["score"] = f"{attempt['score']}/{attempt['total']}"
            else:
                a["score"] = None

        return assignments

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
            file_stream = download_excel(file_id)
            cached = parse_excel(file_stream)
            set_cache(assessment_id, cached)

        cached = sorted(cached, key=lambda x: int(x["id"]))

        safe = []
        for q in cached:
            safe.append({
                "id": str(q["id"]),
                "question": q.get("question", ""),
                "option_a": q.get("option_a", ""),
                "option_b": q.get("option_b", ""),
                "option_c": q.get("option_c", ""),
                "option_d": q.get("option_d", ""),
            })

        return safe

    except Exception as e:
        print("ASSESSMENT ERROR:", e)
        raise HTTPException(500, "Error loading questions")


# ---------------- SUBMIT ----------------
@app.post("/submit/{assessment_id}")
def submit(assessment_id: str, data: Submission):
    try:
        # 🔥 Load questions
        questions = get_cached_data(assessment_id)

        if not questions:
            file_id = get_file_id(assessment_id)
            file_stream = download_excel(file_id)
            questions = parse_excel(file_stream)
            set_cache(assessment_id, questions)

        questions = sorted(questions, key=lambda x: int(x["id"]))
        
        # 🔒 CHECK BEFORE SUBMIT
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
            correct = str(q.get("correct", "")).strip().upper()
            user = str(data.answers.get(qid, "")).strip().upper()

            correct_answers[qid] = correct

            if user == correct:
                score += 1

        # 🔥 GET STUDENT INFO (NEW)
        stu = supabase.table("students") \
            .select("department, year, semester") \
            .eq("id", data.student_id) \
            .execute()

        if not stu.data:
            raise HTTPException(404, "Student not found")

        student = stu.data[0]

        # 🔥 GET SUBJECT FROM ASSESSMENT (NEW)
        ass = supabase.table("assessments") \
            .select("subject") \
            .eq("id", assessment_id) \
            .execute()

        if not ass.data:
            raise HTTPException(404, "Assessment not found")

        assessment = ass.data[0]

        # ✅ UPSERT WITH SNAPSHOT FIELDS
        supabase.table("student_attempts").upsert(
            {
                "student_id": data.student_id,
                "assessment_id": assessment_id,

                # 🔥 NEW FIELDS
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


# ---------------- GET ATTEMPT ----------------
@app.get("/attempt/{assessment_id}/{student_id}")
def get_attempt(assessment_id: str, student_id: str):
    try:
        # 1. Get attempt
        res = supabase.table("student_attempts") \
            .select("*") \
            .eq("assessment_id", assessment_id) \
            .eq("student_id", student_id) \
            .limit(1) \
            .execute()

        if not res.data:
            return None

        attempt = res.data[0]

        # 2. Load questions again
        questions = get_cached_data(assessment_id)

        if not questions:
            file_id = get_file_id(assessment_id)
            file_stream = download_excel(file_id)
            questions = parse_excel(file_stream)
            set_cache(assessment_id, questions)

        # 3. Recreate correct answers
        correct_answers = {}
        for q in questions:
            qid = str(q["id"])
            correct_answers[qid] = str(q["correct"]).strip().upper()

        # 4. RETURN FULL DATA
        return {
            **attempt,
            "correctAnswers": correct_answers
        }

    except Exception as e:
        print("ATTEMPT ERROR:", e)
        return None


# ---------------- ROOT ----------------
@app.get("/")
def root():
    return {"message": "LMS Backend Running 🚀"}