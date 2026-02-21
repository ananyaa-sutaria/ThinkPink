import axios from "axios";
import { API_BASE } from "./config";

export type QuizChoice = "A" | "B" | "C" | "D";

export type QuizQuestion = {
  id: string;
  question: string;
  choices: Record<QuizChoice, string>;
  answer: QuizChoice;
  explanation: string;
};

export type QuizPayload = {
  topic: string;
  level: string;
  questions: QuizQuestion[];
};

export async function fetchQuiz(params: {
  topic: string;
  level?: string;
  numQuestions?: number;
}): Promise<QuizPayload> {
  const res = await axios.post(`${API_BASE}/ai/quiz`, {
    topic: params.topic,
    level: params.level ?? "beginner",
    numQuestions: params.numQuestions ?? 5,
  });
  return res.data;
}