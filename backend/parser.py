import pandas as pd

def clean(val):
    if pd.isna(val):
        return ""
    return str(val).strip()

def parse_excel(file_stream):
    df = pd.read_excel(file_stream)

    # 🔥 Normalize column names (important)
    df.columns = df.columns.str.strip()

    questions = []

    for i, row in df.iterrows():
        correct_raw = clean(row.get("Answer", "")).upper()

        # ✅ Ensure only A/B/C/D allowed
        if correct_raw not in ["A", "B", "C", "D"]:
            print(f"⚠️ Invalid answer at row {i+1}: {correct_raw}")
            correct_raw = ""

        questions.append({
            "id": str(i + 1),
            "question": clean(row.get("Question", "")),

            "option_a": clean(row.get("Option A", "")),
            "option_b": clean(row.get("Option B", "")),
            "option_c": clean(row.get("Option C", "")),
            "option_d": clean(row.get("Option D", "")),

            "correct": correct_raw
        })

    print("✅ PARSED QUESTIONS:")
    for q in questions:
        print(q)

    return questions