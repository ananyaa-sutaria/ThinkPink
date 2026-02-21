import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
// Make sure your .env file has MONGO_URI=your_mongodb_link
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Connection Error:", err));

// --- USER SCHEMA ---
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true }, 
  wallet: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

// --- ROUTES ---

// 1. SIGN UP
app.post("/api/users/signup", async (req, res) => {
  try {
    const { username, password, wallet } = req.body;
    const cleanName = username.toLowerCase().replace(/\s/g, "_");
    const userId = `${cleanName}_${Math.floor(100 + Math.random() * 900)}`;

    const existing = await User.findOne({ name: username });
    if (existing) return res.status(400).json({ error: "Username already exists" });

    const newUser = new User({ userId, name: username, password, wallet: wallet || "" });
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
    const user = await User.findOne({ name: username, password: password });
    
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Signin failed" });
  }
});

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});