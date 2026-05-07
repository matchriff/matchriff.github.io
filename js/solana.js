import { SOLANA_CLUSTER, SOLANA_RPC_URL } from "./config.js";

const WALLET_KEY = "matchriff.github.io.walletAddress";

const textEncoder = new TextEncoder();

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const bytesToBase64 = (bytes) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }
  return value;
};

export class MatchriffSolana {
  constructor() {
    this.walletAddress = localStorage.getItem(WALLET_KEY) || "";
    this.connection = window.solanaWeb3
      ? new window.solanaWeb3.Connection(SOLANA_RPC_URL, "confirmed")
      : null;
  }

  get hasProvider() {
    return Boolean(window.solana && window.solana.isPhantom !== undefined);
  }

  get explorerBase() {
    return SOLANA_CLUSTER === "mainnet-beta"
      ? "https://explorer.solana.com"
      : `https://explorer.solana.com?cluster=${SOLANA_CLUSTER}`;
  }

  async connectWallet() {
    if (!window.solana) {
      throw new Error("No Solana wallet found. Install Phantom or another Wallet Standard compatible wallet.");
    }
    const response = await window.solana.connect();
    this.walletAddress = response.publicKey.toString();
    localStorage.setItem(WALLET_KEY, this.walletAddress);
    return this.walletAddress;
  }

  async disconnectWallet() {
    if (window.solana?.disconnect) {
      await window.solana.disconnect();
    }
    this.walletAddress = "";
    localStorage.removeItem(WALLET_KEY);
  }

  async signProofPayload(payload) {
    if (!window.solana?.signMessage) {
      throw new Error("This wallet does not support message signing.");
    }

    const canonical = JSON.stringify(canonicalize(payload));
    const bytes = textEncoder.encode(canonical);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const signed = await window.solana.signMessage(bytes, "utf8");

    return {
      cluster: SOLANA_CLUSTER,
      walletAddress: this.walletAddress,
      payloadHash: toHex(digest),
      signedMessage: canonical,
      signature: bytesToBase64(signed.signature)
    };
  }

  async createMemoTransaction(payload) {
    if (!this.connection || !window.solanaWeb3 || !window.solana?.publicKey) {
      throw new Error("Wallet connection is required before creating a Solana memo.");
    }

    const web3 = window.solanaWeb3;
    const memoProgram = new web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
    const payloadHash = await crypto.subtle.digest("SHA-256", textEncoder.encode(JSON.stringify(payload)));
    const memo = `Matchriff Proof of Jam ${toHex(payloadHash)}`;
    const tx = new web3.Transaction().add(
      new web3.TransactionInstruction({
        keys: [],
        programId: memoProgram,
        data: textEncoder.encode(memo)
      })
    );

    tx.feePayer = window.solana.publicKey;
    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const signed = await window.solana.signTransaction(tx);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    await this.connection.confirmTransaction(signature, "confirmed");
    return signature;
  }

  explorerTxUrl(signature) {
    if (!signature) return "";
    const suffix = SOLANA_CLUSTER === "mainnet-beta" ? "" : `?cluster=${SOLANA_CLUSTER}`;
    return `https://explorer.solana.com/tx/${signature}${suffix}`;
  }
}
