import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "cycle_literacy_unlocked";

async function webSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

async function webGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setCycleBadgeUnlocked(value: boolean) {
  const v = value ? "true" : "false";

  if (Platform.OS === "web") {
    await webSet(KEY, v);
    return;
  }

  await SecureStore.setItemAsync(KEY, v);
}

export async function getCycleBadgeUnlocked() {
  if (Platform.OS === "web") {
    const v = await webGet(KEY);
    return v === "true";
  }

  const v = await SecureStore.getItemAsync(KEY);
  return v === "true";
}