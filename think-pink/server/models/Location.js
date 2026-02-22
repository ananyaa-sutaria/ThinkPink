import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  name: String,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
  },
  coordinates: {
    latitude: Number,
    longitude: Number,
  },
  acceptedItems: [String],
  hours: Object,
  description: String,
  phone: String,
  website: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Location", locationSchema);