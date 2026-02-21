import { UserSnapshot } from "./chatClient";
import { getOrCreateUserId } from "./userId";
import { fetchRecentCycleLogs } from "./logClient";

export async function buildUserSnapshot(): Promise<UserSnapshot> {
  const userId = await getOrCreateUserId();
  const todayISO = new Date().toISOString().slice(0, 10);

  let recentLogs: UserSnapshot["recentLogs"] = [];
  try {
    const rec = await fetchRecentCycleLogs({ userId, limit: 60 });
    recentLogs = rec.logs;
  } catch {
    recentLogs = [];
  }

  return {
    userId,
    todayISO,
    recentLogs,
  };
}