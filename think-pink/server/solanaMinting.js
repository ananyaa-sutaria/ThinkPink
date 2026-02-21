// server/solanaMinting.js
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  freezeAccount,
  createMint,
} from "@solana/spl-token";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export async function ensureMint(connection, payerKeypair, mintStrEnv, decimals = 0) {
  // If env var exists, use it. Otherwise create a mint and return it.
  if (mintStrEnv) return new PublicKey(mintStrEnv);

  const mint = await createMint(
    connection,
    payerKeypair,             // payer
    payerKeypair.publicKey,   // mint authority
    payerKeypair.publicKey,   // freeze authority (important for "soulbound")
    decimals
  );
  return mint;
}

export async function mintSoulboundToken({
  connection,
  payerKeypair,
  mint,
  recipientWallet,
  amount = 1,
  cluster = "devnet",
  memoText = null, // optional on-chain proof anchor
}) {
  const owner = new PublicKey(recipientWallet);

  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payerKeypair, // payer
    mint,
    owner
  );

  const instructions = [];

  // optional memo: anchors a proof hash or submission id on-chain (privacy safe)
  if (memoText) {
    instructions.push(
      new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(String(memoText), "utf-8"),
      })
    );
  }

  // mint
  const mintSig = await mintTo(
    connection,
    payerKeypair,
    mint,
    ata.address,
    payerKeypair, // mint authority
    amount
  );

  // freeze the recipient token account => effectively non-transferable (“soulbound”)
  // Transfers require the account not frozen.
  const freezeSig = await freezeAccount(
    connection,
    payerKeypair,
    ata.address,
    mint,
    payerKeypair // freeze authority
  );

  return {
    mint: mint.toBase58(),
    recipientAta: ata.address.toBase58(),
    mintSig,
    freezeSig,
    explorerMint: `https://explorer.solana.com/tx/${mintSig}?cluster=${cluster}`,
    explorerFreeze: `https://explorer.solana.com/tx/${freezeSig}?cluster=${cluster}`,
  };
}