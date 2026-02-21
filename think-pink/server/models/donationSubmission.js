import mongoose from "mongoose";

const DonationSubmissionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    imageUrl: { type: String, required: true }, // for hackathon: store local URI or later upload to cloud
    placeId: { type: String, required: true },
    placeName: { type: String, required: true },
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("DonationSubmission", DonationSubmissionSchema);