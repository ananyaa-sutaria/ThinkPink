// lib/progressStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_CYCLE_UNLOCKED = "tp_cycle_badge_unlocked";
const KEY_CYCLE_MINTED = "tp_cycle_badge_minted";

const KEY_IMPACT_UNLOCKED = "tp_impact_badge_unlocked";
const KEY_IMPACT_MINTED = "tp_impact_badge_minted";

const KEY_POINTS = "tp_points";

async function getBool(key: string) {
  const v = await AsyncStorage.getItem(key);
  return v === "true";
}
async function setBool(key: string, v: boolean) {
  await AsyncStorage.setItem(key, v ? "true" : "false");
}
async function getInt(key: string) {
  const v = await AsyncStorage.getItem(key);
  const n = Number(v || 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
async function setInt(key: string, n: number) {
  const fixed = Math.max(0, Math.floor(n));
  await AsyncStorage.setItem(key, String(fixed));
}

export async function getCycleBadgeUnlocked() {
  return getBool(KEY_CYCLE_UNLOCKED);
}
export async function setCycleBadgeUnlocked(v: boolean) {
  return setBool(KEY_CYCLE_UNLOCKED, v);
}
export async function getCycleBadgeMinted() {
  return getBool(KEY_CYCLE_MINTED);
}
export async function setCycleBadgeMinted(v: boolean) {
  return setBool(KEY_CYCLE_MINTED, v);
}

export async function getImpactBadgeUnlocked() {
  return getBool(KEY_IMPACT_UNLOCKED);
}
export async function setImpactBadgeUnlocked(v: boolean) {
  return setBool(KEY_IMPACT_UNLOCKED, v);
}
export async function getImpactBadgeMinted() {
  return getBool(KEY_IMPACT_MINTED);
}
export async function setImpactBadgeMinted(v: boolean) {
  return setBool(KEY_IMPACT_MINTED, v);
}

export async function getPoints() {
  return getInt(KEY_POINTS);
}
export async function setPoints(n: number) {
  return setInt(KEY_POINTS, n);
}