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

const ADMINS = [5560264800, 6395152471];
const User = require("./models/User");

// 🧠 состояния
const states = {};

// Mongo
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB подключена (бот)"))
  .catch(err => console.log(err));

// 🔐 генерация токена
function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

// 📋 команды
bot.setMyCommands([
  { command: "start", description: "👋 Старт" },
  { command: "add_user", description: "➕ Добавить пользователя" },
  { command: "add_lessons", description: "📚 Обновить уроки" },
  { command: "extend", description: "⏳ Продлить доступ" },
  { command: "block", description: "🚫 Заблокировать" },
  { command: "reset_token", description: "🔄 Сброс токена" },
  { command: "list_users", description: "👥 Список пользователей" },
  { command: "cancel", description: "❌ Отмена" }
]);

// ❌ отмена
bot.onText(/\/cancel/, (msg) => {
  delete states[msg.chat.id];
  bot.sendMessage(msg.chat.id, "❌ Действие отменено");
});

// 👤 регистрация
bot.on("message", async (msg) => {
  const telegram_id = Number(msg.chat.id);

  let user = await User.findOne({ telegram_id });

  if (!user) {
    await User.create({
      telegram_id,
      token: null,
      lessons_available: 0,
      expires_at: null,
      is_active: false,
    });
  }

  // 👉 если нет состояния — выходим
  if (!states[msg.chat.id]) return;

  const state = states[msg.chat.id];
  const text = msg.text;

  // 🔐 проверка числа
  const isNumber = (v) => !isNaN(Number(v));

  // ===== ADD USER =====
  if (state.action === "add_user") {
    if (state.step === "id") {
      if (!isNumber(text)) return bot.sendMessage(msg.chat.id, "❗ Введите число");

      state.telegram_id = Number(text);
      state.step = "lessons";
      return bot.sendMessage(msg.chat.id, "📚 Сколько уроков?");
    }

    if (state.step === "lessons") {
      if (!isNumber(text)) return bot.sendMessage(msg.chat.id, "❗ Введите число");

      state.lessons = Number(text);
      state.step = "days";
      return bot.sendMessage(msg.chat.id, "⏳ На сколько дней?");
    }

    if (state.step === "days") {
      if (!isNumber(text)) return bot.sendMessage(msg.chat.id, "❗ Введите число");

      const tokenGen = generateToken();
      const link = `https://course-platform-alpha-three.vercel.app/access?token=${tokenGen}`;

      await User.findOneAndUpdate(
        { telegram_id: state.telegram_id },
        {
          telegram_id: state.telegram_id,
          token: tokenGen,
          lessons_available: state.lessons,
          expires_at: new Date(Date.now() + Number(text) * 86400000),
          is_active: true,
        },
        { upsert: true }
      );

      bot.sendMessage(msg.chat.id, "✅ Пользователь создан");

      try {
        await bot.sendMessage(state.telegram_id, `🎓 Доступ:\n\n${link}`);
      } catch {}

      delete states[msg.chat.id];
    }
  }

  // ===== ADD LESSONS =====
  if (state.action === "add_lessons") {
    if (state.step === "id") {
      if (!isNumber(text)) return bot.sendMessage(msg.chat.id, "❗ Введите ID");

      state.telegram_id = Number(text);
      state.step = "lessons";
      return bot.sendMessage(msg.chat.id, "📚 Сколько уроков?");
    }

    if (state.step === "lessons") {
      if (!isNumber(text)) return bot.sendMessage(msg.chat.id, "❗ Введите число");

      await User.updateOne(
        { telegram_id: state.telegram_id },
        { $set: { lessons_available: Number(text) } }
      );

      bot.sendMessage(msg.chat.id, "✅ Уроки обновлены");
      delete states[msg.chat.id];
    }
  }

  // ===== EXTEND =====
  if (state.action === "extend") {
    if (state.step === "id") {
      if (!isNumber(text)) return bot.sendMessage(msg.chat.id, "❗ Введите ID");

      state.telegram_id = Number(text);
      state.step = "days";
      return bot.sendMessage(msg.chat.id, "⏳ На сколько дней?");
    }

    if (state.step === "days") {
      if (!isNumber(text)) return bot.sendMessage(msg.chat.id, "❗ Введите число");

      await User.updateOne(
        { telegram_id: state.telegram_id },
        {
          $set: {
            expires_at: new Date(Date.now() + Number(text) * 86400000),
          },
        }
      );

      bot.sendMessage(msg.chat.id, "⏳ Продлено");
      delete states[msg.chat.id];
    }
  }

  // ===== BLOCK =====
  if (state.action === "block") {
    if (!isNumber(text)) return bot.sendMessage(msg.chat.id, "❗ Введите ID");

    await User.updateOne(
      { telegram_id: Number(text) },
      { $set: { is_active: false } }
    );

    bot.sendMessage(msg.chat.id, "🚫 Заблокирован");
    delete states[msg.chat.id];
  }

  // ===== RESET TOKEN =====
  if (state.action === "reset_token") {
    if (!isNumber(text)) return bot.sendMessage(msg.chat.id, "❗ Введите ID");

    const telegram_id = Number(text);

    const user = await User.findOne({ telegram_id });

    if (!user) {
      delete states[msg.chat.id];
      return bot.sendMessage(msg.chat.id, "❌ Пользователь не найден");
    }

    const newToken = generateToken();

    user.token = newToken;
    user.ip = null;
    user.device = null;

    await user.save();

    const link = `https://course-platform-alpha-three.vercel.app/access?token=${newToken}`;

    bot.sendMessage(msg.chat.id, "🔄 Токен обновлён");

    try {
      await bot.sendMessage(telegram_id, `🔐 Новый доступ:\n\n${link}`);
    } catch {}

    delete states[msg.chat.id];
  }
});

// ===== СТАРТ КОМАНД =====

function startAction(msg, action, question) {
  if (!ADMINS.includes(msg.chat.id))
    return bot.sendMessage(msg.chat.id, "⛔ Нет доступа");

  states[msg.chat.id] = { action, step: "id" };
  bot.sendMessage(msg.chat.id, question + "\n\n(/cancel для отмены)");
}

bot.onText(/\/add_user$/, (msg) => {
  startAction(msg, "add_user", "👤 Введите Telegram ID:");
});

bot.onText(/\/add_lessons$/, (msg) => {
  startAction(msg, "add_lessons", "👤 Введите Telegram ID:");
});

bot.onText(/\/extend$/, (msg) => {
  startAction(msg, "extend", "👤 Введите Telegram ID:");
});

bot.onText(/\/block$/, (msg) => {
  startAction(msg, "block", "👤 Введите Telegram ID:");
});

bot.onText(/\/reset_token$/, (msg) => {
  startAction(msg, "reset_token", "👤 Введите Telegram ID:");
});

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `👋 Добро пожаловать!\n\nВаш ID: <code>${msg.chat.id}</code>`,
    { parse_mode: "HTML" }
  );
});

// список
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