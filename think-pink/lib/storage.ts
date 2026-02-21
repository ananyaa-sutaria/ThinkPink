// lib/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
    return;
  }
  try {
    await AsyncStorage.setItem(key, value);
  } catch {}
}

export async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      window.localStorage.removeItem(key);
    } catch {}
    return;
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}
