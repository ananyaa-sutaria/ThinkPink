import mongoose from "mongoose";

const DonationSubmissionSchema = new mongoose.Schema(
  {
   userId: { type: String, required: true, index: true },
    walletAddress: { type: String, default: "" },

    locationName: { type: String, required: true },
    locationLat: { type: Number, required: true },
    locationLng: { type: Number, required: true },

    photoUrl: { type: String, required: true }, // local path or hosted url
    proofHash: { type: String, required: true }, // sha256

    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },

    // on-chain fields after approval
    impactMint: { type: String, default: "" },
    txMint: { type: String, default: "" },
    txFreeze: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("DonationSubmission", DonationSubmissionSchema);