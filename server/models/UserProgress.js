const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema({
  telegram_id: {
    type: Number,
    required: true,
    unique: true,
  },

  favorites: {
    type: [String],
    default: [],
  },

  bookmarks: {
    type: [String],
    default: [],
  },

  watched_lessons: {
    type: [String],
    default: [],
  },

  last_lesson: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model(
  "UserProgress",
  userProgressSchema
);