import { Phase, phaseForDate, ymd } from "./phases";

export type DayLog = {
  date: string; // YYYY-MM-DD
  periodStart?: boolean;
  periodEnd?: boolean;
  spotting?: boolean;
  symptoms: string[];
  mood: number; // 1-5
  energy: number; // 1-5
  notes: string;
};

export const symptomOptions = [
  "cramps",
  "bloating",
  "headache",
  "acne",
  "fatigue",
  "mood swings",
  "nausea",
  "sleep issues",
];

export function getTodayMock() {
  const today = new Date();
  const { phase, cycleDay } = phaseForDate(today);
  const insightByPhase: Record<Phase, string> = {
    menstrual: "Go gentle today. Warm foods and hydration can feel great.",
    follicular: "Energy tends to rise. Great time for planning and lighter meals.",
    ovulation: "Peak energy window. Prioritize protein + hydration.",
    luteal: "Cravings and bloating can show up. Try magnesium + warm meals.",
  };
  return {
    date: ymd(today),
    phase,
    cycleDay,
    insight: insightByPhase[phase],
  };
}

// In-memory store for now (swap with Mongo later)
const store = new Map<string, DayLog>();

export function getLog(date: string): DayLog {
  return (
    store.get(date) || {
      date,
      symptoms: [],
      mood: 3,
      energy: 3,
      notes: "",
    }
  );
}

export function saveLog(log: DayLog) {
  store.set(log.date, log);
}

export function allLogs() {
  return Array.from(store.values());
}