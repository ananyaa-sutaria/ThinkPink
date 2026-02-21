import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Connection, PublicKey, Keypair, clusterApiUrl } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

import BadgeMint from "./models/BadgeMint.js";
import { createPointsMintOnce, awardPointsToWallet } from "./solanaPoints.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// Config & Constants
// --------------------
const PORT = process.env.PORT || 5000;
const CLUSTER = process.env.SOLANA_CLUSTER || "devnet";
const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl(CLUSTER);
const connection = new Connection(RPC_URL, "confirmed");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --------------------
// Mongo Setup
// --------------------
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  wallet: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) return console.warn("MONGO_URI not set.");
  await mongoose.connect(uri);
  console.log("✅ MongoDB Connected");
}

// --------------------
// Solana Helpers
// --------------------
function loadServerKeypair() {
  const kpPath = process.env.SOLANA_KEYPAIR_PATH || "./server-wallet.json";
  const abs = path.resolve(process.cwd(), kpPath);
  const secret = JSON.parse(fs.readFileSync(abs, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}
const serverWallet = loadServerKeypair();

async function awardBadgeToWallet(walletAddress) {
  const mintStr = process.env.BADGE_MINT;
  if (!mintStr) throw new Error("BADGE_MINT not set");
  const mint = new PublicKey(mintStr);
  const owner = new PublicKey(walletAddress);
  const ata = await getOrCreateAssociatedTokenAccount(connection, serverWallet, mint, owner);
  const signature = await mintTo(connection, serverWallet, mint, ata.address, serverWallet, 1);
  return { signature, explorer: `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}` };
}

// --------------------
// Auth Routes
// --------------------
app.post("/api/users/signup", async (req, res) => {
  try {
    const { username, password, wallet } = req.body;
    const existing = await User.findOne({ name: username });
    if (existing) return res.status(400).json({ error: "Username exists" });

    const userId = `${username.toLowerCase().replace(/\s/g, "_")}_${Math.floor(100 + Math.random() * 900)}`;
    const newUser = new User({ userId, name: username, password, wallet: wallet || "" });
    await newUser.save();
    res.json(newUser);
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/users/signin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ name: username, password });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Signin failed" });
  }
});

// --------------------
// Solana Routes
// --------------------
app.post("/solana/award-points", async (req, res) => {
  try {
    const { walletAddress, amount } = req.body;
    const r = await awardPointsToWallet(walletAddress, Number(amount || 0));
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/solana/award-badge", async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const result = await awardBadgeToWallet(walletAddress);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --------------------
// AI Routes
// --------------------
app.post("/ai/quiz", async (req, res) => {
  try {
    const { topic = "Cycle Phases", level = "beginner", numQuestions = 5 } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Return ONLY valid JSON with this schema: {"questions": [{"question": string, "choices": {"A": string, "B": string, "C": string, "D": string}, "answer": "A", "explanation": string}]}. Topic: ${topic}, Level: ${level}, Count: ${numQuestions}`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}/);
    res.json(JSON.parse(match[0]));
  } catch (err) {
    res.status(500).json({ error: "AI Quiz failed" });
  }
});

app.post("/ai/daily-insight", async (req, res) => {
  try {
    const { phase, symptoms, mood, energy } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Provide supportive advice for Phase: ${phase}, Symptoms: ${symptoms}, Mood: ${mood}, Energy: ${energy}. Return JSON: {insight: string, foodTip: string, selfCareTip: string}.`;
    
    const result = await model.generateContent(prompt);
    const match = result.response.text().match(/\{[\s\S]*\}/);
    res.json(JSON.parse(match[0]));
  } catch (err) {
    res.status(500).json({ error: "AI Insight failed" });
  }
});

// --------------------
// Start
// --------------------
connectMongo().then(() => {
  app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on ${PORT}`));
});