"use client";

import { useEffect, useState } from "react";

export default function AccessPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const [openAdmin, setOpenAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [tapCount, setTapCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const [openSection, setOpenSection] = useState<number | null>(0);
  const [currentLesson, setCurrentLesson] = useState(0);

  const [videosEnabled, setVideosEnabled] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [openVideoSettings, setOpenVideoSettings] = useState(false);
  const [changingVideoSettings, setChangingVideoSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  // 📡 загрузка курса
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setError("Нет токена");
      setLoading(false);
      return;
    }

    fetch(`https://course-platform-api-9hcf.onrender.com/check-access?token=${token}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res);
      })
      .catch(() => setError("Ошибка сервера"))
      .finally(() => setLoading(false));

  }, []);
  useEffect(() => {
    fetch(
      "https://course-platform-api-9hcf.onrender.com/settings"
    )
      .then((res) => res.json())
      .then((result) => {
        setVideosEnabled(
          result.videos_enabled === true
        );
      })
      .catch(() => {
        setVideosEnabled(false);
      })
      .finally(() => {
        setSettingsLoading(false);
      });
  }, []);
  // 🔥 hotkey
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "a") {
        setOpenAdmin(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);

  }, []);

  const check = async () => {
    try {
      setSettingsMessage("");

      const res = await fetch(
        "https://course-platform-api-9hcf.onrender.com/admin-login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        }
      );

      const result = await res.json();
      console.log("Ответ admin-login:", result);
      if (result.success === "admin") {
        localStorage.setItem("admin", "true");
        window.location.href = "/admin";
        return;
      }

      if (result.success === "videos") {
        localStorage.setItem("videos", "true");
        window.location.href = "/admin/videos";
        return;
      }

      if (result.success === "settings") {
        setOpenAdmin(false);
        setOpenVideoSettings(true);
        setSettingsMessage("");
        return;
      }

      setSettingsMessage("Неверный пароль");
    } catch (error) {
      setSettingsMessage("Ошибка подключения к серверу");
    }
  };
  const changeVideosEnabled = async () => {
    if (changingVideoSettings) return;

    const newValue = !videosEnabled;

    try {
      setChangingVideoSettings(true);
      setSettingsMessage("");

      const res = await fetch(
        "https://course-platform-api-9hcf.onrender.com/settings/videos",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
            videos_enabled: newValue,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        setSettingsMessage(
          result.message || "Не удалось изменить настройку"
        );
        return;
      }

      setVideosEnabled(result.videos_enabled);

      setSettingsMessage(
        result.videos_enabled
          ? "Все видео включены"
          : "Все видео выключены"
      );
    } catch (error) {
      setSettingsMessage("Ошибка соединения с сервером");
    } finally {
      setChangingVideoSettings(false);
    }
  };
  // 📚 данные уроков (пример)
  const [lessonsData, setLessonsData] = useState<any>({});
  // const lessonsData: Record<number, { title: string; video: string }> = {
  //   1: { title: "Введение", video: "https://player.vimeo.com/video/1181448162" },
  //   2: { title: "Алфавит", video: "https://player.vimeo.com/video/1181448162" },
  //   3: { title: "Простые слова", video: "https://player.vimeo.com/video/1181448162" },
  //   4: { title: "Числа", video: "https://player.vimeo.com/video/1181448162" },
  //   5: { title: "Цвета", video: "https://player.vimeo.com/video/1181448162" },
  //   6: { title: "Семья", video: "https://player.vimeo.com/video/1181448162" },
  // };
  useEffect(() => {
    fetch("https://course-platform-api-9hcf.onrender.com/lessons")
      .then((res) => res.json())
      .then((data) => {
        const map: any = {};
        data.forEach((l: any) => {
          map[l.lesson_number] = {
            title: l.title,
            video: l.video_url,
            section: l.section,
          };
        });
        setLessonsData(map);
      })
      .catch(() => {
        console.log("Lessons load error");
      });
  }, []);

  useEffect(() => {
    const block = (e: { preventDefault: () => any; }) => e.preventDefault();

    document.addEventListener("contextmenu", block);

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "PrintScreen" ||
        (e.ctrlKey && ["s", "u", "p"].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
      }
    });

    return () => {
      document.removeEventListener("contextmenu", block);
    };
  }, []);

  // https://vimeo.com/1181447908
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7ff] flex items-center justify-center">

        <div className="flex flex-col items-center gap-6">

          {/* КРУГ */}
          <div className="relative w-16 h-16">

            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>

            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>

          </div>

          {/* ТЕКСТ */}
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-800">
              Загрузка курса
            </h2>
            <p className="text-sm text-gray-500">
              Подготавливаем уроки...
            </p>
          </div>

        </div>

      </div>
    );
  }
  if (error) return <h1 className="p-6">{error}</h1>;

  const sections = [
    { title: "Тема 1: Основы", start: 1, end: 10 },
    { title: "Тема 2: База", start: 11, end: 20 },
    { title: "Тема 3: Практика", start: 21, end: 30 },
  ];

  const groupedSections: Record<string, number[]> = {};

  for (let i = 0; i <= 90; i++) {
    const lesson = lessonsData[i];

    const sectionName = lesson?.title
      ? lesson?.section || "Без секции"
      : "Без секции";

    if (!groupedSections[sectionName]) {
      groupedSections[sectionName] = [];
    }

    groupedSections[sectionName].push(i);
  }

  return (<div className="bg-gray-100 min-h-screen">

    {/* 🔐 ADMIN */}
    {openAdmin && ( 
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white w-[360px] rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-semibold mb-2 text-black">Admin Access</h2>

          <input
            type="password"
            placeholder="Password"
            value={password}
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 text-gray-800 outline-none"
            onChange={(e) => {
              setPassword(e.target.value);
              setSettingsMessage("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                check();
              }
            }}
          />

          <button
            className="w-full mt-4 bg-blue-600 text-white py-2.5 rounded-lg shadow"
            onClick={check}
          >
            Sign in
          </button>
          <button
            className="w-full mt-2 text-sm text-gray-500"
            onClick={() => setOpenAdmin(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    )}
    {/* УПРАВЛЕНИЕ ВСЕМИ ВИДЕО */}
    {openVideoSettings && (
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
        onClick={() => {
          if (!changingVideoSettings) {
            setOpenVideoSettings(false);
            setPassword("");
            setSettingsMessage("");
          }
        }}
      >
        <div
          className="w-full max-w-[390px] rounded-[28px] bg-white p-6 shadow-2xl sm:p-7"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Полоска сверху для телефона */}
          <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200 sm:hidden" />

          <div className="mb-6">
            <h2 className="text-[22px] font-bold text-gray-900">
              Управление видео
            </h2>

            <p className="mt-2 text-sm leading-5 text-gray-500">
              Включает или выключает все видео сразу для всех пользователей.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-5 py-5">
            <div className="pr-4">
              <p className="font-semibold text-gray-900">
                Доступ к видео
              </p>

              <p
                className={`mt-1 text-sm font-medium transition-colors duration-300 ${videosEnabled
                    ? "text-green-600"
                    : "text-red-500"
                  }`}
              >
                {videosEnabled
                  ? "Видео включены"
                  : "Видео выключены"}
              </p>
            </div>

            {/* ВЕРТИКАЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ */}
            <button
              type="button"
              disabled={changingVideoSettings || settingsLoading}
              onClick={changeVideosEnabled}
              className={`relative h-[88px] w-[48px] shrink-0 rounded-full p-1.5 shadow-inner transition-all duration-300 active:scale-95 disabled:opacity-60 ${videosEnabled
                  ? "bg-green-500"
                  : "bg-gray-300"
                }`}
            >
              <span
                className={`absolute left-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300 ease-out ${videosEnabled
                    ? "top-1.5"
                    : "top-[46px]"
                  }`}
              >
                {changingVideoSettings ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
                ) : (
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${videosEnabled
                        ? "bg-green-500"
                        : "bg-gray-400"
                      }`}
                  />
                )}
              </span>
            </button>
          </div>

          {settingsMessage && (
            <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-center text-sm font-medium text-blue-600">
              {settingsMessage}
            </div>
          )}

          <button
            type="button"
            disabled={changingVideoSettings}
            onClick={() => {
              setOpenVideoSettings(false);
              setPassword("");
              setSettingsMessage("");
            }}
            className="mt-6 w-full rounded-2xl bg-gray-900 py-3.5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            Закрыть
          </button>
        </div>
      </div>
    )}
    <div className="max-w-5xl mx-auto p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1
          className="text-3xl font-bold text-black cursor-pointer select-none"
          onClick={() => {
            setTapCount((prev) => {
              const next = prev + 1;
              if (next >= 5) {
                setOpenAdmin(true);
                return 0; // сброс
              }

              return next;
            });
          }}
        >
          Мой курс
        </h1>

        <div className="text-sm text-gray-600">
          Доступ до:{" "}
          <span className="font-semibold text-black">
            {new Date(data.expires_at).toLocaleDateString()}
          </span>
          {" | "}
          Уроков доступно:{" "}
          <span className="font-semibold text-black">
            {data.lessons_available} / 90
          </span>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 relative">

        {/* ⏳ LOADING */}
        {loading && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500">Загрузка видео...</p>
            </div>
          </div>
        )}

        {/* ❌ ERROR */}
        {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10 text-center p-4">
            <p className="text-red-500 font-semibold mb-2">
              Ошибка загрузки видео
            </p>
            <p className="text-sm text-gray-500 mb-3">
              Проверь интернет или попробуй позже
            </p>

            <button
              onClick={() => {
                setVideoError(false);
                setLoading(true);
                setCurrentLesson((prev) => prev); // перезагрузка
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Повторить
            </button>
          </div>
        )}
        <div className="absolute top-2 left-2 text-white text-xs opacity-70 pointer-events-none z-20">
          ID: {data?.telegram_id || "USER"}
        </div>
        <div className="absolute text-white text-xs opacity-50 animate-pulse pointer-events-none z-20"
          style={{ top: Math.random() * 300, left: Math.random() * 600 }}>
          {data?.telegram_id}
        </div>
        {videosEnabled &&
          lessonsData[currentLesson]?.video ? (
          <iframe
            loading="lazy"
            key={currentLesson}
            className="w-full h-[420px]"
            src={lessonsData[currentLesson]?.video}
            allowFullScreen
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            onLoad={() => setLoading(false)}
            onError={() => {
              setVideoError(true);
              setLoading(false);
            }}
          />
        ) : (
          <div className="w-full h-[420px] flex items-center justify-center bg-gray-100">
            <p className="text-gray-500 text-lg">
              Видео временно недоступны
            </p>
          </div>
        )}
        {/* TITLE */}
        <div className="p-4 border-t">
          <h3 className="text-lg font-semibold text-black">
            Урок {currentLesson}:{" "}
            {lessonsData[currentLesson]?.title || "Урок"}
          </h3>
        </div>
      </div>

      {/* 📚 CONTENT */}
      <h2 className="text-xl font-semibold mb-4 text-black">
        Содержание курса
      </h2>

      <div className="bg-white rounded-2xl shadow-xl divide-y">

        {Object.entries(groupedSections).map(([sectionTitle, lessons], idx) => (
          <div key={idx}>

            {/* HEADER */}
            <button
              onClick={() =>
                setOpenSection(openSection === idx ? null : idx)
              }
              className="w-full text-left px-5 py-4 font-semibold text-black hover:bg-gray-50 flex justify-between"
            >
              {sectionTitle}
              <span>{openSection === idx ? "−" : "+"}</span>
            </button>

            {/* LESSONS */}
            {openSection === idx && (
              <div className="px-5 pb-4">

                {lessons.map((lesson) => {
                  const isOpen = lesson === 0 || lesson <= data.lessons_available;
                  const exists = lessonsData[lesson];

                  return (
                    <div
                      key={lesson}
                      className={`flex items-center justify-between py-3 px-3 rounded-lg mb-2 ${isOpen
                        ? "hover:bg-gray-50 cursor-pointer"
                        : "bg-gray-100"
                        }`}
                      onClick={() => {
                        if (!isOpen || !exists) return;

                        setCurrentLesson(lesson);
                        window.scrollTo({
                          top: 0,
                          behavior: "smooth",
                        });
                      }}
                    >
                      <div className="flex items-center gap-3">

                        {isOpen && exists ? (
                          <span className="text-green-500 text-lg">✔</span>
                        ) : (
                          <span className="text-gray-400 text-lg">🔒</span>
                        )}

                        <span
                          className={`text-sm ${isOpen ? "text-black" : "text-gray-400"
                            }`}
                        >
                          Урок {lesson === 0 ? "Введение" : lesson}
                          <span className="mx-2 text-gray-400">|</span>
                          <span
                            className={
                              isOpen && exists
                                ? "text-gray-700"
                                : "text-gray-400"
                            }
                          >
                            {exists?.title || "Нет урока"}
                          </span>
                        </span>

                      </div>

                      {isOpen && exists && (
                        <span className="text-blue-600 text-sm">
                          Смотреть
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

      </div>
    </div>
  </div>

  );
}
