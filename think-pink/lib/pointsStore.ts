import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "user_points";

export async function getPoints(): Promise<number> {
  if (Platform.OS === "web") {
    const v = localStorage.getItem(KEY);
    return v ? Number(v) : 0;
  }
  const v = await SecureStore.getItemAsync(KEY);
  return v ? Number(v) : 0;
}

export async function setPoints(p: number) {
  if (Platform.OS === "web") {
    localStorage.setItem(KEY, String(p));
    return;
  }
  await SecureStore.setItemAsync(KEY, String(p));
}