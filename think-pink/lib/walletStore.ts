import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_WALLET = "tp_wallet_address";
const KEY = "solana_wallet_address";

async function webSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}
async function webGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}


export async function getWalletAddress() {
  return await AsyncStorage.getItem(KEY_WALLET);
}

export async function setWalletAddress(addr: string) {
  await AsyncStorage.setItem(KEY_WALLET, addr);
}