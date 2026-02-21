import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Connection Error:", err));

// --- USER SCHEMA ---
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true }, 
  wallet: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

// --- AUTH ROUTES ---

// 1. SIGN UP
app.post("/api/users/signup", async (req, res) => {
  try {
    const { username, password, wallet } = req.body;
    const userId = `user_${username.toLowerCase().replace(/\s/g, "_")}`;
    const existing = await User.findOne({ userId });
    if (existing) return res.status(400).json({ error: "Username already exists" });

    const newUser = new User({ userId, name: username, password, wallet });
    await newUser.save();
    res.json(newUser);
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// 2. SIGN IN
app.post("/api/users/signin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const userId = `user_${username.toLowerCase().replace(/\s/g, "_")}`;
    const user = await User.findOne({ userId, password });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Signin failed" });
  }
});

// 3. UPDATE/SYNC (NEW): Updates existing user data
app.post("/api/users/sync", async (req, res) => {
  try {
    const { userId, name, wallet, password } = req.body;
    
    // Find user by userId and update their fields
    const updatedUser = await User.findOneAndUpdate(
      { userId: userId },
      { name, wallet, password },
      { new: true } // Return the updated document
    );

    if (!updatedUser) return res.status(404).json({ error: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    console.error("Sync Error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});