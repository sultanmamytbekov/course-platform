const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  telegram_id: Number,
  token: String,
  expires_at: Date,
  lessons_available: Number,
  ip: String,
  device: String,
  device_id: {
    type: String,
    default: null,
  },
  is_active: Boolean,
});

module.exports = mongoose.model("User", userSchema);