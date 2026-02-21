import { getItem, setItem } from "./storage";

const KEY = "tp_user_id";

function makeId() {
  return "guest_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function getOrCreateUserId(): Promise<string> {
  const existing = await getItem(KEY);
  if (existing) return existing;
  const id = makeId();
  await setItem(KEY, id);
  return id;
}