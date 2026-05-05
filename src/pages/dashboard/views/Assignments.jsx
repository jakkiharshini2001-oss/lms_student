import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

const API = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");

const Assignments = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attemptLoading, setAttemptLoading] = useState(false);

  const [assignments, setAssignments] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(null);

  // ================= GET USER =================
  useEffect(() => {
    const loadUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (studentData) {
        setStudent(studentData);
      }
    };

    loadUser();
  }, []);

  // ================= LOAD ASSIGNMENTS =================
  useEffect(() => {
    if (!student?.id) return;

    const loadAssignments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/assignments/${student.id}`);
        const data = await res.json();

        setAssignments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, [student?.id]);

  // ================= LOAD QUIZ =================
  useEffect(() => {
    if (!id || !student?.id) return;

    const loadData = async () => {
      setAttemptLoading(true);

      try {
        const key = `attempt_${student.id}_${id}`;

        // ✅ USER-SPECIFIC CACHE
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);

          setAttempt(parsed);
          setAnswers(parsed.answers_json || {});
          setResult({
            score: parsed.score,
            total: parsed.total,
            correctAnswers: parsed.correct_answers || {},
          });

          setAttemptLoading(false);
          return;
        }

        // API CALLS
        const [qRes, aRes] = await Promise.all([
          fetch(`${API}/assessment/${id}`),
          fetch(`${API}/attempt/${id}/${student.id}`),
        ]);

        const qData = await qRes.json();
        const aData = await aRes.json();

        // ✅ CLEAN QUESTIONS
        if (Array.isArray(qData)) {
          const cleaned = qData
            .filter((q) => q && q.id && q.question)
            .map((q, index) => ({
              ...q,
              id: String(q.id),
              order: index + 1,
            }));

          setQuestions(cleaned);
        } else {
          setQuestions([]);
        }

        // EXISTING ATTEMPT
        if (aData && Object.keys(aData).length > 0) {
          setAttempt(aData);
          setAnswers(aData.answers_json || {});
          setResult({
            score: aData.score,
            total: aData.total,
            correctAnswers: aData.correct_answers || {},
          });

          localStorage.setItem(key, JSON.stringify(aData));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setAttemptLoading(false);
      }
    };

    loadData();
  }, [id, student?.id]);

  // ================= SELECT =================
  const handleSelect = (qid, option) => {
    if (attempt) return;

    setAnswers((prev) => ({
      ...prev,
      [qid]: option,
    }));
  };

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    if (!student) return;

    try {
      const res = await fetch(`${API}/submit/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          answers,
        }),
      });

      const data = await res.json();

      const newAttempt = {
        answers_json: answers,
        score: data.score,
        total: data.total,
        correct_answers: data.correctAnswers,
      };

      setAttempt(newAttempt);
      setResult({
        score: data.score,
        total: data.total,
        correctAnswers: data.correctAnswers,
      });

      localStorage.setItem(
        `attempt_${student.id}_${id}`,
        JSON.stringify(newAttempt)
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ================= UI =================
  if (loading) return <h2 style={{ padding: 20 }}>Loading assignments...</h2>;

  // ================= LIST =================
  if (!id) {
    if (assignments.length === 0)
      return <h3 style={{ padding: 20 }}>No assignments found</h3>;

    return (
      <div style={{ padding: 20 }}>
        <h2>Assignments</h2>

        {assignments.map((a) => {
          const cached = localStorage.getItem(
            `attempt_${student?.id}_${a.id}`
          );
          const parsed = cached ? JSON.parse(cached) : null;

          return (
            <div
              key={a.id}
              onClick={() => navigate(`/dashboard/assignments/${a.id}`)}
              style={{
                border: "1px solid #ddd",
                padding: 16,
                marginBottom: 12,
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <h3>{a.title}</h3>
              <p>{a.subject}</p>

              {parsed ? (
                <>
                  <span style={{ color: "green" }}>✅ Completed</span>
                  <p>
                    Score: {parsed.score} / {parsed.total}
                  </p>
                </>
              ) : (
                <span>Not Attempted</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ================= QUIZ =================
  if (attemptLoading)
    return <h2 style={{ padding: 20 }}>Loading quiz...</h2>;

  if (!questions.length && !attempt)
    return <h2 style={{ padding: 20 }}>No questions available</h2>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Quiz</h2>

      {questions.map((q) => {
        const userAns = answers[q.id];
        const correct = result?.correctAnswers?.[q.id];

        return (
          <div key={q.id} style={{ marginBottom: 15 }}>
            <h4>
              {q.order}. {q.question}
            </h4>

            {["A", "B", "C", "D"].map((opt) => {
              const value =
                q[`option_${opt.toLowerCase()}`] || "N/A";

              let bg = "#f5f5f5";

              if (attempt) {
                if (correct === opt) bg = "#c8f7c5";
                else if (userAns === opt) bg = "#ffcccc";
              } else if (userAns === opt) {
                bg = "#d0ebff";
              }

              return (
                <div
                  key={opt}
                  onClick={() => handleSelect(q.id, opt)}
                  style={{
                    padding: 10,
                    marginTop: 8,
                    background: bg,
                    cursor: attempt ? "not-allowed" : "pointer",
                  }}
                >
                  {opt}. {value}
                </div>
              );
            })}
          </div>
        );
      })}

      {!attempt && <button onClick={handleSubmit}>Submit</button>}

      {result && (
        <h3>
          Score: {result.score} / {result.total}
        </h3>
      )}
    </div>
  );
};

export default Assignments;