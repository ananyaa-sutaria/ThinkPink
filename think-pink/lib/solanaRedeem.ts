import { PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createBurnInstruction } from "@solana/spl-token";

// IMPORTANT: you must set this to your points mint (same as server POINTS_MINT)
export const POINTS_MINT_ADDRESS = "PASTE_POINTS_MINT_HERE";

export async function buildBurnPointsTx(params: {
  ownerPubkey: string; // user's wallet public key
  amount: number;      // points to burn
  recentBlockhash: string;
  feePayer: string;    // usually owner
}) {
  const mint = new PublicKey(POINTS_MINT_ADDRESS);
  const owner = new PublicKey(params.ownerPubkey);

  const ata = await getAssociatedTokenAddress(mint, owner);

  const ix = createBurnInstruction(
    ata,    // token account
    mint,   // mint
    owner,  // owner authority
    params.amount
  );

  const tx = new Transaction();
  tx.feePayer = new PublicKey(params.feePayer);
  tx.recentBlockhash = params.recentBlockhash;
  tx.add(ix);

  return tx;
}