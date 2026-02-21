import mongoose from "mongoose";

const CycleLogSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true }, // wallet or guest id
    dateISO: { type: String, required: true, index: true }, // "YYYY-MM-DD"
    phase: String,
    cycleDay: Number,
    mood: Number,    // 1-5
    energy: Number,  // 1-5
    symptoms: [String],
    notes: String,

    // optional flags
    periodStart: Boolean,
    periodEnd: Boolean,
    spotting: Boolean,
  },
  { timestamps: true }
);

// one log per user per day (prevents duplicates)
CycleLogSchema.index({ userId: 1, dateISO: 1 }, { unique: true });

export default mongoose.model("CycleLog", CycleLogSchema);