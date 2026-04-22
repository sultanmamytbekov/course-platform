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
  const [currentLesson, setCurrentLesson] = useState(1);


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
    const res = await fetch("https://course-platform-api-9hcf.onrender.com/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const result = await res.json();
    if (result.success === "admin") {
      localStorage.setItem("admin", "true");
      window.location.href = "/admin";
    }


    if (result.success === "videos") {
      localStorage.setItem("videos", "true");
      window.location.href = "/admin/videos";
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

  for (let i = 1; i <= 90; i++) {
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
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 text-gray-800"
            onChange={(e) => setPassword(e.target.value)}
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

      {/* 🎥 VIDEO */}
      {/* <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 relative">

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="flex flex-col items-center gap-3">

              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>

              <p className="text-sm text-gray-500">Загрузка видео...</p>
            </div>
          </div>
        )}

        <iframe
          key={currentLesson}
          className="w-full h-[420px]"
          src={lessonsData[currentLesson]?.video}
          allow="autoplay; fullscreen"
          onLoad={() => setLoading(false)}
        />

        <div className="p-4 border-t">
          <h3 className="text-lg font-semibold text-black">
            Урок {currentLesson}:{" "}
            {lessonsData[currentLesson]?.title || "Урок"}
          </h3>
        </div>
      </div> */}
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

        {/* 🎥 VIDEO */}
        {/* <iframe
          key={currentLesson}
          className="w-full h-[420px]"
          src={lessonsData[currentLesson]?.video}
          allow="autoplay; fullscreen"
          onLoad={() => setLoading(false)}
          onError={() => {
            setVideoError(true);
            setLoading(false);
          }}
        /> */}
        <div className="absolute top-2 left-2 text-white text-xs opacity-70 pointer-events-none z-20">
          ID: {data?.telegram_id || "USER"}
        </div>
        <div className="absolute text-white text-xs opacity-50 animate-pulse pointer-events-none z-20"
          style={{ top: Math.random() * 300, left: Math.random() * 600 }}>
          {data?.telegram_id}
        </div>

        <iframe
          loading="lazy"
          key={currentLesson}
          className="w-full h-[420px]"
          src={lessonsData[currentLesson]?.video}
          allowFullScreen
          // allow="autoplay; fullscreen"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          onLoad={() => setLoading(false)}
          onError={() => {
            setVideoError(true);
            setLoading(false);
          }}
        />
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
                  const isOpen = lesson <= data.lessons_available;
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
                          Урок {lesson}
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
