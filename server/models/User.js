const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Telegram оставляем для управления через бота
    telegram_id: {
      type: Number,
      default: null,
      index: true,
    },

    // Данные ученика
    name: {
      type: String,
      default: "",
      trim: true,
    },
    // Номер телефона ученика
phone: {
  type: String,
  default: "",
  trim: true,
},

// Одноразовый код подтверждения,
// который пользователь получит через Telegram
verification_code: {
  type: String,
  default: null,
},

// До какого времени действует код
verification_code_expires_at: {
  type: Date,
  default: null,
},

// Подтверждён ли аккаунт кодом
is_verified: {
  type: Boolean,
  default: false,
},
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    // Здесь будет храниться НЕ пароль,
    // а его bcrypt-хэш
    password_hash: {
      type: String,
      default: null,
    },

    // Разрешён ли вход именно в мобильное приложение
    app_access: {
      type: Boolean,
      default: false,
    },
    multi_device_access: {
      type: Boolean,
      default: false,
    },
    // Старый token пока НЕ удаляем.
    // Он нужен, чтобы старая веб-система пока не сломалась.
    token: {
      type: String,
      default: null,
    },

    expires_at: {
      type: Date,
      default: null,
    },

    lessons_available: {
      type: Number,
      default: 0,
    },

    embassy_access: {
      type: Boolean,
      default: false,
    },

    // Поля старого web-доступа пока сохраняем
    ip: {
      type: String,
      default: null,
    },

    device: {
      type: String,
      default: null,
    },

    // Привязка мобильного приложения к устройству
    device_id: {
      type: String,
      default: null,
    },

    is_active: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);