export type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";

export const phaseLabel: Record<Phase, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulation",
  luteal: "Luteal",
};

export const phaseColors: Record<Phase, { fill: string; accent: string }> = {
  menstrual: { fill: "#F8BBD0", accent: "#BA5D84" },
  follicular: { fill: "#FDECEF", accent: "#C2185B" },
  ovulation: { fill: "#F48FB1", accent: "#AD1457" },
  luteal: { fill: "#F3D3DC", accent: "#880E4F" },
};

export function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Simple demo phase engine: cycles every 28 days starting from a fixed anchor.
// Replace later with real logic using lastPeriodStart + cycle length.
export function phaseForDate(date: Date): { phase: Phase; cycleDay: number } {
  const anchor = new Date("2026-02-01T00:00:00");
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((date.getTime() - anchor.getTime()) / msPerDay);
  const cycleDay = ((diffDays % 28) + 28) % 28 + 1;

  if (cycleDay <= 5) return { phase: "menstrual", cycleDay };
  if (cycleDay <= 13) return { phase: "follicular", cycleDay };
  if (cycleDay <= 16) return { phase: "ovulation", cycleDay };
  return { phase: "luteal", cycleDay };
}