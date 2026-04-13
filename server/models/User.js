const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  telegram_id: Number,
  token: String,
  expires_at: Date,
  lessons_available: Number,
  ip: String,
  device: String,
  is_active: Boolean,
});

module.exports = mongoose.model("User", userSchema);