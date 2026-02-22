import mongoose from "mongoose";

const ProposalSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    options: [{ key: String, label: String, votes: { type: Number, default: 0 } }],
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Proposal", ProposalSchema);