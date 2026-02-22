// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import multer from "multer";
import path from "path";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Connection, PublicKey, Keypair, clusterApiUrl, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import CycleLog from "./models/CycleLog.js";
import BadgeMint from "./models/BadgeMint.js";
import { createPointsMintOnce, awardPointsToWallet } from "./solanaPoints.js";
import DonationSubmission from "./models/donationSubmission.js";
import impactRoutes from "./impactRoutes.js";
import { makeDaoRouter } from "./daoRoutes.js";
import geoRoutes from "./geoRoutes.js";
import User from "./models/user.js";
import UserPoints from "./models/userPoints.js";
import Location from "./models/Location.js";

dotenv.config();
console.log("BADGE_MINT =", process.env.BADGE_MINT);
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(impactRoutes);            // if impactRoutes defines full paths like "/impact/submit"
app.use(geoRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => res.send("OK"));
// --------------------
const PORT = process.env.PORT || 5000;
const CLUSTER = process.env.SOLANA_CLUSTER || "devnet";
const serverWallet = loadServerKeypair();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl(CLUSTER);
app.get("/health", (req, res) => res.json({ ok: true }));
const connection = new Connection(RPC_URL, "confirmed");

app.use(makeDaoRouter({ connection }));
// --------------------
// Config & Constants

const CHAT_SYMPTOM_RULES = [
  { label: "Nausea", patterns: [/\bnausea\b/i, /\bnauseous\b/i, /\bqueasy\b/i] },
  { label: "Acne", patterns: [/\bacne\b/i, /\bpimple(s)?\b/i, /\bbreakout(s)?\b/i] },
  { label: "Bloating", patterns: [/\bbloat(ing|ed)?\b/i, /\bbloated\b/i] },
  {
    label: "Stomach pain",
    patterns: [/\bstomach pain\b/i, /\babdominal pain\b/i, /\bcramp(s|ing)?\b/i, /\bbelly pain\b/i],
  },
  { label: "Hot flash", patterns: [/\bhot flash(es)?\b/i, /\boverheat(ing)?\b/i, /\btoo hot\b/i] },
];

function resolveGeminiModel(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return "gemini-2.5-flash";

  // Friendly aliases
  if (["flash3", "flash-3", "gemini-flash-3", "gemini 3 flash"].includes(value)) {
    return "gemini-2.5-flash";
  }
  if (["flash", "fast"].includes(value)) {
    return "gemini-2.5-flash";
  }
  if (["pro", "gemini-pro"].includes(value)) {
    return "gemini-2.5-pro";
  }

  return String(raw).trim();
}

async function generateWithFallbackModels(prompt, preferredModel) {
  const candidates = [
    resolveGeminiModel(preferredModel),
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
  ];
  const tried = new Set();
  let lastErr = null;

  for (const name of candidates) {
    if (!name || tried.has(name)) continue;
    tried.add(name);
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent(prompt);
      return { answer: result.response.text().trim(), modelUsed: name };
    } catch (err) {
      lastErr = err;
      console.error(`CYCLE CHAT MODEL ERROR (${name}):`, err);
    }
  }

  throw lastErr || new Error("No Gemini model succeeded");
}

function normalizeCoachParagraph(answer) {
  const raw = String(answer || "");
  if (!raw) return raw;

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^(Phase|Pattern|Try today|Next|Nudge)\s*:\s*/i, "").trim());

  if (lines.length === 0) return raw;

  // Join into paragraph-style output. Keep one line break between major thoughts.
  const merged = lines.join(" ");
  return merged
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}

function extractChatSymptomsAndNotes(message) {
  const text = String(message || "").trim();
  if (!text) return { matchedSymptoms: [], shouldAddToNotes: false };

  const matched = new Set();
  for (const rule of CHAT_SYMPTOM_RULES) {
    if (rule.patterns.some((rx) => rx.test(text))) matched.add(rule.label);
  }

  const looksLikeFeelingMessage =
    /\b(i feel|i'm feeling|im feeling|i have|i'm having|im having|symptom|symptoms|pain|cramps?|nausea|bloating|acne|hot flash)\b/i.test(
      text
    );

  return {
    matchedSymptoms: Array.from(matched),
    shouldAddToNotes: matched.size === 0 && looksLikeFeelingMessage,
  };
}

async function persistChatSignalToTodayLog({ userId, dateISO, message }) {
  if (!userId || !dateISO || !message) return;

  const { matchedSymptoms, shouldAddToNotes } = extractChatSymptomsAndNotes(message);
  if (matchedSymptoms.length === 0 && !shouldAddToNotes) return;

  const existing = await CycleLog.findOne({ userId, dateISO });
  const noteLine = `Chat note: ${String(message).trim()}`;

  if (!existing) {
    await CycleLog.create({
      userId,
      dateISO,
      symptoms: matchedSymptoms,
      notes: shouldAddToNotes ? noteLine : undefined,
    });
    return;
  }

  const nextSymptoms = Array.isArray(existing.symptoms) ? [...existing.symptoms] : [];
  for (const s of matchedSymptoms) {
    if (!nextSymptoms.includes(s)) nextSymptoms.push(s);
  }
  existing.symptoms = nextSymptoms;

  if (shouldAddToNotes) {
    const prevNotes = String(existing.notes || "");
    if (!prevNotes.includes(noteLine)) {
      existing.notes = prevNotes ? `${prevNotes}\n${noteLine}` : noteLine;
    }
  }

  await existing.save();
}


// --------------------
// Mongo Setup
// --------------------

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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
    const { username, password, wallet, pronouns } = req.body;
    const existing = await User.findOne({ name: username });
    if (existing) return res.status(400).json({ error: "Username exists" });

    const userId = `${username.toLowerCase().replace(/\s/g, "_")}_${Math.floor(100 + Math.random() * 900)}`;
    const newUser = new User({ userId, name: username, pronouns: pronouns || "", password, wallet: wallet || "" });
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

// server/index.js
app.post("/api/users/change-password", async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "userId, currentPassword and newPassword are required" });
    }

    const existing = await User.findOne({ userId });
    if (!existing) return res.status(404).json({ error: "User not found" });
    if (existing.password !== currentPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    existing.password = newPassword;
    await existing.save();

    res.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to update password" });
  }
});

app.post("/api/users/sync", async (req, res) => {
  try {
    const { userId, name, wallet, password, pronouns } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (wallet !== undefined) updates.wallet = wallet;
    if (pronouns !== undefined) updates.pronouns = pronouns;
    if (password !== undefined && String(password).length > 0) updates.password = password;

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error("SYNC ERROR:", err);
    res.status(500).json({ error: "Failed to sync user" });
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

app.post("/solana/redeem-points", async (req, res) => {
  try {
    const { userId, walletAddress, pointsCost } = req.body || {};
    const cost = Number(pointsCost);

    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });
    if (!Number.isFinite(cost) || cost <= 0) return res.status(400).json({ error: "pointsCost must be > 0" });

    const recipient = new PublicKey(String(walletAddress).trim());
    const row = await UserPoints.findOne({ userId });
    const currentPoints = Number(row?.points || 0);
    if (currentPoints < cost) {
      return res.status(400).json({ error: "Not enough points" });
    }

    const lamportsPerPoint = Number(process.env.REDEEM_LAMPORTS_PER_POINT || 10000); // 0.00001 SOL/point
    const lamports = Math.max(1, Math.floor(cost * lamportsPerPoint));

    const transferTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: serverWallet.publicKey,
        toPubkey: recipient,
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transferTx, [serverWallet], {
      commitment: "confirmed",
    });

    const after = await UserPoints.findOneAndUpdate(
      { userId, points: { $gte: cost } },
      { $inc: { points: -cost } },
      { new: true }
    );

    if (!after) {
      return res.status(409).json({ error: "Points changed during redemption. Try again." });
    }

    // Keep User.points roughly in sync where it exists.
    await User.updateOne({ userId }, { $inc: { points: -cost } });

    return res.json({
      ok: true,
      signature,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`,
      pointsSpent: cost,
      pointsAfter: Number(after.points || 0),
      lamportsSent: lamports,
      solSent: lamports / 1_000_000_000,
    });
  } catch (e) {
    console.error("REDEEM ERROR:", e);
    return res.status(500).json({ error: String(e?.message || e) });
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

    // Write symptom signal from chat into today's cycle log.
    // - known symptom words -> add to symptoms list
    // - feeling text that is not a known symptom -> append to notes
    try {
      await persistChatSignalToTodayLog({
        userId,
        dateISO: snapshot?.todayISO || new Date().toISOString().slice(0, 10),
        message,
      });
    } catch (logSignalErr) {
      console.error("CYCLE CHAT LOG SIGNAL ERROR:", logSignalErr);
    }

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

    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    const modelName = resolveGeminiModel(process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash");

    const prompt = `
You are ThinkPink, a supportive cycle + nutrition assistant.
Use snapshot data when available, but do not block on missing data.
If snapshot data is sparse, provide general evidence-informed guidance from widely accepted menstrual health knowledge.
No diagnosis, no treatment claims, no emergency advice.

WRITING STYLE:
- Friendly, engaging, clean, and conversational.
- Use short connected sentences (narrative flow), not rigid section labels or bullet dumps.
- Exactly 2-3 sentences total.
- End with one relevant check-in question tailored to the user's message.
- Use subtle micro-empathy when data suggests a rough day (e.g., very low mood or high symptoms).
- Mention phase names explicitly when relevant: Luteal, Follicular, Ovulation, Menstrual.
- Light ASCII is allowed ("->", "[tip]"), but keep it minimal.
- ASCII only. Do not use emoji.
- For scannability, wrap the most important human details (symptoms/feelings/pattern clues) in **double asterisks**.
- Prefer transition words to bridge ideas naturally (e.g., "interestingly", "specifically", "consequently").
- Do not use label prefixes like "Phase:", "Pattern:", "Try today:", or "Next:".
- Integrate guidance as soft expert advice in the paragraph flow.
- Be straight to the point and avoid extra filler.
- Prefer practical, safe recommendations users can try now (hydration, sleep, balanced meals, symptom tracking).
- Do not mention lack of data, missing data, uncertainty, or that advice comes from research/studies.
- Never say phrases like "not enough data", "limited data", "research suggests", or "evidence shows".

INTERPRETATION RULES:
- "day N of my cycle": use recentLogs where cycleDay == N. If <2 matches, give a concise general guidance answer for that day context.
- "how do I usually feel in luteal/follicular/ovulation/menstrual": filter recentLogs by phase and summarize typical mood/energy/symptoms.
- "what should I eat today": use todayPhase if present; otherwise give a general balanced suggestion.
- "when was my last period": use lastPeriodStartISO.
- If user asks a broader health question not fully covered by snapshot, answer using general evidence-informed cycle education.

SNAPSHOT JSON:
${JSON.stringify(enrichedSnapshot, null, 2)}

USER QUESTION:
${message}
`;

    // Fallback path if Gemini is not configured.
    if (!hasGeminiKey) {
      const fallback =
        enrichedSnapshot.lastPeriodStartISO
          ? `I can use your logs to help with patterns. Your most recent logged period start was ${enrichedSnapshot.lastPeriodStartISO}.`
          : "I can help summarize your logged patterns, but I need more cycle logs to answer this precisely.";
      return res.json({ answer: fallback });
    }

    try {
      const out = await generateWithFallbackModels(prompt, modelName);
      const normalized = normalizeCoachParagraph(out.answer);
      return res.json({ answer: normalized, modelUsed: out.modelUsed });
    } catch (modelErr) {
      console.error("CYCLE CHAT MODEL ERROR:", modelErr);
      const fallback =
        enrichedSnapshot.lastPeriodStartISO
          ? `I couldn’t run the full assistant right now, but your latest logged period start is ${enrichedSnapshot.lastPeriodStartISO}.`
          : "I couldn’t run the full assistant right now. Please try again, and make sure your cycle logs are saved.";
      return res.json({ answer: fallback });
    }
  } catch (e) {
    console.error("CYCLE CHAT ERROR:", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});
// server/index.js (replace your /ai/quiz route with this)

app.post("/ai/quiz", async (req, res) => {
  const { topic = "Cycle Phases 101", level = "beginner", numQuestions = 5 } = req.body || {};

  // fallback quiz (always valid JSON)
  const fallbackQuiz = {
    topic,
    level,
    questions: [
      {
        id: "q1",
        question: "Which phase is typically right before menstruation starts?",
        choices: {
          A: "Follicular",
          B: "Ovulatory",
          C: "Luteal",
          D: "Menstrual",
        },
        answer: "C",
        explanation: "The luteal phase occurs after ovulation and ends when menstruation begins.",
      },
      {
        id: "q2",
        question: "Ovulation usually happens around the middle of a typical cycle. What is released?",
        choices: {
          A: "A follicle",
          B: "An egg",
          C: "Progesterone",
          D: "Menstrual blood",
        },
        answer: "B",
        explanation: "Ovulation is when an ovary releases an egg.",
      },
      {
        id: "q3",
        question: "Which is a common, non-diagnostic sign that may happen in the luteal phase?",
        choices: {
          A: "Higher energy for everyone",
          B: "Cravings or bloating for some people",
          C: "Guaranteed weight loss",
          D: "Always no symptoms",
        },
        answer: "B",
        explanation: "Some people experience cravings, bloating, or mood changes in the luteal phase.",
      },
      {
        id: "q4",
        question: "A balanced snack for steady energy often includes:",
        choices: {
          A: "Only candy",
          B: "Only water",
          C: "Protein + fiber (like yogurt + berries)",
          D: "Only soda",
        },
        answer: "C",
        explanation: "Protein and fiber can help steady energy and keep you fuller longer.",
      },
      {
        id: "q5",
        question: "Which statement is most accurate?",
        choices: {
          A: "Everyone has the same cycle length",
          B: "Cycles can vary and tracking helps you learn patterns",
          C: "Symptoms always mean something is wrong",
          D: "Cycle phases are not real",
        },
        answer: "B",
        explanation: "Cycles vary person to person; tracking helps spot your own patterns.",
      },
    ].slice(0, Number(numQuestions) || 5),
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ ...fallbackQuiz, note: "Gemini key missing, using fallback quiz." });
    }

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
- Explanations must be 1 sentence
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.json({ ...fallbackQuiz, note: "Model did not return JSON, using fallback quiz." });

    const quiz = JSON.parse(match[0]);
    if (!quiz?.questions?.length) return res.json({ ...fallbackQuiz, note: "Invalid model quiz, using fallback quiz." });

    return res.json(quiz);
  } catch (err) {
    console.log("QUIZ ERROR:", err?.message || err);
    // If Gemini key is blocked/leaked, you still get a working quiz
    return res.json({ ...fallbackQuiz, note: "Gemini failed, using fallback quiz." });
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
// server/index.js (or wherever your routes live)

app.get("/geo/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q || q.length < 3) return res.json({ ok: true, results: [] });

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    const toRad = (d) => (d * Math.PI) / 180;
    const haversineKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };

    async function nominatimSearch({ bounded }) {
      let url =
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(q)}` +
        `&format=json&addressdetails=1&limit=20&countrycodes=us`;

      // For short queries, bounding often kills results — don’t bound unless query is longer
      const allowBounded = bounded && hasCoords && q.length >= 5;

      if (allowBounded) {
        const delta = 0.35; // ~35–40km-ish
        const left = lng - delta;
        const right = lng + delta;
        const top = lat + delta;
        const bottom = lat - delta;
        url += `&viewbox=${left},${top},${right},${bottom}&bounded=1`;
      }

      const r = await fetch(url, {
        headers: {
          "User-Agent": "ThinkPink/1.0",
          Accept: "application/json",
        },
      });

      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Geo provider error: ${text.slice(0, 200)}`);
      }

      const data = await r.json();
      return Array.isArray(data) ? data : [];
    }

    // Pass 1: try “near me” (bounded) when possible
    let data = await nominatimSearch({ bounded: true });

    // Pass 2: if nothing, fall back to unbounded search
    if (!data.length) {
      data = await nominatimSearch({ bounded: false });
    }

    let results = data
      .map((item) => {
        const ilat = Number(item.lat);
        const ilng = Number(item.lon);
        const distanceKm = hasCoords ? haversineKm(lat, lng, ilat, ilng) : null;

        return {
          name: item.display_name,
          lat: ilat,
          lng: ilng,
          distanceKm,
        };
      })
      .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));

    // Always sort nearest-first if we have coords
    if (hasCoords) {
      results.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));

      // Hard-cut to “reasonable-ish” nearby results first; if none, still return the closest
      const nearby = results.filter((x) => (x.distanceKm ?? 1e9) <= 80);
      results = (nearby.length ? nearby : results).slice(0, 8);
    } else {
      results = results.slice(0, 8);
    }

    res.json({ ok: true, results: results.map(({ name, lat, lng }) => ({ name, lat, lng })) });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Geo search failed" });
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
// Autocomplete donation places near user
app.get("/points/:userId", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    if (!userId) return res.status(400).json({ error: "userId required" });

    const u = await User.findOne({ userId }).lean();
    if (!u) return res.status(404).json({ error: "user not found" });

    res.json({ ok: true, points: Number(u.points || 0) });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});
app.post("/impact/places-autocomplete", async (req, res) => {
  try {
    const { query, near } = req.body; // near: { lat, lng }
    if (!query) return res.status(400).json({ error: "query required" });
    if (!process.env.PLACES_API_KEY) return res.status(500).json({ error: "PLACES_API_KEY not set" });

    const location = near?.lat && near?.lng ? `&location=${near.lat},${near.lng}&radius=50000` : "";
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(query)}` +
      `&types=establishment${location}` +
      `&key=${process.env.PLACES_API_KEY}`;

    const r = await fetch(url);
    const data = await r.json();

    const suggestions = (data.predictions || []).slice(0, 6).map((p) => ({
      placeId: p.place_id,
      description: p.description,
    }));

    res.json({ ok: true, suggestions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Resolve placeId -> full details (name/address/lat/lng)
app.post("/impact/place-details", async (req, res) => {
  try {
    const { placeId } = req.body;
    if (!placeId) return res.status(400).json({ error: "placeId required" });
    if (!process.env.PLACES_API_KEY) return res.status(500).json({ error: "PLACES_API_KEY not set" });

    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${encodeURIComponent(placeId)}` +
      `&fields=name,formatted_address,geometry` +
      `&key=${process.env.PLACES_API_KEY}`;

    const r = await fetch(url);
    const data = await r.json();
    const result = data.result;

    if (!result) return res.status(404).json({ error: "Place not found" });

    res.json({
      ok: true,
      place: {
        placeId,
        name: result.name,
        address: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/impact/nearby-centers", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat and lng query params are required" });
    }

    const toRad = (d) => (d * Math.PI) / 180;
    const haversineKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };

    const classifyCenterType = (name = "", types = []) => {
      const text = `${name} ${(types || []).join(" ")}`.toLowerCase();
      if (/(abortion|planned parenthood|reproductive health)/i.test(text)) return "abortion";
      if (/(women|woman|obgyn|gyne|female)/i.test(text)) return "women";
      if (/(period|menstrual|feminine hygiene|sanitary|tampon|pad|donation)/i.test(text)) return "period";
      return "women";
    };

    const normalizePlace = (p) => {
      const plat = Number(p?.geometry?.location?.lat);
      const plng = Number(p?.geometry?.location?.lng);
      if (!Number.isFinite(plat) || !Number.isFinite(plng)) return null;

      return {
        id: p.place_id,
        name: p.name || "Health center",
        address: p.vicinity || "",
        lat: plat,
        lng: plng,
        type: classifyCenterType(p.name, p.types),
        distanceKm: haversineKm(lat, lng, plat, plng),
      };
    };

    const seenIds = new Set();
    const places = [];

    if (process.env.PLACES_API_KEY) {
      const radius = 25000;
      const queries = [
        "period product donation center",
        "women's health clinic",
        "abortion clinic",
      ];

      for (const keyword of queries) {
        const url =
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
          `?location=${lat},${lng}` +
          `&radius=${radius}` +
          `&keyword=${encodeURIComponent(keyword)}` +
          `&key=${process.env.PLACES_API_KEY}`;

        const r = await fetch(url);
        if (!r.ok) continue;
        const data = await r.json();
        const rows = Array.isArray(data?.results) ? data.results : [];

        for (const row of rows) {
          const normalized = normalizePlace(row);
          if (!normalized) continue;
          if (seenIds.has(normalized.id)) continue;
          seenIds.add(normalized.id);
          places.push(normalized);
        }
      }
    }

    if (places.length === 0) {
      const fallback = await Location.find().lean();
      for (const c of fallback) {
        const plat = Number(c?.coordinates?.latitude);
        const plng = Number(c?.coordinates?.longitude);
        if (!Number.isFinite(plat) || !Number.isFinite(plng)) continue;

        const distanceKm = haversineKm(lat, lng, plat, plng);
        if (distanceKm > 80) continue;

        places.push({
          id: String(c?._id || `${plat}-${plng}`),
          name: c?.name || "Health center",
          address: [c?.address?.street, c?.address?.city, c?.address?.state].filter(Boolean).join(", "),
          lat: plat,
          lng: plng,
          type: classifyCenterType(c?.name, c?.acceptedItems || []),
          distanceKm,
        });
      }
    }

    places.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({
      ok: true,
      centers: places.slice(0, 30),
    });
  } catch (e) {
    console.error("NEARBY CENTERS ERROR:", e);
    return res.status(500).json({ error: e?.message || "Failed to load nearby centers" });
  }
});

// Submit donation for approval (stores in MongoDB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || ".jpg");
    cb(null, `donation_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// IMPORTANT: set this in .env to your ngrok URL so clients always get the right URL
// PUBLIC_BASE_URL=https://xxxxx.ngrok-free.dev
function getPublicBaseUrl(req) {
  const envBase = process.env.PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");
  // fallback (works locally, not always perfect behind tunnels)
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

app.post("/impact/upload", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "photo is required" });

    const base = getPublicBaseUrl(req);
    const imageUrl = `${base}/uploads/${req.file.filename}`;

    res.json({ ok: true, imageUrl });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Upload failed" });
  }
});
app.post("/impact/submit-donation", async (req, res) => {
  try {
    const { userId, imageUrl, place } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });
    if (!place?.placeId) return res.status(400).json({ error: "place required" });

    const doc = await DonationSubmission.create({
      userId,
      imageUrl,
      placeId: place.placeId,
      placeName: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      status: "pending",
    });

    res.json({ ok: true, submission: doc });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------
// CONNECT LOCATIONS (Mongo)
// -------------------------------
// ✅ PLACE THIS AFTER connectMongo() AND BEFORE app.listen()
app.get("/locations", async (req, res) => {
  try {
    const locations = await Location.find().lean(); // lean() ensures plain JSON
    res.json(locations);
  } catch (err) {
    console.error("Failed to fetch locations:", err);
    res.status(500).json({ error: "Failed to fetch locations" });
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
