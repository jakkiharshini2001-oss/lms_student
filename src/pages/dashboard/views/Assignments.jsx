import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

const API = import.meta.env.VITE_API_BASE_URL;

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

  // ---------------- GET USER ----------------
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setStudent(data.user);
      }
    };
    loadUser();
  }, []);

  // ---------------- LOAD ASSIGNMENTS ----------------
  useEffect(() => {
    if (!student?.id) return;

    const loadAssignments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/assignments/${student.id}`);
        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();
        setAssignments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Assignments error:", err);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, [student?.id]);

  // ---------------- LOAD QUESTIONS + ATTEMPT ----------------
  useEffect(() => {
    if (!id || !student?.id) return;

    const loadData = async () => {
      setAttemptLoading(true);

      try {
        // ✅ CHECK CACHE FIRST
        const cached = localStorage.getItem(`attempt_${id}`);
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

        // ✅ FETCH BOTH
        const [qRes, aRes] = await Promise.all([
          fetch(`${API}/assessment/${id}`),
          fetch(`${API}/attempt/${id}/${student.id}`),
        ]);

        const qData = await qRes.json();
        const aData = await aRes.json();

        setQuestions(Array.isArray(qData) ? qData : []);

        if (aData && Object.keys(aData).length > 0) {
          setAttempt(aData);
          setAnswers(aData.answers_json || {});
          setResult({
            score: aData.score,
            total: aData.total,
            correctAnswers: aData.correct_answers || {},
          });

          localStorage.setItem(`attempt_${id}`, JSON.stringify(aData));
        }
      } catch (err) {
        console.error("LOAD ERROR:", err);
      } finally {
        setAttemptLoading(false);
      }
    };

    loadData();
  }, [id, student?.id]);

  // ---------------- SELECT ----------------
  const handleSelect = (qid, option) => {
    if (attempt) return;

    setAnswers((prev) => ({
      ...prev,
      [qid]: option,
    }));
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = async () => {
    if (!student) return;

    try {
      const res = await fetch(`${API}/submit/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          answers: answers,
        }),
      });

      if (!res.ok) {
        alert("Submission failed");
        return;
      }

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

      localStorage.setItem(`attempt_${id}`, JSON.stringify(newAttempt));
    } catch (err) {
      console.error("Submit error:", err);
    }
  };

  // ---------------- PROGRESS ----------------
  const progress =
    questions.length > 0
      ? Math.round((Object.keys(answers).length / questions.length) * 100)
      : 0;

  // ---------------- LOADING ----------------
  if (loading) {
    return <h2 style={{ padding: 20 }}>Loading assignments...</h2>;
  }

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return <h3 style={{ padding: 20 }}>No assignments found</h3>;
  }

  // ---------------- LIST ----------------
  if (!id) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Assignments</h2>

        {assignments.map((a) => {
          const cached = localStorage.getItem(`attempt_${a.id}`);
          const parsed = cached ? JSON.parse(cached) : null;

          return (
            <div
              key={a.id}
              style={{
                border: "1px solid #ddd",
                padding: 16,
                marginBottom: 12,
                borderRadius: 10,
                cursor: "pointer",
                background: "#fff",
                transition: "0.2s",
              }}
              onClick={() => navigate(`/dashboard/assignments/${a.id}`)}
            >
              <h3>{a.title}</h3>
              <p>{a.subject}</p>

              {parsed ? (
                <div>
                  <span style={{ color: "green" }}>✅ Completed</span>
                  <p>
                    Score: {parsed.score} / {parsed.total}
                  </p>
                </div>
              ) : (
                <span>Not Attempted</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ---------------- ATTEMPT LOADING ----------------
  if (attemptLoading) {
    return <h2 style={{ padding: 20 }}>Loading quiz...</h2>;
  }

  // ---------------- EMPTY ----------------
 if (!attemptLoading && questions.length === 0 && !attempt) {
  return <h2 style={{ padding: 20 }}>No questions available</h2>;
}

  // ---------------- QUIZ ----------------
  return (
    <div
      style={{
        padding: 20,
        animation: "fadeIn 0.3s ease",
      }}
    >
      <h2>Quiz</h2>

      {/* PROGRESS */}
      <div style={{ height: 10, background: "#eee", marginBottom: 20 }}>
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "#4CAF50",
          }}
        />
      </div>

      {questions.map((q, index) => {
        const userAns = answers[q.id];
        const correct = result?.correctAnswers?.[q.id];

        return (
          <div key={q.id} style={{ marginBottom: 15 }}>
            <h4>
              {index + 1}. {q.question}
            </h4>

            {["A", "B", "C", "D"].map((opt) => {
              const value = q[`option_${opt.toLowerCase()}`];

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

            {attempt && <p>Correct: {correct}</p>}
          </div>
        );
      })}

      {!attempt && (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length === 0}
        >
          Submit
        </button>
      )}

      {result && (
        <h3>
          Score: {result.score} / {result.total}
        </h3>
      )}
    </div>
  );
};

export default Assignments;