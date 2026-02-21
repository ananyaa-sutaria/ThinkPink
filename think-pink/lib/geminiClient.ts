import axios from "axios";
import { API_BASE } from "./config";

export type DailyInsight = {
  insight: string;
  foodTip: string;
  selfCareTip: string;
};

export async function fetchDailyInsight(payload: {
  date: string;
  phase: string;
  symptoms: string[];
  mood: number;
  energy: number;
  notes: string;
  dietaryPrefs?: string;
}): Promise<DailyInsight> {
  const res = await axios.post(`${API_BASE}/ai/daily-insight`, payload);
  return res.data;
}