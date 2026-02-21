import axios from "axios";
import { API_BASE } from "./config";

export async function awardBadge(walletAddress: string) {
  const res = await axios.post(`${API_BASE}/solana/award-badge`, { walletAddress });
  return res.data as {
    signature: string;
    explorer: string;
    badgeMint: string;
    recipientAta: string;
  };
}