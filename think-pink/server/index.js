// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Connection, PublicKey, Keypair, clusterApiUrl } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import CycleLog from "./models/CycleLog.js";
import BadgeMint from "./models/BadgeMint.js";
import { createPointsMintOnce, awardPointsToWallet } from "./solanaPoints.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => res.send("OK"));
app.get("/health", (req, res) => res.json({ ok: true }));

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

app.post("/ai/cycle-chat", async (req, res) => {
  try {
    const { message, snapshot } = req.body || {};
    if (!message) return res.status(400).json({ error: "message is required" });

    const userId = snapshot?.userId || "guest";

    // Pull recent logs from Mongo
    const recentLogs = await CycleLog.find({ userId })
  .sort({ dateISO: -1 })
  .limit(60)
  .lean();

console.log("CYCLE-CHAT userId:", userId);
console.log("CYCLE-CHAT recentLogs count:", recentLogs.length);
console.log("CYCLE-CHAT most recent log:", recentLogs[0]);

const lastStart = recentLogs.find(
  (l) => l.periodStart === true || l.periodStart === "true"
);const lastPeriodStartISO = lastStart?.dateISO;

const enrichedSnapshot = {
  ...(snapshot || {}),
  recentLogs,
  lastPeriodStartISO,
};

    // Hard-answer last period if asked (fast + reliable)
    const lower = String(message).toLowerCase();
    if (lower.includes("last period") || lower.includes("last cycle")) {
      if (enrichedSnapshot.lastPeriodStartISO) {
        return res.json({
          answer: `Your most recent logged period start was ${enrichedSnapshot.lastPeriodStartISO}.`,
        });
      }
      return res.json({
        answer:
          "I don’t have a logged period start date yet. Tap a day and mark it as Period Start so I can track this for you.",
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

    const prompt = `
You are ThinkPink, a supportive cycle + nutrition assistant.
Use ONLY the snapshot data as truth. If it’s not in the snapshot, say you don’t have enough data yet.
No diagnosis. Keep answers 2–5 sentences, no bold.

Interpretation rules:
- "day N of my cycle": use recentLogs where cycleDay == N. If <2 matches, say not enough data.
- "how do I usually feel in luteal/follicular/ovulation/menstrual": filter recentLogs by phase and summarize typical mood/energy/symptoms.
- "what should I eat today": use todayPhase if present; otherwise give a general balanced suggestion.
- "when was my last period": use lastPeriodStartISO.

SNAPSHOT JSON:
${JSON.stringify(enrichedSnapshot, null, 2)}

USER QUESTION:
${message}
`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();
   
    res.json({ answer });
  } catch (e) {
    console.error("CYCLE CHAT ERROR:", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});
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
// ----- Cycle logs (Mongo) -----

app.post("/logs/save", async (req, res) => {
  try {
    const log = req.body;

    if (!log?.userId || !log?.dateISO) {
      return res.status(400).json({ error: "userId and dateISO are required" });
    }

    const saved = await CycleLog.findOneAndUpdate(
      { userId: log.userId, dateISO: log.dateISO },
      { $set: log },
      { new: true, upsert: true }
    ).lean();

    res.json({ ok: true, log: saved });
  } catch (e) {
    console.error("LOG SAVE ERROR:", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get("/logs/recent", async (req, res) => {
  try {
    const userId = String(req.query.userId || "");
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const limit = Math.min(Number(req.query.limit || 60), 120);

    const logs = await CycleLog.find({ userId })
      .sort({ dateISO: -1 })
      .limit(limit)
      .lean();

    res.json({ ok: true, logs });
  } catch (e) {
    console.error("LOG RECENT ERROR:", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});
// --------------------
// Start
// --------------------
connectMongo().then(() => {
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
});
