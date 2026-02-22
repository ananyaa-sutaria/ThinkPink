// server/impactRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import DonationSubmission from "./models/donationSubmission.js";
import UserPoints from "./models/userPoints.js";
import { Connection, PublicKey, Keypair, clusterApiUrl } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import User from "./models/user.js";

const router = express.Router();

// ---------- uploads ----------
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || ".jpg") || ".jpg";
    cb(null, `impact_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ---------- solana ----------
function loadServerKeypair() {
  const kpPath = process.env.SOLANA_KEYPAIR_PATH || "./server-wallet.json";
  const abs = path.resolve(process.cwd(), kpPath);
  const secret = JSON.parse(fs.readFileSync(abs, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

const CLUSTER = process.env.SOLANA_CLUSTER || "devnet";
const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl(CLUSTER);
const connection = new Connection(RPC_URL, "confirmed");
const serverWallet = loadServerKeypair();

// ---------- routes ----------

// POST /impact/submit (multipart/form-data: photo + fields)
router.post("/impact/submit", upload.single("photo"), async (req, res) => {
  try {
    const {
      userId,
      walletAddress = "",
      locationName,
      locationLat,
      locationLng,
    } = req.body || {};

    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!req.file) return res.status(400).json({ error: "photo required" });
    if (!locationName) return res.status(400).json({ error: "locationName required" });

    const lat = Number(locationLat);
    const lng = Number(locationLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "locationLat/locationLng invalid" });
    }

    const publicBase = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
    const photoUrl = `${publicBase}/uploads/${req.file.filename}`;

    const fileBuffer = fs.readFileSync(req.file.path);
    const proofHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const doc = await DonationSubmission.create({
      userId,
      walletAddress,
      locationName,
      locationLat: lat,
      locationLng: lng,
      photoUrl,
      proofHash,
      status: "pending",
    });

    return res.json({ ok: true, submission: doc });
  } catch (e) {
    console.error("IMPACT SUBMIT ERROR:", e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

// GET /impact/pending (admin)
router.get("/impact/pending", async (req, res) => {
  try {
    const items = await DonationSubmission.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ ok: true, submissions: items });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

// GET /impact/mine/:userId
router.get("/impact/mine/:userId", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    if (!userId) return res.status(400).json({ error: "userId required" });

    const submissions = await DonationSubmission.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ ok: true, submissions });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

// POST /impact/approve (admin)
// body: { submissionId }
router.post("/impact/approve", async (req, res) => {
  try {
    const { submissionId } = req.body || {};
    if (!submissionId) return res.status(400).json({ error: "submissionId required" });

    const sub = await DonationSubmission.findById(submissionId);
    if (!sub) return res.status(404).json({ error: "submission not found" });

    if (sub.status === "approved") {
      return res.json({ ok: true, submission: sub, note: "Already approved." });
    }const AWARD = 10;
    if (!sub.pointsAwarded) {
      await UserPoints.findOneAndUpdate(
        { userId: sub.userId },
        { $inc: { points: AWARD } },
        { upsert: true, new: true }
      );

      sub.pointsAwarded = true;
      sub.pointsAwardedAt = new Date();
      sub.pointsAwardedAmount = AWARD;
    }


    const BADGE_MINT = process.env.BADGE_MINT; // read from env at request time
    if (!BADGE_MINT) return res.status(500).json({ error: "BADGE_MINT not set" });
    if (!sub.walletAddress) return res.status(400).json({ error: "walletAddress missing on submission" });

    const mint = new PublicKey(BADGE_MINT);
    const owner = new PublicKey(sub.walletAddress);

    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      serverWallet, // payer
      mint,
      owner
    );

    const signature = await mintTo(
      connection,
      serverWallet, // payer + authority
      mint,
      ata.address,
      serverWallet, // mint authority
      1
    );

    sub.status = "approved";
    sub.impactMint = BADGE_MINT;
    sub.txMint = signature;
    // inside /impact/approve, after mint succeeds, before return:

if (!sub.pointsAwarded) {
  await User.updateOne(
    { userId: sub.userId },
    { $inc: { points: 10 } }
  );
  sub.pointsAwarded = true;
}
await sub.save();
    await sub.save();


    return res.json({
      ok: true,
      submission: sub,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`,
    });
  } catch (e) {
    console.error("IMPACT APPROVE ERROR:", e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

// POST /impact/reject (admin)
// body: { submissionId }
router.post("/impact/reject", async (req, res) => {
  try {
    const { submissionId } = req.body || {};
    if (!submissionId) return res.status(400).json({ error: "submissionId required" });

    const doc = await DonationSubmission.findById(submissionId);
    if (!doc) return res.status(404).json({ error: "submission not found" });

    doc.status = "rejected";
    await doc.save();

    return res.json({ ok: true, submission: doc });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});
router.get("/points/:userId", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    if (!userId) return res.status(400).json({ error: "userId required" });

    const row = await UserPoints.findOne({ userId }).lean();
    return res.json({ ok: true, points: row?.points || 0 });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

export default router;