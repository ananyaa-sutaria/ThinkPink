import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  pronouns: { type: String, default: "" },
  password: { type: String, required: true },
  wallet: { type: String, default: "" },
  points: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
