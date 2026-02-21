// lib/solanaClient.ts
import { API_BASE } from "./api";

export async function awardBadge(walletAddress: string) {
  const res = await fetch(`${API_BASE}/solana/award-badge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 180)}`);
  }

  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data; // { signature, explorer, badgeMint, recipientAta } or 409 error
}