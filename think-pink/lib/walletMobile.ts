import { Connection, Transaction } from "@solana/web3.js";
import {
  SolanaMobileWalletAdapter,
  type AddressSelector,
  type AuthorizationResultCache,
} from "@solana-mobile/wallet-adapter-mobile";

const authorizationResultCache: AuthorizationResultCache = {
  get: async () => undefined,
  set: async () => {},
  clear: async () => {},
};

const addressSelector: AddressSelector = (addresses) => {
  return addresses[0];
};

const wallet = new SolanaMobileWalletAdapter({
  cluster: "devnet",
  appIdentity: { name: "ThinkPink" },
  authorizationResultCache,
  addressSelector,
  onWalletNotFound: async () => {
    throw new Error("Phantom wallet not found on this device.");
  },
});

export async function connectMobileWallet(): Promise<string> {
  await wallet.connect();
  if (!wallet.publicKey) throw new Error("Wallet connection failed");
  return wallet.publicKey.toBase58();
}

export async function signAndSendMobile(params: {
  connection: Connection;
  tx: Transaction;
}): Promise<string> {
  const { connection, tx } = params;

  if (!wallet.connected) {
    await wallet.connect();
  }

  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  tx.feePayer = wallet.publicKey;

  const signed = await wallet.signTransaction(tx);

  const sig = await connection.sendRawTransaction(
    signed.serialize(),
    {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    }
  );

  await connection.confirmTransaction(sig, "confirmed");

  return sig;
}