import mongoose from "mongoose";

const BadgeMintSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, index: true },
    badgeId: { type: String, required: true, index: true }, // e.g. "cycle_literacy_lv1"
    mintAddress: { type: String }, // optional: SPL mint address
    signature: { type: String },   // tx signature
  },
  { timestamps: true }
);

// enforce one mint per wallet per badge
BadgeMintSchema.index({ walletAddress: 1, badgeId: 1 }, { unique: true });

export default mongoose.model("BadgeMint", BadgeMintSchema);