import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get("/", (req, res) => res.send("OK"));
app.post("/ai/quiz", async (req, res) => {
  try {
    const { topic = "Cycle Phases 101", level = "beginner", numQuestions = 5 } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

    const prompt = `
You are an educational quiz writer for menstrual health literacy.
Avoid medical diagnosis. Keep content factual, supportive, and appropriate for ${level} level.

Topic: ${topic}
Number of questions: ${numQuestions}

Return ONLY valid JSON with this exact schema:
{
  "topic": string,
  "level": string,
  "questions": [
    {
      "id": string,
      "question": string,
      "choices": { "A": string, "B": string, "C": string, "D": string },
      "answer": "A" | "B" | "C" | "D",
      "explanation": string
    }
  ]
}

Rules:
- Exactly ${numQuestions} questions
- Each question must have 4 choices A-D
- Answers should be unambiguous
- Explanations must be 1 sentence
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(500).json({ error: "Quiz JSON not returned" });
    }

    const quiz = JSON.parse(match[0]);

    // Minimal validation (hackathon-safe)
    if (!quiz?.questions?.length) {
      return res.status(500).json({ error: "Invalid quiz format" });
    }

    res.json(quiz);
  } catch (err) {
    console.error("QUIZ ERROR:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post("/ai/daily-insight", async (req, res) => {
  try {
    const { date, phase, symptoms = [], mood, energy, notes = "", dietaryPrefs = "" } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

    const prompt = `
You are a supportive cycle + nutrition assistant. Do not diagnose or provide medical instructions.
Keep answers short and practical.

User context:
- Date: ${date}
- Cycle phase: ${phase}
- Symptoms: ${symptoms.length ? symptoms.join(", ") : "none"}
- Mood (1-5): ${mood}
- Energy (1-5): ${energy}
- Notes: ${notes || "none"}
- Dietary preferences: ${dietaryPrefs || "none"}

Return ONLY valid JSON with exactly these keys:
insight (string, 1-2 sentences),
foodTip (string, 1 sentence),
selfCareTip (string, 1 sentence).
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON if the model wraps it
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.json({
        insight: text.trim().slice(0, 220),
        foodTip: "Try a warm, balanced meal with protein + complex carbs.",
        selfCareTip: "Hydrate and do light stretching.",
      });
    }

    const data = JSON.parse(match[0]);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini request failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));