import { PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createBurnInstruction } from "@solana/spl-token";

// set this to the mint you created with /solana/create-points-mint
export const POINTS_MINT_ADDRESS = "PASTE_POINTS_MINT_HERE";

export async function buildBurnPointsTx(params: {
  ownerBase58: string;
  amount: number;
  recentBlockhash: string;
}) {
  const owner = new PublicKey(params.ownerBase58);
  const mint = new PublicKey(POINTS_MINT_ADDRESS);

  const ata = await getAssociatedTokenAddress(mint, owner);

  const burnIx = createBurnInstruction(
    ata,   // token account
    mint,  // mint
    owner, // owner authority
    params.amount
  );

  const tx = new Transaction();
  tx.feePayer = owner;
  tx.recentBlockhash = params.recentBlockhash;
  tx.add(burnIx);

  return tx;
}