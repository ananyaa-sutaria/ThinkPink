import { UserSnapshot } from "./chatClient";
import { getOrCreateUserId } from "./userId";
import { fetchRecentLogs } from "./logClient";

export async function buildUserSnapshot(): Promise<UserSnapshot> {
  const userId = await getOrCreateUserId();
  const todayISO = new Date().toISOString().slice(0, 10);

  let recentLogs: any[] = [];
  try {
    recentLogs = await fetchRecentLogs(userId, 60);
  } catch {
    recentLogs = [];
  }

  return {
    userId,
    todayISO,
    recentLogs,
  };
}