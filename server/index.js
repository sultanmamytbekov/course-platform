require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Lesson = require("./models/Lesson");
const UserProgress = require("./models/UserProgress");
const Settings = require("./models/Settings");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB подключена"))
  .catch(err => console.log(err));
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.post("/admin-login", (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    console.log("Вход в ADMIN");

    return res.json({
      success: "admin",
    });
  }

  if (password === process.env.VIDEO_PASSWORD) {
    console.log("Вход в VIDEOS");

    return res.json({
      success: "videos",
    });
  }

  // ТРЕТИЙ КОД — управление всеми видео
  if (password === "Temirlan08") {
    console.log("Вход в VIDEO SETTINGS");

    return res.json({
      success: "settings",
    });
  }

  console.log("НЕВЕРНЫЙ ПАРОЛЬ");

  return res.json({
    success: false,
  });
});

app.get("/", (req, res) => {
  res.send("🚀 API работает");
});

// render
app.get("/ping", (req, res) => {
  res.send("pong");
});

app.get("/settings", async (req, res) => {
  try {
    let settings = await Settings.findOne({ name: "global" });

    if (!settings) {
      settings = await Settings.create({
        name: "global",
        videos_enabled: true,
      });
    }

    res.json(settings);
  } catch (error) {
    console.error("Settings error:", error);

    res.status(500).json({
      error: "Ошибка получения настроек",
    });
  }
});
app.post("/settings/videos", async (req, res) => {
  try {
    const { password, videos_enabled } = req.body;

    // Тот же третий секретный код
    if (password !== "Temirlan08") {
      return res.status(403).json({
        success: false,
        message: "Нет доступа",
      });
    }

    if (typeof videos_enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Неверное значение",
      });
    }

    const settings = await Settings.findOneAndUpdate(
      {
        name: "global",
      },
      {
        videos_enabled,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json({
      success: true,
      videos_enabled: settings.videos_enabled,
    });
  } catch (error) {
    console.error("Ошибка изменения настроек:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
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
app.post("/access/verify", async (req, res) => {
  try {
    const { token, device_id } = req.body;

    const user = await User.findOne({ token });

    if (!user) {
      return res.json({
        success: false,
        message: "Неверный код доступа",
      });
    }

    if (!user.is_active) {
      return res.json({
        success: false,
        message: "Доступ заблокирован",
      });
    }

    if (
      user.expires_at &&
      new Date() > new Date(user.expires_at)
    ) {
      return res.json({
        success: false,
        message: "Срок доступа истёк",
      });
    }
    // первое устройство
    if (!user.device_id) {
      user.device_id = device_id;
      await user.save();
    }
    // другое устройство
    else if (user.device_id !== device_id) {
      return res.json({
        success: false,
        message:
          "Этот код уже используется на другом устройстве",
      });
    }

    return res.json({
      success: true,
      telegram_id: user.telegram_id,
      lessons_available: user.lessons_available,
      embassy_access: user.embassy_access,
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});
// ===== APP REGISTER =====
app.post("/app/register", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
    } = req.body;

    // Проверяем обязательные поля
    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Заполните все поля",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedName =
      name.trim();

    const normalizedPhone =
      phone.trim();

    // Простая проверка email
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Введите корректный email",
      });
    }

    // Минимальная длина пароля
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Пароль должен содержать минимум 6 символов",
      });
    }

    // Проверяем, существует ли такой email
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Аккаунт с таким email уже существует",
      });
    }

    // Хэшируем пароль
    const passwordHash =
      await bcrypt.hash(password, 12);

    // Создаём аккаунт без доступа.
    // Доступ позже выдаст администратор.
    const user = await User.create({
      name: normalizedName,
      phone: normalizedPhone,
      email: normalizedEmail,

      password_hash: passwordHash,

      telegram_id: null,

      app_access: false,
      is_active: false,
      is_verified: false,

      lessons_available: 0,
      expires_at: null,
      embassy_access: false,

      device_id: null,
      multi_device_access: false,

      verification_code: null,
      verification_code_expires_at: null,
    });

    return res.status(201).json({
      success: true,
      message:
        "Регистрация успешна. Ожидайте подтверждения администратора.",

      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        is_verified: user.is_verified,
      },
    });
  } catch (error) {
    console.error(
      "APP REGISTER ERROR:",
      error
    );

    // На случай ошибки unique index MongoDB
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Аккаунт с таким email уже существует",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});
// ===== APP RESEND VERIFICATION CODE =====
app.post("/app/resend-verification-code",async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email не указан",
        });
      }

      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      const user = await User.findOne({
        email: normalizedEmail,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Пользователь не найден",
        });
      }

      // Аккаунт уже подтверждён
      if (user.is_verified) {
        return res.status(400).json({
          success: false,
          message:
            "Аккаунт уже подтверждён",
        });
      }

      // Администратор ещё не одобрил регистрацию
      if (
        !user.telegram_id ||
        !user.expires_at ||
        !user.lessons_available
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Регистрация ещё не одобрена администратором",
        });
      }

      // Не выдаём новый код, пока старый ещё действует
      if (
        user.verification_code &&
        user.verification_code_expires_at &&
        new Date(
          user.verification_code_expires_at
        ) > new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Текущий код ещё действует",
          code_expires_at:
            user.verification_code_expires_at,
        });
      }

      // Символы без похожих 0/O и 1/I
      const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

      let verificationCode = "";

      for (let i = 0; i < 5; i++) {
        verificationCode +=
          chars[
            crypto.randomInt(
              0,
              chars.length
            )
          ];
      }

      // Новый код действует 30 минут
      const codeExpiresAt = new Date(
        Date.now() + 30 * 60 * 1000
      );

      user.verification_code =
        verificationCode;

      user.verification_code_expires_at =
        codeExpiresAt;

      await user.save();

      try {
        await bot.sendMessage(
          user.telegram_id,
          `🎓 Step to Korea

🔐 Ваш новый код подтверждения:
<code>${verificationCode}</code>

Введите этот код в приложении.

⏱ Код действует 30 минут.`,
          {
            parse_mode: "HTML",
          }
        );
      } catch (telegramError) {
        console.error(
          "RESEND TELEGRAM ERROR:",
          telegramError
        );

        // Если Telegram не получил сообщение,
        // отменяем созданный код.
        user.verification_code = null;
        user.verification_code_expires_at =
          null;

        await user.save();

        return res.status(500).json({
          success: false,
          message:
            "Не удалось отправить код в Telegram",
        });
      }

      return res.json({
        success: true,
        message:
          "Новый код отправлен в Telegram",
        code_expires_at:
          codeExpiresAt,
      });
    } catch (error) {
      console.error(
        "RESEND VERIFICATION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Ошибка сервера",
      });
    }
  }
);
// ===== APP REGISTRATION STATUS =====
app.get("/app/registration-status", async (req, res) => {
  try {
    const email = String(
      req.query.email || ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email не указан",
      });
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    const codeReady = Boolean(
      user.verification_code &&
      user.verification_code_expires_at &&
      new Date(
        user.verification_code_expires_at
      ) > new Date()
    );

    return res.json({
      success: true,

      // Аккаунт уже полностью подтверждён
      verified: Boolean(
        user.is_verified
      ),

      // Администратор уже выдал первый код
      approved: Boolean(
        user.telegram_id &&
        user.verification_code
      ),

      // Код существует и ещё не истёк
      code_ready: codeReady,

      code_expires_at:
        user.verification_code_expires_at ||
        null,
    });
  } catch (error) {
    console.error(
      "REGISTRATION STATUS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});
// ===== APP VERIFY =====
app.post("/app/verify", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Введите email и код подтверждения",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const verificationCode =
  String(code).trim().toUpperCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: "Аккаунт уже подтверждён",
      });
    }

    if (!user.verification_code) {
      return res.status(400).json({
        success: false,
        message:
          "Код подтверждения ещё не выдан. Обратитесь к администратору.",
      });
    }

    if (
      !user.verification_code_expires_at ||
      new Date() >
        new Date(
          user.verification_code_expires_at
        )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Срок действия кода истёк. Обратитесь к администратору.",
      });
    }

    if (
      user.verification_code !==
      verificationCode
    ) {
      return res.status(400).json({
        success: false,
        message: "Неверный код подтверждения",
      });
    }

    // Код правильный — активируем аккаунт
    user.is_verified = true;
    user.app_access = true;
    user.is_active = true;

    // Одноразовый код больше не нужен
    user.verification_code = null;
    user.verification_code_expires_at =
      null;

    await user.save();

    return res.json({
      success: true,
      message:
        "Аккаунт успешно подтверждён. Теперь вы можете войти.",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        lessons_available:
          user.lessons_available,
        expires_at: user.expires_at,
        embassy_access:
          user.embassy_access,
      },
    });
  } catch (error) {
    console.error(
      "APP VERIFY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});
// ===== APP LOGIN ===== 
app.post("/app/login", async (req, res) => {
  try {
    const {
      email,
      password,
      device_id,
    } = req.body;

    // Проверка данных
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Введите email и пароль",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    // Ищем пользователя
    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Неверный email или пароль",
      });
    }

    // Есть ли пароль у пользователя
    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        message: "Неверный email или пароль",
      });
    }

    // Проверяем пароль
    const passwordCorrect =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!passwordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Неверный email или пароль",
      });
    }

    // Разрешён ли доступ к приложению
    if (!user.app_access) {
      return res.status(403).json({
        success: false,
        message:
          "Для этого аккаунта доступ к приложению не открыт",
      });
    }

    // Заблокирован ли пользователь
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Ваш аккаунт заблокирован",
      });
    }

    // Проверяем срок
    if (
      user.expires_at &&
      new Date() > new Date(user.expires_at)
    ) {
      return res.status(403).json({
        success: false,
        message: "Срок доступа истёк",
      });
    }

    // Проверяем устройство
    if (!user.multi_device_access && device_id) {
      if (!user.device_id) {
        user.device_id = device_id;
        await user.save();
      } else if (user.device_id !== device_id) {
        return res.status(403).json({
          success: false,
          message:
            "Этот аккаунт уже используется на другом устройстве. Обратитесь к администратору.",
        });
      }
    }

    // Создаём JWT
    const accessToken = jwt.sign(
      {
        user_id: user._id.toString(),
        telegram_id: user.telegram_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    return res.json({
      success: true,

      access_token: accessToken,

      user: {
        id: user._id,
        telegram_id: user.telegram_id,
        name: user.name,
        email: user.email,
        lessons_available:
          user.lessons_available,
        expires_at: user.expires_at,
        embassy_access:
          user.embassy_access,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error(
      "APP LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});
// ===== APP ME =====
app.get("/app/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Нет токена авторизации",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Сессия недействительна",
      });
    }

    const user = await User.findById(
      decoded.user_id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    if (!user.app_access) {
      return res.status(403).json({
        success: false,
        message:
          "Доступ к приложению отключён",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Аккаунт заблокирован",
      });
    }

    if (
      user.expires_at &&
      new Date() > new Date(user.expires_at)
    ) {
      return res.status(403).json({
        success: false,
        message: "Срок доступа истёк",
      });
    }

    return res.json({
      success: true,

      user: {
        id: user._id,
        telegram_id: user.telegram_id,
        name: user.name,
        email: user.email,
        lessons_available:
          user.lessons_available,
        expires_at: user.expires_at,
        embassy_access:
          user.embassy_access,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error(
      "APP ME ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});
app.get("/user/:telegram_id", async (req, res) => {
  try {
    const user = await User.findOne({
      telegram_id: Number(req.params.telegram_id),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    return res.json({
      success: true,
      telegram_id: user.telegram_id,
      lessons_available: user.lessons_available,
      embassy_access: user.embassy_access,
      expires_at: user.expires_at,
      is_active: user.is_active,
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});

app.post("/reset-device", async (req, res) => {
  const { telegram_id } = req.body;

  const user = await User.findOne({
    telegram_id,
  });

  if (!user) {
    return res.json({
      success: false,
    });
  }

  user.device_id = null;

  await user.save();

  res.json({
    success: true,
  });
});

app.get("/user-progress/:telegram_id", async (req, res) => {
  try {
    let progress = await UserProgress.findOne({
      telegram_id: Number(req.params.telegram_id),
    });

    if (!progress) {
      progress = await UserProgress.create({
        telegram_id: Number(req.params.telegram_id),
      });
    }

    res.json(progress);
  } catch (error) {
    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});

app.post("/save-progress", async (req, res) => {
  try {
    const {
      telegram_id,
      favorites,
      bookmarks,
      watched_lessons,
      last_lesson,
    } = req.body;

    const progress =
      await UserProgress.findOneAndUpdate(
        {
          telegram_id,
        },
        {
          favorites,
          bookmarks,
          watched_lessons,
          last_lesson,
        },
        {
          upsert: true,
          new: true,
        }
      );

    res.json(progress);
  } catch (error) {
    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});
// ===== APP USER PROGRESS =====
app.get("/app/progress", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Нет авторизации",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Сессия недействительна",
      });
    }

    const user = await User.findById(
      decoded.user_id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    if (!user.app_access || !user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Нет доступа",
      });
    }

    if (
      user.expires_at &&
      new Date() > new Date(user.expires_at)
    ) {
      return res.status(403).json({
        success: false,
        message: "Срок доступа истёк",
      });
    }

    let progress = await UserProgress.findOne({
      telegram_id: user.telegram_id,
    });

    if (!progress) {
      progress = await UserProgress.create({
        telegram_id: user.telegram_id,
      });
    }

    return res.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error(
      "APP PROGRESS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});


// ===== APP SAVE PROGRESS =====
app.post("/app/progress", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Нет авторизации",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Сессия недействительна",
      });
    }

    const user = await User.findById(
      decoded.user_id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    if (!user.app_access || !user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Нет доступа",
      });
    }

    if (
      user.expires_at &&
      new Date() > new Date(user.expires_at)
    ) {
      return res.status(403).json({
        success: false,
        message: "Срок доступа истёк",
      });
    }

    const {
      favorites = [],
      bookmarks = [],
      watched_lessons = [],
      last_lesson = null,
    } = req.body;

    const progress =
      await UserProgress.findOneAndUpdate(
        {
          telegram_id: user.telegram_id,
        },
        {
          $set: {
            favorites,
            bookmarks,
            watched_lessons,
            last_lesson,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

    return res.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error(
      "APP SAVE PROGRESS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
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
    let settings = await Settings.findOne({
      name: "global",
    });

    if (!settings) {
      settings = await Settings.create({
        name: "global",
        videos_enabled: true,
      });
    }

    const lessons = await Lesson.find()
      .sort({ lesson_number: 1 })
      .lean();

    const result = lessons.map((lesson) => ({
      ...lesson,

      // Когда видео выключены, сервер вообще не отправляет ссылку
      video_url: settings.videos_enabled
        ? lesson.video_url
        : null,
    }));

    res.json(result);
  } catch (error) {
    console.error("Lessons error:", error);

    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});
// ===== APP LESSONS =====
app.get("/app/lessons", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Нет авторизации",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Сессия недействительна",
      });
    }

    const user = await User.findById(
      decoded.user_id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    if (!user.app_access || !user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Нет доступа",
      });
    }

    if (
      user.expires_at &&
      new Date() > new Date(user.expires_at)
    ) {
      return res.status(403).json({
        success: false,
        message: "Срок доступа истёк",
      });
    }

    let settings = await Settings.findOne({
      name: "global",
    });

    if (!settings) {
      settings = await Settings.create({
        name: "global",
        videos_enabled: true,
      });
    }

    const lessons = await Lesson.find()
      .sort({ lesson_number: 1 })
      .lean();

    // Отдаем только доступное пользователю количество уроков
    const availableLessons = lessons.filter(
      (lesson) =>
        lesson.lesson_number <=
        user.lessons_available
    );

    const result = availableLessons.map(
      (lesson) => ({
        ...lesson,

        video_url: settings.videos_enabled
          ? lesson.video_url
          : null,
      })
    );

    return res.json(result);
  } catch (error) {
    console.error(
      "APP LESSONS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});

// require("./bot");
const bot = require("./bot");


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