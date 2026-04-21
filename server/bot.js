const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");

const token = process.env.BOT_TOKEN;

if (!token) {
  console.log("❌ BOT_TOKEN не найден в .env");
  process.exit(1);
}

const ADMINS = [5560264800, 6395152471];
const User = require("./models/User");

let bot; // 👈 важно (глобальная переменная)

// 🔐 генерация токена
function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

function startBot() {
  bot = new TelegramBot(token, { polling: true });

  console.log("🤖 Бот запущен");

  // 📋 команды
  bot.setMyCommands([
    { command: "start", description: "👋 Старт" },
    { command: "add_user", description: "➕ Добавить пользователя" },
    { command: "add_lessons", description: "📚 Обновить уроки" },
    { command: "extend", description: "⏳ Продлить доступ" },
    { command: "block", description: "🚫 Заблокировать" },
    { command: "reset_token", description: "🔄 Сброс токена" },
    { command: "list_users", description: "👥 Список пользователей" }
  ]);

  // ❗ ОШИБКА POLLING → перезапуск
  bot.on("polling_error", async (err) => {
    console.log("❌ polling error:", err.message);

    try {
      await bot.stopPolling();
    } catch (e) { }

    setTimeout(() => {
      console.log("🔄 Перезапуск бота...");
      startBot();
    }, 5000);
  });

  // 👤 регистрация
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
    if (!ADMINS.includes(msg.chat.id))
      return bot.sendMessage(msg.chat.id, "⛔ Нет доступа");

    const [telegram_id, lessons, days] = match[1].split(" ");

    const tokenGen = generateToken();

    const link = `https://course-platform-alpha-three.vercel.app/access?token=${tokenGen}`;

    await User.findOneAndUpdate(
      { telegram_id },
      {
        telegram_id,
        token: tokenGen,
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
    if (!ADMINS.includes(msg.chat.id))
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
    if (!ADMINS.includes(msg.chat.id))
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
    if (!ADMINS.includes(msg.chat.id))
      return bot.sendMessage(msg.chat.id, "⛔ Нет доступа");

    const telegram_id = match[1];

    await User.updateOne(
      { telegram_id },
      { $set: { is_active: false } }
    );

    bot.sendMessage(msg.chat.id, "🚫 Заблокирован");
  });

  // 🔄 reset token
  bot.onText(/\/reset_token (.+)/, async (msg, match) => {
    if (!ADMINS.includes(msg.chat.id))
      return bot.sendMessage(msg.chat.id, "⛔ Нет доступа");

    const telegram_id = Number(match[1]);

    const user = await User.findOne({ telegram_id });

    if (!user) {
      return bot.sendMessage(msg.chat.id, "❌ Пользователь не найден");
    }

    // 🔥 создаём новый токен
    const newToken = generateToken();

    user.token = newToken;
    user.ip = null;
    user.device = null;

    await user.save();

    const link = `https://course-platform-alpha-three.vercel.app/access?token=${newToken}`;

    bot.sendMessage(msg.chat.id, "🔄 Токен обновлён");

    try {
      await bot.sendMessage(
        telegram_id,
        `🔐 Вам выдан новый доступ:\n\n${link}`
      );
    } catch (e) {
      console.log("❌ Не удалось отправить пользователю");
    }
  });

  // 👥 список пользователей
  bot.onText(/\/list_users/, async (msg) => {
    if (!ADMINS.includes(msg.chat.id))
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
}

// 🚀 Mongo + запуск
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB подключена (бот)");
    startBot();
  })
  .catch(err => console.log(err));


// 💥 ГЛОБАЛЬНЫЕ КРАШИ → перезапуск
process.on("uncaughtException", (err) => {
  console.log("💥 uncaughtException:", err);
  setTimeout(startBot, 5000);
});

process.on("unhandledRejection", (err) => {
  console.log("💥 unhandledRejection:", err);
  setTimeout(startBot, 5000);
});