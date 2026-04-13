const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  lesson_number: Number,
  title: String,
  video_url: String,
  section: String,
});

module.exports = mongoose.model("Lesson", lessonSchema);