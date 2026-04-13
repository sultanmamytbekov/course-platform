const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");

const token = process.env.BOT_TOKEN;
if (!token) {
  console.log("❌ BOT_TOKEN не найден в .env");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = 6395152471;

// DB
const User = require("./models/User");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB подключена (бот)"))
  .catch(err => console.log(err));

// 🔐 генерация токена
function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

// 📋 команды (чтобы отображались в Telegram)
bot.setMyCommands([
  { command: "start", description: "👋 Старт" },
  { command: "add_user", description: "➕ Добавить пользователя" },
  { command: "add_lessons", description: "📚 Обновить уроки" },
  { command: "extend", description: "⏳ Продлить доступ" },
  { command: "block", description: "🚫 Заблокировать" },
  { command: "reset_token", description: "🔄 Сброс токена" },
  { command: "list_users", description: "👥 Список пользователей" }
]);

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
    `👋 Добро пожаловать!\n\nВаш ID: <code>${msg.chat.id}</code>\n\nОтправьте его менеджеру`,
    { parse_mode: "HTML" }
  );
});

// ➕ ADD USER
bot.onText(/\/add_user (.+)/, async (msg, match) => {
  if (msg.chat.id !== ADMIN_ID)
    return bot.sendMessage(msg.chat.id, "⛔ Нет доступа");

  const [telegram_id, lessons, days] = match[1].split(" ");

  const token = generateToken();

  const link = `https://course-platform-alpha-three.vercel.app/access?token=${token}`;

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

// 🔄 RESET TOKEN (НОВАЯ КОМАНДА)
bot.onText(/\/reset_token (.+)/, async (msg, match) => {
  if (msg.chat.id !== ADMIN_ID)
    return bot.sendMessage(msg.chat.id, "⛔ Нет доступа");

  const telegram_id = Number(match[1]);

  const user = await User.findOne({ telegram_id });

  if (!user) {
    return bot.sendMessage(msg.chat.id, "❌ Пользователь не найден");
  }

  user.token = null;
  user.ip = null;
  user.device = null;

  await user.save();

  bot.sendMessage(msg.chat.id, "🔄 Токен сброшен");

  bot.sendMessage(
    telegram_id,
    "🔄 Ваш доступ обновлён. Откройте ссылку заново."
  );
});

// 👥 список пользователей
bot.onText(/\/list_users/, async (msg) => {
  if (msg.chat.id !== ADMIN_ID)
    return bot.sendMessage(msg.chat.id, "⛔ Нет доступа");

  const users = await User.find().limit(10);

  let text = "👥 Пользователи:\n\n";

  users.forEach((u) => {
    text += `ID: ${u.telegram_id} | Уроки: ${u.lessons_available}\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

// debug
bot.on("message", (msg) => {
  console.log("ID:", msg.chat.id);
});