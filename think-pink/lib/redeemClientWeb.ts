import { Connection, Transaction, clusterApiUrl } from "@solana/web3.js";
import { connectPhantom, signAndSendWithPhantom } from "./phantomWeb";

const API_BASE = "http://localhost:5000";
const CLUSTER = "devnet";
const connection = new Connection(clusterApiUrl(CLUSTER), "confirmed");

export async function redeemPointsWeb(amount: number) {
  const walletAddress = await connectPhantom();

  // ask server to build burn tx (no spl-token in browser)
  const resp = await fetch(`${API_BASE}/solana/build-burn-tx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, amount }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || "Failed to build burn tx");

function b64ToUint8Array(b64: string) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
const tx = Transaction.from(b64ToUint8Array(data.txBase64));
  // Phantom signs + sends
  const signature = await signAndSendWithPhantom(tx);

  await connection.confirmTransaction(signature, "confirmed");

  return {
    walletAddress,
    signature,
    explorer: `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`,
  };
}