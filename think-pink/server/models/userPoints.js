import mongoose from "mongoose";

const UserPointsSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("UserPoints", UserPointsSchema);