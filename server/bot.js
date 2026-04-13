const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const mongoose = require("mongoose");
const token = "8784087541:AAEyUSGkfBka52HrapdpwaLMsF5UHYtszoc";
const bot = new TelegramBot(token, { polling: true });
const ADMIN_ID = 5560264800; // твой ID
const User = require("./models/User");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB подключена (бот)"))
  .catch(err => console.log(err));

bot.on("message", async (msg) => {
  const telegram_id = msg.chat.id;

  let user = await User.findOne({ telegram_id });

  if (!user) {
    await User.create({
      telegram_id,
      token: null,
      expires_at: null,
      lessons_available: 0,
      ip: null,
      device: null,
      is_active: false,
    });

    console.log("Новый пользователь:", telegram_id);
  }
});

// команды бота
const userState = {};
bot.setMyCommands([
  { command: "start", description: "👋 Старт бота" },
  { command: "list_users", description: "👥 Список пользователей (admin)" },
  { command: "add_user", description: "➕ Добавить пользователя (admin)" },
  { command: "add_lessons", description: "📚 Добавить уроки (admin)" },
  { command: "extend", description: "⏳ Продлить доступ (admin)" },
  { command: "block", description: "🚫 Заблокировать пользователя (admin)" },
  { command: "help", description: "ℹ️ Помощь" }
]);

// 🔹 старт
bot.onText(/\/start/, async (msg) => {
  const telegram_id = msg.chat.id;

  bot.sendMessage(
    msg.chat.id,
    `👋 Добро пожаловать!\n\nВаш ID: ${telegram_id}\n\nОтправьте этот ID менеджеру для получения доступа`
  );
});

// 🔹 список пользователей
bot.onText(/\/list_users/, async (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;

  const users = await User.find().limit(10);

  let text = "👥 Пользователи:\n\n";

  users.forEach((u) => {
    text += `ID: ${u.telegram_id} | Уроки: ${u.lessons_available}\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

// 🔹 добавить пользователя
bot.onText(/\/add_user (.+)/, async (msg, match) => {
    if (msg.chat.id !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "⛔ У тебя нет доступа");
    }
    const chatId = msg.chat.id;

    const [telegram_id, lessons, days] = match[1].split(" ");

    const res = await fetch("http://localhost:5000/create-user", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            telegram_id,
            lessons: Number(lessons),
            days: Number(days),
        }),
    });

    const data = await res.json();

    // отправляем тебе
    bot.sendMessage(chatId, `✅ Пользователь создан\nОтправляю клиенту...`);

    // отправляем клиенту
    bot.sendMessage(telegram_id, `🎓 Вам открыт доступ к курсу:\n\n${data.link}`);
});

// 🔹 добавить уроки
bot.onText(/\/add_lessons (.+)/, async (msg, match) => {
    if (msg.chat.id !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "⛔ У тебя нет доступа");
    }
    const chatId = msg.chat.id;
    const [telegram_id, lessons] = match[1].split(" ");

    const res = await fetch("http://localhost:5000/add-lessons", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            telegram_id,
            lessons: Number(lessons),
        }),
    });

    const data = await res.json();

    bot.sendMessage(chatId, "✅ Уроки обновлены");
});

// 🔹 продлить
bot.onText(/\/extend (.+)/, async (msg, match) => {
    if (msg.chat.id !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "⛔ У тебя нет доступа");
    }
    const chatId = msg.chat.id;
    const [telegram_id, days] = match[1].split(" ");

    await fetch("http://localhost:5000/extend", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            telegram_id,
            days: Number(days),
        }),
    });

    bot.sendMessage(chatId, "⏳ Доступ продлён");
});

// 🔹 блок
bot.onText(/\/block (.+)/, async (msg, match) => {
    if (msg.chat.id !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "⛔ У тебя нет доступа");
    }
    const chatId = msg.chat.id;
    const telegram_id = match[1];

    await fetch("http://localhost:5000/block", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            telegram_id: Number(telegram_id),
        }),
    });

    bot.sendMessage(chatId, "🚫 Пользователь заблокирован");
});

// bot.on("message", (msg) => {
//   console.log("ID:", msg.chat.id);
// });
bot.on("message", (msg) => {
    console.log("ТВОЙ ID:", msg.chat.id);
});