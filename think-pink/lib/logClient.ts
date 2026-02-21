const API_BASE = "http://localhost:5000";


export async function saveLog(log: any) {
  const res = await fetch(`${API_BASE}/logs/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "saveLog failed");
  return data;
}

export async function fetchRecentLogs(userId: string, limit = 60) {
  const res = await fetch(`${API_BASE}/logs/recent?userId=${encodeURIComponent(userId)}&limit=${limit}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "fetchRecentLogs failed");
  return data.logs as any[];
}