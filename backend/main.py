from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from dotenv import load_dotenv
import os

from drive_service import download_excel
from parser import parse_excel
from cache import get_cached_data, set_cache

# ================= ENV =================
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Missing Supabase credentials")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ================= APP =================
app = FastAPI()

# ================= CORS =================
app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5174",
        "http://localhost:3000",

        # ✅ YOUR VERCEL DOMAIN
        "https://lms-student-mm45cd8u8-jakkiharshini2001-7309s-projects.vercel.app",
    ],

    # ✅ ALLOW ALL VERCEL PREVIEWS
    allow_origin_regex=r"https://.*\.vercel\.app",

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= MODEL =================
class Submission(BaseModel):
    student_id: str
    answers: dict


# ================= HELPERS =================
def get_file_id(assessment_id: str):
    res = (
        supabase.table("assessments")
        .select("file_id")
        .eq("id", assessment_id)
        .execute()
    )

    if not res.data:
        raise HTTPException(404, "Assessment not found")

    return res.data[0]["file_id"]


# ================= STUDENT =================
@app.get("/student/{student_id}")
def get_student(student_id: str):

    res = (
        supabase.table("students")
        .select("*")
        .eq("id", student_id)
        .execute()
    )

    if not res.data:
        raise HTTPException(404, "Student not found")

    return res.data[0]


# ================= ASSIGNMENTS =================
@app.get("/assignments/{student_id}")
def get_assignments(student_id: str):

    try:

        # ===== GET STUDENT =====
        stu = (
            supabase.table("students")
            .select("*")
            .eq("id", student_id)
            .execute()
        )

        if not stu.data:
            return []

        student = stu.data[0]

        student_department = (
            str(student.get("department", ""))
            .strip()
            .lower()
        )

        student_year = int(student.get("year", 0))

        student_semester = student.get("semester")

        print("🎓 STUDENT:")
        print(
            student_department,
            student_year,
            student_semester
        )

        # ===== GET ASSESSMENTS =====
        ass_res = (
            supabase.table("assessments")
            .select("*")
            .execute()
        )

        all_assignments = ass_res.data or []

        print(f"📚 TOTAL ASSESSMENTS: {len(all_assignments)}")

        filtered = []

        for a in all_assignments:

            ass_department = (
                str(a.get("department", ""))
                .strip()
                .lower()
            )

            ass_year = a.get("year")
            ass_semester = a.get("semester")

            ass_year = int(ass_year) if ass_year else None

            # ===== MATCHES =====
            department_match = (
                ass_department == student_department
            )

            year_match = (
                ass_year == student_year
            )

            # First year semester optional
            if student_year == 1:
                semester_match = True
            else:
                semester_match = (
                    ass_semester is None
                    or student_semester is None
                    or int(ass_semester) == int(student_semester)
                )

            if (
                department_match
                and year_match
                and semester_match
            ):
                filtered.append(a)

        print(f"✅ FILTERED ASSIGNMENTS: {len(filtered)}")

        # ===== ATTEMPTS =====
        att_res = (
            supabase.table("student_attempts")
            .select("assessment_id, score, total")
            .eq("student_id", student_id)
            .execute()
        )

        attempts = {
            a["assessment_id"]: a
            for a in (att_res.data or [])
        }

        # ===== MERGE SCORES =====
        for a in filtered:

            attempt = attempts.get(a["id"])

            if attempt:
                a["score"] = (
                    f"{attempt['score']}/{attempt['total']}"
                )
            else:
                a["score"] = None

        return filtered

    except Exception as e:
        print("❌ ASSIGNMENT ERROR:", e)
        return []


# ================= QUESTIONS =================
@app.get("/assessment/{assessment_id}")
def get_assessment(assessment_id: str):

    try:

        cached = get_cached_data(assessment_id)

        # ===== DOWNLOAD + PARSE =====
        if not cached:

            file_id = get_file_id(assessment_id)

            print("📥 Downloading:", file_id)

            file_stream = download_excel(file_id)

            cached = parse_excel(file_stream)

            if not cached:
                raise Exception("No questions parsed")

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
        print("❌ ASSESSMENT ERROR:", e)
        raise HTTPException(500, str(e))


# ================= SUBMIT =================
@app.post("/submit/{assessment_id}")
def submit(assessment_id: str, data: Submission):

    try:

        questions = get_cached_data(assessment_id)

        if not questions:

            file_id = get_file_id(assessment_id)

            file_stream = download_excel(file_id)

            questions = parse_excel(file_stream)

            set_cache(assessment_id, questions)

        # ===== CHECK ATTEMPT =====
        existing = (
            supabase.table("student_attempts")
            .select("id")
            .eq("student_id", data.student_id)
            .eq("assessment_id", assessment_id)
            .execute()
        )

        if existing.data:
            raise HTTPException(400, "Already attempted")

        score = 0
        correct_answers = {}

        for q in questions:

            qid = str(q["id"])

            correct = (
                str(q.get("correct", ""))
                .strip()
                .upper()
            )

            user = (
                str(data.answers.get(qid, ""))
                .strip()
                .upper()
            )

            correct_answers[qid] = correct

            if user == correct:
                score += 1

        # ===== STUDENT SNAPSHOT =====
        stu = (
            supabase.table("students")
            .select("department, year, semester")
            .eq("id", data.student_id)
            .execute()
        )

        student = stu.data[0]

        ass = (
            supabase.table("assessments")
            .select("subject")
            .eq("id", assessment_id)
            .execute()
        )

        assessment = ass.data[0]

        # ===== SAVE ATTEMPT =====
        (
            supabase.table("student_attempts")
            .upsert(
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
            )
            .execute()
        )

        return {
            "score": score,
            "total": len(questions),
            "correctAnswers": correct_answers
        }

    except Exception as e:
        print("❌ SUBMIT ERROR:", e)
        raise HTTPException(500, "Submission failed")


# ================= ATTEMPT =================
@app.get("/attempt/{assessment_id}/{student_id}")
def get_attempt(assessment_id: str, student_id: str):

    try:

        res = (
            supabase.table("student_attempts")
            .select("*")
            .eq("assessment_id", assessment_id)
            .eq("student_id", student_id)
            .limit(1)
            .execute()
        )

        if not res.data:
            return None

        attempt = res.data[0]

        questions = get_cached_data(assessment_id)

        if not questions:

            file_id = get_file_id(assessment_id)

            file_stream = download_excel(file_id)

            questions = parse_excel(file_stream)

            set_cache(assessment_id, questions)

        correct_answers = {
            str(q["id"]): str(q["correct"]).upper()
            for q in questions
        }

        return {
            **attempt,
            "correctAnswers": correct_answers
        }

    except Exception as e:
        print("❌ ATTEMPT ERROR:", e)
        return None


# ================= ROOT =================
@app.get("/")
def root():
    return {
        "message": "LMS Backend Running 🚀"
    }