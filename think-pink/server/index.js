// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { Connection, PublicKey, Keypair, clusterApiUrl } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

import BadgeMint from "./models/BadgeMint.js";
import { createPointsMintOnce, awardPointsToWallet } from "./solanaPoints.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// Config
// --------------------
const PORT = process.env.PORT || 5000;

const CLUSTER = process.env.SOLANA_CLUSTER || "devnet";
const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.SOLANA_RPC ||
  clusterApiUrl(CLUSTER);

const connection = new Connection(RPC_URL, "confirmed");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --------------------
// Mongo
// --------------------
async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("MONGO_URI not set. Badge minting 'only once' will NOT work.");
    return;
  }
  await mongoose.connect(uri);
  console.log("Mongo connected");
}

// --------------------
// Server wallet
// --------------------
function loadServerKeypair() {
  const kpPath = process.env.SOLANA_KEYPAIR_PATH || "./server-wallet.json";
  const abs = path.resolve(process.cwd(), kpPath);
  const secret = JSON.parse(fs.readFileSync(abs, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

const serverWallet = loadServerKeypair();

// --------------------
// Helpers
// --------------------
async function awardBadgeToWallet(walletAddress) {
  const mintStr = process.env.BADGE_MINT;
  if (!mintStr) throw new Error("BADGE_MINT not set in server/.env");

  const mint = new PublicKey(mintStr);
  const owner = new PublicKey(walletAddress);

  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    serverWallet, // payer
    mint,
    owner
  );

  const signature = await mintTo(
    connection,
    serverWallet, // payer
    mint,
    ata.address,
    serverWallet, // mint authority
    1
  );

  return {
    signature,
    explorer: `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`,
    badgeMint: mint.toBase58(),
    recipientAta: ata.address.toBase58(),
  };
}

// --------------------
// Routes
// --------------------
app.get("/", (req, res) => res.send("OK"));

// Points mint (create once)
app.post("/solana/create-points-mint", async (req, res) => {
  try {
    const mint = await createPointsMintOnce();
    res.json({ mint, note: "Save this as POINTS_MINT in server/.env" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Award points (server mints points token to user)
app.post("/solana/award-points", async (req, res) => {
  try {
    const { walletAddress, amount } = req.body;
    const r = await awardPointsToWallet(walletAddress, Number(amount || 0));
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create badge mint (run once, then put in BADGE_MINT)
app.post("/solana/create-badge-mint", async (req, res) => {
  try {
    const mint = await createMint(
      connection,
      serverWallet,
      serverWallet.publicKey,
      null,
      0
    );

    res.json({
      badgeMint: mint.toBase58(),
      note: "Put this into server/.env as BADGE_MINT and restart the server",
    });
  } catch (err) {
    console.error("CREATE MINT ERROR:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// Award badge (mint only once per wallet)
app.post("/solana/award-badge", async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const badgeId = "cycle_literacy_lv1";

    const existing = await BadgeMint.findOne({ walletAddress, badgeId });
    if (existing) {
      return res.status(409).json({
        error: "Badge already minted for this wallet.",
        existing,
      });
    }

    const result = await awardBadgeToWallet(walletAddress);

    await BadgeMint.create({
      walletAddress,
      badgeId,
      mintAddress: result.badgeMint,
      signature: result.signature,
    });

    return res.json(result);
  } catch (e) {
    if (String(e?.code) === "11000") {
      return res.status(409).json({ error: "Badge already minted for this wallet." });
    }
    return res.status(500).json({ error: e.message });
  }
});

// Gemini quiz
app.post("/ai/quiz", async (req, res) => {
  try {
    const { topic = "Cycle Phases 101", level = "beginner", numQuestions = 5 } =
      req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

    const prompt = `
You are an educational quiz writer for menstrual health literacy.
Avoid medical diagnosis. Keep content factual, supportive, and appropriate for ${level} level.

Topic: ${topic}
Number of questions: ${numQuestions}

Return ONLY valid JSON with this exact schema:
{
  "topic": string,
  "level": string,
  "questions": [
    {
      "id": string,
      "question": string,
      "choices": { "A": string, "B": string, "C": string, "D": string },
      "answer": "A" | "B" | "C" | "D",
      "explanation": string
    }
  ]
}

Rules:
- Exactly ${numQuestions} questions
- Each question must have 4 choices A-D
- Answers should be unambiguous
- Explanations must be 1 sentence
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(500).json({ error: "Quiz JSON not returned" });
    }

    const quiz = JSON.parse(match[0]);
    if (!quiz?.questions?.length) {
      return res.status(500).json({ error: "Invalid quiz format" });
    }

    res.json(quiz);
  } catch (err) {
    console.error("QUIZ ERROR:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// Gemini daily insight
app.post("/ai/daily-insight", async (req, res) => {
  try {
    const {
      date,
      phase,
      symptoms = [],
      mood,
      energy,
      notes = "",
      dietaryPrefs = "",
    } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

    const prompt = `
You are a supportive cycle + nutrition assistant. Do not diagnose or provide medical instructions.
Keep answers short and practical.

User context:
- Date: ${date}
- Cycle phase: ${phase}
- Symptoms: ${symptoms.length ? symptoms.join(", ") : "none"}
- Mood (1-5): ${mood}
- Energy (1-5): ${energy}
- Notes: ${notes || "none"}
- Dietary preferences: ${dietaryPrefs || "none"}

Return ONLY valid JSON with exactly these keys:
insight (string, 1-2 sentences),
foodTip (string, 1 sentence),
selfCareTip (string, 1 sentence).
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.json({
        insight: text.trim().slice(0, 220),
        foodTip: "Try a warm, balanced meal with protein + complex carbs.",
        selfCareTip: "Hydrate and do light stretching.",
      });
    }

    const data = JSON.parse(match[0]);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini request failed" });
  }
});

// --------------------
// Start
// --------------------
connectMongo()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  })
  .catch((e) => {
    console.error("Failed to start server:", e);
    process.exit(1);
  });