const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const token = process.env.BOT_TOKEN;

if (!token) {
  console.log("❌ BOT_TOKEN не найден в .env");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const ADMINS = [5560264800, 7786879039];
// 6395152471
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
  { command: "unblock", description: "✅ Разблокировать" },
  { command: "reset_token", description: "🔄 Сброс токена" },
  { command: "list_users", description: "👥 Список пользователей" },
  { command: "cancel", description: "❌ Отмена" },
  { command: "add_user_app", description: "📱 Добавить пользователя приложения" },
  { command: "reset_token_app", description: "📱 Сбросить код приложения" },
  { command: "get_token", description: "🔑 Получить код приложения" },
  { command: "reset_device", description: "📱 Сбросить устройство" },
  { command: "embassy_access", description: "🏛 Открыть раздел Посольство" },
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
      if (!isNumber(text) || Number(text) <= 0) {
        return bot.sendMessage(
          msg.chat.id,
          "❗ Введите корректное количество дней"
        );
      }

      try {
        const tokenGen = generateToken();

        const link =
          `https://course-platform-alpha-three.vercel.app/access?token=${tokenGen}`;

        const expiresAt = new Date(
          Date.now() + Number(text) * 86400000
        );

        const user = await User.findOneAndUpdate(
          {
            telegram_id: state.telegram_id,
          },
          {
            $set: {
              telegram_id: state.telegram_id,
              token: tokenGen,
              lessons_available: state.lessons,
              expires_at: expiresAt,
              is_active: true,

              // Сбрасываем только привязку сайта
              ip: null,
              device: null,
            },
          },
          {
            upsert: true,
            returnDocument: "after",
            setDefaultsOnInsert: true,
          }
        );

        await bot.sendMessage(
          msg.chat.id,
          `✅ Пользователь сайта создан

👤 Telegram ID: ${user.telegram_id}
📚 Уроков: ${user.lessons_available}
📅 Доступ до: ${expiresAt.toLocaleDateString()}

🔗 Ссылка:
${link}`
        );

        try {
          await bot.sendMessage(
            state.telegram_id,
            `🎓 Ваш доступ открыт!

📌 Чтобы всё работало правильно:
Зажмите ссылку и выберите «Открыть в браузере» (Chrome / Safari).

${link}`
          );
        } catch (sendError) {
          console.log(
            "Не удалось отправить ссылку пользователю:",
            sendError.message
          );
        }

        delete states[msg.chat.id];
      } catch (error) {
        console.error(
          "ADD USER WEBSITE ERROR:",
          error
        );

        await bot.sendMessage(
          msg.chat.id,
          `❌ Ошибка создания пользователя сайта:

${error.message}`
        );

        delete states[msg.chat.id];
      }
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

  // ===== EMBASSY ACCESS =====

  if (state.action === "embassy_access") {

    if (!isNumber(text))
      return bot.sendMessage(
        msg.chat.id,
        "❗ Введите Telegram ID"
      );

    const telegram_id = Number(text);

    const user = await User.findOne({
      telegram_id,
    });

    if (!user) {
      delete states[msg.chat.id];

      return bot.sendMessage(
        msg.chat.id,
        "❌ Пользователь не найден"
      );
    }

    user.embassy_access = true;

    await user.save();

    bot.sendMessage(
      msg.chat.id,
      "✅ Доступ к разделу Посольство открыт"
    );

    try {
      await bot.sendMessage(
        telegram_id,
        "🏛 Вам открыт раздел «Подготовка к посольству»."
      );
    } catch { }

    delete states[msg.chat.id];
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
  // ===== UNBLOCK =====
  if (state.action === "unblock") {
    if (!isNumber(text)) return bot.sendMessage(msg.chat.id, "❗ Введите ID");

    await User.updateOne(
      { telegram_id: Number(text) },
      { $set: { is_active: true } }
    );

    bot.sendMessage(msg.chat.id, "✅ Пользователь разблокирован");

    try {
      await bot.sendMessage(
        Number(text),
        "🔓 Ваш доступ восстановлен. Можете снова пользоваться курсом 🎓"
      );
    } catch { }

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
      await bot.sendMessage(telegram_id, `🔐 Новый доступ:\n\n📌 Чтобы всё работало правильно:\nЗажмите ссылку и выберите “Открыть в браузере” (Chrome / Safari).\n\n${link}`);
    } catch { }

    delete states[msg.chat.id];
  }

  // ===== ADD USER APP =====
  if (state.action === "add_user_app") {

    // 1. Email зарегистрированного пользователя
    if (state.step === "email") {
      const email = text?.trim().toLowerCase();

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return bot.sendMessage(
          msg.chat.id,
          "❗ Введите корректный email"
        );
      }

      const user = await User.findOne({
        email,
      });

      if (!user) {
        return bot.sendMessage(
          msg.chat.id,
          `❌ Пользователь с email ${email} не найден.

Сначала ученик должен зарегистрироваться в приложении.`
        );
      }

      if (user.is_verified) {
        return bot.sendMessage(
          msg.chat.id,
          "❌ Этот аккаунт уже подтверждён."
        );
      }

      state.user_id = user._id.toString();
      state.email = user.email;
      state.name = user.name;
      state.phone = user.phone;

      state.step = "id";

      return bot.sendMessage(
        msg.chat.id,
        `👤 Пользователь найден:

Имя: ${user.name}
📞 Телефон: ${user.phone || "не указан"}
📧 Email: ${user.email}

Теперь введите Telegram ID ученика:`
      );
    }

    // 2. Telegram ID
    if (state.step === "id") {
      if (!isNumber(text)) {
        return bot.sendMessage(
          msg.chat.id,
          "❗ Введите корректный Telegram ID"
        );
      }

      const telegramId = Number(text);

      // Проверяем, не привязан ли этот Telegram
      // к другому аккаунту с email
      const telegramUser =
        await User.findOne({
          telegram_id: telegramId,
        });

      if (
        telegramUser &&
        telegramUser._id.toString() !== state.user_id
      ) {
        // Если у Telegram-пользователя уже есть полноценный
        // аккаунт с email — этот ID занят.
        if (telegramUser.email) {
          return bot.sendMessage(
            msg.chat.id,
            "❌ Этот Telegram ID уже привязан к другому аккаунту."
          );
        }

        // Если это пустая запись, автоматически созданная
        // ботом после /start, удаляем её.
        await User.deleteOne({
          _id: telegramUser._id,
        });
      }

      state.telegram_id = telegramId;
      state.step = "lessons";

      return bot.sendMessage(
        msg.chat.id,
        "📚 Сколько уроков открыть?"
      );
    }

    // 3. Количество уроков
    if (state.step === "lessons") {
      if (
        !isNumber(text) ||
        Number(text) < 0
      ) {
        return bot.sendMessage(
          msg.chat.id,
          "❗ Введите корректное количество уроков"
        );
      }

      state.lessons = Number(text);
      state.step = "days";

      return bot.sendMessage(
        msg.chat.id,
        "⏳ На сколько дней предоставить доступ?"
      );
    }

    // 4. Срок + создание кода подтверждения
    if (state.step === "days") {
      if (
        !isNumber(text) ||
        Number(text) <= 0
      ) {
        return bot.sendMessage(
          msg.chat.id,
          "❗ Введите корректное количество дней"
        );
      }

      try {
        const user =
          await User.findById(
            state.user_id
          );

        if (!user) {
          delete states[msg.chat.id];

          return bot.sendMessage(
            msg.chat.id,
            "❌ Пользователь больше не найден."
          );
        }

        // 6-значный одноразовый код
        const verificationCode =
          crypto.randomInt(
            100000,
            1000000
          ).toString();

        const expiresAt = new Date(
          Date.now() +
          Number(text) * 86400000
        );

        // Код действует 30 минут
        const codeExpiresAt = new Date(
          Date.now() +
          30 * 60 * 1000
        );

        user.telegram_id =
          state.telegram_id;

        user.lessons_available =
          state.lessons;

        user.expires_at =
          expiresAt;

        // Доступ окончательно откроем
        // после ввода кода в приложении
        user.app_access = false;
        user.is_active = false;
        user.is_verified = false;

        user.verification_code =
          verificationCode;

        user.verification_code_expires_at =
          codeExpiresAt;

        user.device_id = null;

        await user.save();

        await bot.sendMessage(
          msg.chat.id,
          `✅ Пользователь подготовлен

👤 Имя: ${user.name}
📞 Телефон: ${user.phone || "не указан"}
📧 Email: ${user.email}
🆔 Telegram ID: ${user.telegram_id}
📚 Уроков: ${user.lessons_available}
📅 Доступ до: ${expiresAt.toLocaleDateString()}

🔐 Код подтверждения:
<code>${verificationCode}</code>

⏱ Код действует 30 минут.`,
          {
            parse_mode: "HTML",
          }
        );

        try {
          await bot.sendMessage(
            state.telegram_id,
            `🎓 Step to Korea

Ваш аккаунт подготовлен.

🔐 Код подтверждения:
<code>${verificationCode}</code>

Введите этот код в приложении Step to Korea.

⏱ Код действует 30 минут.`,
            {
              parse_mode: "HTML",
            }
          );
        } catch (error) {
          console.log(
            "Не удалось отправить код ученику:",
            error.message
          );

          await bot.sendMessage(
            msg.chat.id,
            "⚠️ Аккаунт подготовлен, но бот не смог отправить код ученику. Убедитесь, что ученик сначала написал /start этому боту."
          );
        }

        delete states[msg.chat.id];
      } catch (error) {
        console.log(
          "ADD USER APP ERROR:",
          error
        );

        await bot.sendMessage(
          msg.chat.id,
          "❌ Ошибка при подготовке пользователя"
        );

        delete states[msg.chat.id];
      }
    }
  }
  // ===== RESET TOKEN APP =====
  if (state.action === "reset_token_app") {

    if (!isNumber(text))
      return bot.sendMessage(msg.chat.id, "❗ Введите ID");

    const telegram_id = Number(text);

    const user = await User.findOne({
      telegram_id,
    });

    if (!user) {
      delete states[msg.chat.id];
      return bot.sendMessage(
        msg.chat.id,
        "❌ Пользователь не найден"
      );
    }

    const newToken = generateToken();

    user.token = newToken;

    await user.save();

    bot.sendMessage(
      msg.chat.id,
      "🔄 Код приложения обновлён"
    );

    try {
      await bot.sendMessage(
        telegram_id,
        `🔑 Новый код доступа:\n\n<code>${newToken}</code>\n\nВведите его в приложении.`,
        {
          parse_mode: "HTML",
        }
      );
    } catch { }

    delete states[msg.chat.id];
  }
  // ===== RESET DEVICE =====
  if (state.action === "reset_device") {

    if (!isNumber(text))
      return bot.sendMessage(
        msg.chat.id,
        "❗ Введите Telegram ID"
      );

    const telegram_id = Number(text);

    const user = await User.findOne({
      telegram_id,
    });

    if (!user) {
      delete states[msg.chat.id];

      return bot.sendMessage(
        msg.chat.id,
        "❌ Пользователь не найден"
      );
    }

    user.device_id = null;

    await user.save();

    bot.sendMessage(
      msg.chat.id,
      "✅ Устройство отвязано"
    );

    try {
      await bot.sendMessage(
        telegram_id,
        "📱 Привязка устройства сброшена. Теперь вы можете войти с нового телефона."
      );
    } catch { }

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

bot.onText(/\/embassy_access$/, (msg) => {
  startAction(
    msg,
    "embassy_access",
    "👤 Введите Telegram ID:"
  );
});

bot.onText(/\/extend$/, (msg) => {
  startAction(msg, "extend", "👤 Введите Telegram ID:");
});

bot.onText(/\/block$/, (msg) => {
  startAction(msg, "block", "👤 Введите Telegram ID:");
});

bot.onText(/\/unblock$/, (msg) => {
  startAction(msg, "unblock", "👤 Введите Telegram ID:");
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

// мобильные команды
bot.onText(/\/get_token/, async (msg) => {
  const telegram_id = Number(msg.chat.id);

  const user = await User.findOne({ telegram_id });

  if (!user || !user.token) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ Код доступа не найден"
    );
  }

  bot.sendMessage(
    msg.chat.id,
    `🔑 Ваш код доступа:\n\n<code>${user.token}</code>\n\nВведите его в приложении.`,
    {
      parse_mode: "HTML",
    }
  );
});

bot.onText(/\/add_user_app$/, (msg) => {
  startAction(
    msg,
    "add_user_app",
    "📧 Введите email зарегистрированного ученика:"
  );

  states[msg.chat.id].step = "email";
});

bot.onText(/\/reset_token_app$/, (msg) => {
  startAction(
    msg,
    "reset_token_app",
    "👤 Введите Telegram ID:"
  );
});

bot.onText(/\/reset_device$/, (msg) => {
  startAction(
    msg,
    "reset_device",
    "👤 Введите Telegram ID:"
  );
});