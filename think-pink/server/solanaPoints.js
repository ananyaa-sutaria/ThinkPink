import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import fs from "fs";

const CLUSTER = process.env.SOLANA_CLUSTER || "devnet";
const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl(CLUSTER);

// treasury authority (server wallet)
const serverKeypairPath = process.env.SERVER_WALLET_PATH || "./server-wallet.json";
const secret = Uint8Array.from(JSON.parse(fs.readFileSync(serverKeypairPath, "utf8")));
export const SERVER_KP = Keypair.fromSecretKey(secret);

export const connection = new Connection(RPC_URL, "confirmed");

// store this mint address in .env after you create it once
export const POINTS_MINT = process.env.POINTS_MINT ? new PublicKey(process.env.POINTS_MINT) : null;

export async function createPointsMintOnce() {
  // decimals 0 => 1 token == 1 point
  const mint = await createMint(
    connection,
    SERVER_KP,
    SERVER_KP.publicKey, // mint authority
    null,                // freeze authority optional
    0
  );
  return mint.toBase58();
}

export async function awardPointsToWallet(walletAddress, amount) {
  if (!POINTS_MINT) throw new Error("POINTS_MINT not set in server .env");
  const owner = new PublicKey(walletAddress);

  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    SERVER_KP,
    POINTS_MINT,
    owner
  );

  const sig = await mintTo(
    connection,
    SERVER_KP,
    POINTS_MINT,
    ata.address,
    SERVER_KP.publicKey,
    amount
  );

  return {
    signature: sig,
    pointsMint: POINTS_MINT.toBase58(),
    recipientAta: ata.address.toBase58(),
    explorer: `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`,
  };
}