import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "solana_wallet_address";

async function webSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}
async function webGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export async function setWalletAddress(addr: string) {
  if (Platform.OS === "web") return webSet(KEY, addr);
  return SecureStore.setItemAsync(KEY, addr);
}

export async function getWalletAddress() {
  if (Platform.OS === "web") return webGet(KEY);
  return SecureStore.getItemAsync(KEY);
}