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

// Models
import CycleLog from "./models/CycleLog.js";
import BadgeMint from "./models/BadgeMint.js";
import DonationSubmission from "./models/donationSubmission.js";
import Location from "./models/Location.js"; // Ensure this file exists and uses 'export default'

// Solana Helpers
import { createPointsMintOnce, awardPointsToWallet } from "./solanaPoints.js";

dotenv.config();
const app = express();

// Middleware
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
  if (!uri) {
    console.error("❌ MONGO_URI not set in .env file.");
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}

// --------------------
// Solana Helpers
// --------------------
function loadServerKeypair() {
  try {
    const kpPath = process.env.SOLANA_KEYPAIR_PATH || "./server-wallet.json";
    const abs = path.resolve(process.cwd(), kpPath);
    const secret = JSON.parse(fs.readFileSync(abs, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(secret));
  } catch (e) {
    console.warn("⚠️ Solana keypair not found. Solana features may fail.");
    return null;
  }
}
const serverWallet = loadServerKeypair();

async function awardBadgeToWallet(walletAddress) {
  if (!serverWallet) throw new Error("Server wallet not initialized");
  const mintStr = process.env.BADGE_MINT;
  if (!mintStr) throw new Error("BADGE_MINT not set");
  const mint = new PublicKey(mintStr);
  const owner = new PublicKey(walletAddress);
  const ata = await getOrCreateAssociatedTokenAccount(connection, serverWallet, mint, owner);
  const signature = await mintTo(connection, serverWallet, mint, ata.address, serverWallet, 1);
  return { signature, explorer: `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}` };
}

// --------------------
// Basic Routes
// --------------------
app.get("/", (req, res) => res.send("ThinkPink API is Running"));
app.get("/health", (req, res) => res.json({ ok: true, timestamp: new Date() }));

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

app.post("/api/users/change-password", async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ error: "Data required" });
    const updated = await User.findOneAndUpdate({ userId }, { $set: { password: newPassword } }, { new: true });
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update password" });
  }
});

// --------------------
// Cycle & AI Routes
// --------------------
app.post("/logs/save", async (req, res) => {
  try {
    const log = req.body;
    if (!log?.userId || !log?.dateISO) return res.status(400).json({ error: "Missing fields" });
    const saved = await CycleLog.findOneAndUpdate(
      { userId: log.userId, dateISO: log.dateISO },
      { $set: log },
      { new: true, upsert: true }
    ).lean();
    res.json({ ok: true, log: saved });
  } catch (e) {
    res.status(500).json({ error: "Save failed" });
  }
});

app.get("/logs/recent", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const logs = await CycleLog.find({ userId }).sort({ dateISO: -1 }).limit(60).lean();
    res.json({ ok: true, logs });
  } catch (e) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// --------------------
// Impact & Locations (FIXED SECTION)
// --------------------

// Get All Locations for the Map
app.get("/locations", async (req, res) => {
  try {
    const locations = await Location.find().lean();
    console.log(`📡 Sending ${locations.length} locations to client`);
    res.json(locations);
  } catch (err) {
    console.error("❌ Failed to fetch locations:", err);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

// Google Places Autocomplete
app.post("/impact/places-autocomplete", async (req, res) => {
  try {
    const { query, near } = req.body;
    if (!query) return res.status(400).json({ error: "query required" });
    const locationStr = near?.lat && near?.lng ? `&location=${near.lat},${near.lng}&radius=50000` : "";
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=establishment${locationStr}&key=${process.env.PLACES_API_KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    const suggestions = (data.predictions || []).map(p => ({ placeId: p.place_id, description: p.description }));
    res.json({ ok: true, suggestions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Submit proof
app.post("/impact/submit-donation", async (req, res) => {
  try {
    const { userId, imageUrl, place } = req.body;
    const doc = await DonationSubmission.create({
      userId, imageUrl, placeId: place.placeId, placeName: place.name,
      address: place.address, lat: place.lat, lng: place.lng, status: "pending"
    });
    res.json({ ok: true, submission: doc });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --------------------
// Start Server
// --------------------
connectMongo().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});