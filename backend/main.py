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
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        # Your deployed frontend
        "https://lms-student-mm45cd8u8-jakkiharshini2001-7309s-projects.vercel.app",
    ],
    # Allow all Vercel preview deployments
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
        raise HTTPException(status_code=404, detail="Assessment not found")

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
        raise HTTPException(status_code=404, detail="Student not found")

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
            print("❌ Student not found")
            return []

        student = stu.data[0]

        student_department = str(
            student.get("department", "")
        ).strip().lower()

        student_year = int(student.get("year", 0))

        student_semester = student.get("semester")
        if student_semester is not None:
            student_semester = int(student_semester)

        print("🎓 STUDENT:")
        print(
            student_department,
            student_year,
            student_semester
        )

        # ===== GET ALL ASSESSMENTS =====
        ass_res = (
            supabase.table("assessments")
            .select("*")
            .execute()
        )

        all_assignments = ass_res.data or []

        print(f"📚 TOTAL ASSESSMENTS: {len(all_assignments)}")

        filtered = []

        for assignment in all_assignments:
            ass_department = str(
                assignment.get("department", "")
            ).strip().lower()

            ass_year = assignment.get("year")
            ass_semester = assignment.get("semester")

            ass_year = int(ass_year) if ass_year is not None else None
            ass_semester = (
                int(ass_semester)
                if ass_semester is not None
                else None
            )

            # Department must match
            department_match = ass_department == student_department

            # Year must match
            year_match = ass_year == student_year

            # Semester handling
            if student_year == 1:
                # First-year students can see all semesters
                semester_match = True
            else:
                semester_match = (
                    ass_semester is None
                    or student_semester is None
                    or ass_semester == student_semester
                )

            if department_match and year_match and semester_match:
                filtered.append(assignment)

        print(f"✅ FILTERED ASSIGNMENTS: {len(filtered)}")

        # ===== GET ATTEMPTS =====
        att_res = (
            supabase.table("student_attempts")
            .select("assessment_id, score, total")
            .eq("student_id", student_id)
            .execute()
        )

        attempts = {
            item["assessment_id"]: item
            for item in (att_res.data or [])
        }

        # ===== MERGE SCORES =====
        for assignment in filtered:
            attempt = attempts.get(assignment["id"])

            if attempt:
                assignment["score"] = (
                    f"{attempt['score']}/{attempt['total']}"
                )
                assignment["attempt"] = attempt
            else:
                assignment["score"] = None
                assignment["attempt"] = None

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

        for q in cached:
            safe.append(
                {
                    "id": str(q.get("id")),
                    "question": q.get("question", ""),
                    "option_a": q.get("option_a", ""),
                    "option_b": q.get("option_b", ""),
                    "option_c": q.get("option_c", ""),
                    "option_d": q.get("option_d", ""),
                }
            )

        return safe

    except Exception as e:
        print("❌ ASSESSMENT ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


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
            raise HTTPException(
                status_code=400,
                detail="Already attempted"
            )

        score = 0
        correct_answers = {}

        for q in questions:
            qid = str(q["id"])

            correct = str(
                q.get("correct", "")
            ).strip().upper()

            user = str(
                data.answers.get(qid, "")
            ).strip().upper()

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

        if not stu.data:
            raise HTTPException(
                status_code=404,
                detail="Student not found"
            )

        student = stu.data[0]

        # ===== ASSESSMENT SNAPSHOT =====
        ass = (
            supabase.table("assessments")
            .select("subject")
            .eq("id", assessment_id)
            .execute()
        )

        if not ass.data:
            raise HTTPException(
                status_code=404,
                detail="Assessment not found"
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
                    "total": len(questions),
                },
                on_conflict="student_id,assessment_id",
            )
            .execute()
        )

        return {
            "score": score,
            "total": len(questions),
            "correctAnswers": correct_answers,
        }

    except HTTPException:
        raise

    except Exception as e:
        print("❌ SUBMIT ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail="Submission failed"
        )


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
            str(q["id"]): str(q["correct"]).strip().upper()
            for q in questions
        }

        return {
            **attempt,
            "correctAnswers": correct_answers,
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