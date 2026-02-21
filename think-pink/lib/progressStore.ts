// lib/progressStore.ts
import { getItem, setItem } from "./storage";

const KEY_BADGE_UNLOCKED = "tp_badge_cycle_lit_unlocked";
const KEY_BADGE_MINTED = "tp_badge_cycle_lit_minted";
const KEY_POINTS = "tp_points_balance";

export async function getCycleBadgeUnlocked(): Promise<boolean> {
  const v = await getItem(KEY_BADGE_UNLOCKED);
  return v === "true";
}

export async function setCycleBadgeUnlocked(v: boolean): Promise<void> {
  await setItem(KEY_BADGE_UNLOCKED, String(v));
}

export async function getCycleBadgeMinted(): Promise<boolean> {
  const v = await getItem(KEY_BADGE_MINTED);
  return v === "true";
}

export async function setCycleBadgeMinted(v: boolean): Promise<void> {
  await setItem(KEY_BADGE_MINTED, String(v));
}

export async function getPoints(): Promise<number> {
  const v = await getItem(KEY_POINTS);
  const n = Number(v || "0");
  return Number.isFinite(n) ? n : 0;
}

export async function setPoints(n: number): Promise<void> {
  await setItem(KEY_POINTS, String(Math.max(0, Math.floor(n))));
}