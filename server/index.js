require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Lesson = require("./models/Lesson");


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB подключена"))
  .catch(err => console.log(err));
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  const PORT = process.env.PORT || 5000;
  
  app.post("/admin-login", (req, res) => {
  const { password } = req.body;

  // console.log("ПРИШЕЛ ПАРОЛЬ:", password);
  // console.log("ADMIN:", process.env.ADMIN_PASSWORD);
  // console.log("VIDEO:", process.env.VIDEO_PASSWORD);

  if (password === process.env.ADMIN_PASSWORD) {
    console.log("Вход в ADMIN");
    return res.json({ success: "admin" });
  }

  if (password === process.env.VIDEO_PASSWORD) {
    console.log("Вход в VIDEOS");
    return res.json({ success: "videos" });
  }

  console.log("НЕВЕРНЫЙ ПАРОЛЬ");
  return res.json({ success: false });
}); 
  
  // 🔑 создать пользователя
app.post("/create-user", async (req, res) => {
  const { telegram_id, lessons, days } = req.body;

  const token = Math.random().toString(36).substring(2) + Date.now();

  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + days);

  const user = await User.create({
    telegram_id,
    token,
    expires_at,
    lessons_available: lessons,
    ip: null,
    device: null,
    is_active: true,
  });

  res.json({
    link: `${process.env.BASE_URL}/access?token=${token}`,
    user,
  });
});

// 🔍 получить всех пользователей
app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// 🔐 проверка доступа
app.get("/check-access", async (req, res) => {
  const { token } = req.query;

  const user = await User.findOne({ token });

  if (!user) return res.status(404).json({ error: "Нет доступа" });

  if (!user.is_active) return res.status(403).json({ error: "Заблокирован" });

  if (new Date() > new Date(user.expires_at))
    return res.status(403).json({ error: "Срок истёк" });

  const ip = req.ip;
  const device = req.headers["user-agent"];

  if (!user.ip) {
    user.ip = ip;
    user.device = device;
    await user.save();
  } else {
    if (user.ip !== ip || user.device !== device) {
      return res.status(403).json({ error: "Другое устройство" });
    }
  }

  res.json({
    lessons_available: user.lessons_available,
    expires_at: user.expires_at,
  });
});

app.listen(PORT, () => {
    console.log("Server started on " + PORT);
});

app.post("/add-lessons", async (req, res) => {
  const { telegram_id, lessons } = req.body;

  const user = await User.findOne({ telegram_id });

  user.lessons_available += lessons;
  await user.save();

  res.json({ success: true });
});

app.post("/extend", async (req, res) => {
  const { telegram_id, days } = req.body;

  const user = await User.findOne({ telegram_id });

  const newDate = new Date(user.expires_at);
  newDate.setDate(newDate.getDate() + days);

  user.expires_at = newDate;
  await user.save();

  res.json({ success: true });
});

app.post("/block", async (req, res) => {
  const { telegram_id } = req.body;

  const user = await User.findOne({ telegram_id });

  user.is_active = false;
  await user.save();

  res.json({ success: true });
});


// Добавить / обновить урок
app.post("/add-lesson", async (req, res) => {
  const { lesson_number, title, video_url, section } = req.body;

  let lesson = await Lesson.findOne({ lesson_number });

  if (lesson) {
    lesson.title = title;
    lesson.video_url = video_url;
    lesson.section = section;
    await lesson.save();
  } else {
    await Lesson.create({
      lesson_number,
      title,
      video_url,
      section,
    });
  }

  res.json({ success: true });
});
// Получить все уроки
app.get("/lessons", async (req, res) => {
  try {
    const lessons = await Lesson.find().sort({ lesson_number: 1 });
    res.json(lessons);
  } catch (e) {
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Получить урок по номеру
// app.post("/admin-login", (req, res) => {
//   const { password } = req.body;

//   if (password === process.env.ADMIN_PASSWORD) {
//     return res.json({ success: "admin" });
//   }

//   if (password === process.env.VIDEO_PASSWORD) {
//     return res.json({ success: "videos" });
//   }

//   return res.json({ success: false }); // ❗ НЕ 401
// });

// cd server
// node index.js