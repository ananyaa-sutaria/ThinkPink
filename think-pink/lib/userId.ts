import { getItem, setItem } from "./storage";
import AsyncStorage from "@react-native-async-storage/async-storage";


const KEY = "tp_user_id";

function makeId() {
  return "guest_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}


export async function getOrCreateUserId() {
  let id = await AsyncStorage.getItem("tp_user_id");
  if (!id) {
    id = "guest_" + Math.random().toString(36).slice(2);
    await AsyncStorage.setItem("tp_user_id", id);
  }
  return id;
}