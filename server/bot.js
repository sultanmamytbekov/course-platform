const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");
const fetch = require("node-fetch");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = 5560264800;

// DB
const User = require("./models/User");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB подключена (бот)"))
  .catch(err => console.log(err));

// 🔐 генерация токена
function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

// 👤 регистрация пользователя
bot.on("message", async (msg) => {
  const telegram_id = msg.chat.id;

  let user = await User.findOne({ telegram_id });

  if (!user) {
    await User.create({
      telegram_id,
      token: null,
      lessons_available: 0,
      expires_at: null,
      is_active: false,
    });

    console.log("Новый пользователь:", telegram_id);
  }
});

// /start
bot.onText(/\/start/, async (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `👋 Добро пожаловать!\n\nВаш ID: ${msg.chat.id}\n\nОтправьте его менеджеру`
  );
});

// ➕ ADD USER
bot.onText(/\/add_user (.+)/, async (msg, match) => {
  if (msg.chat.id !== ADMIN_ID)
    return bot.sendMessage(msg.chat.id, "⛔ Нет доступа");

  const [telegram_id, lessons, days] = match[1].split(" ");

  const token = generateToken();

  const link = `https://YOUR-SITE.vercel.app/access?token=${token}`;

  await User.findOneAndUpdate(
    { telegram_id },
    {
      telegram_id,
      token,
      lessons_available: Number(lessons),
      expires_at: new Date(Date.now() + Number(days) * 86400000),
      is_active: true,
    },
    { upsert: true }
  );

  bot.sendMessage(msg.chat.id, "✅ Пользователь создан");

  bot.sendMessage(
    telegram_id,
    `🎓 Вам открыт доступ к курсу:\n\n${link}`
  );
});

// 📚 add lessons
bot.onText(/\/add_lessons (.+)/, async (msg, match) => {
  if (msg.chat.id !== ADMIN_ID)
    return bot.sendMessage(msg.chat.id, "⛔ Нет доступа");

  const [telegram_id, lessons] = match[1].split(" ");

  await User.updateOne(
    { telegram_id },
    { $set: { lessons_available: Number(lessons) } }
  );

  bot.sendMessage(msg.chat.id, "✅ Уроки обновлены");
});

// ⏳ extend
bot.onText(/\/extend (.+)/, async (msg, match) => {
  if (msg.chat.id !== ADMIN_ID)
    return bot.sendMessage(msg.chat.id, "⛔ Нет доступа");

  const [telegram_id, days] = match[1].split(" ");

  await User.updateOne(
    { telegram_id },
    {
      $set: {
        expires_at: new Date(Date.now() + Number(days) * 86400000),
      },
    }
  );

  bot.sendMessage(msg.chat.id, "⏳ Продлено");
});

// 🚫 block
bot.onText(/\/block (.+)/, async (msg, match) => {
  if (msg.chat.id !== ADMIN_ID)
    return bot.sendMessage(msg.chat.id, "⛔ Нет доступа");

  const telegram_id = match[1];

  await User.updateOne(
    { telegram_id },
    { $set: { is_active: false } }
  );

  bot.sendMessage(msg.chat.id, "🚫 Заблокирован");
});

// debug
bot.on("message", (msg) => {
  console.log("ID:", msg.chat.id);
});