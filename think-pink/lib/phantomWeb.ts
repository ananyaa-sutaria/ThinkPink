import { Transaction, type PublicKey } from "@solana/web3.js";

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
};

function getProvider(): PhantomProvider {
  const anyWindow = window as any;
  const provider = anyWindow?.solana as PhantomProvider | undefined;
  if (!provider || !provider.isPhantom) {
    throw new Error("Phantom extension not found. Install Phantom in this browser.");
  }
  return provider;
}

export async function connectPhantom(): Promise<string> {
  const provider = getProvider();
  const res = await provider.connect();
  return res.publicKey.toBase58();
}

export async function signAndSendWithPhantom(tx: Transaction): Promise<string> {
  const provider = getProvider();
  const { signature } = await provider.signAndSendTransaction(tx);
  return signature;
}