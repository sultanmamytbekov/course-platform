"use client";

import { useEffect, useState } from "react";

export default function AdminVideos() {
    const [lesson_number, setLessonNumber] = useState(1);
    const [title, setTitle] = useState("");
    const [video_url, setVideoUrl] = useState("");
    const [section, setSection] = useState("");

    const [lessons, setLessons] = useState<any[]>([]);

    const loadLessons = () => {
        fetch("https://course-platform-api-9hcf.onrender.com/lessons")
            .then((res) => res.json())
            .then((data) => setLessons(data));
    };

    useEffect(() => {
        loadLessons();
    }, []);

    const save = async () => {
        await fetch("https://course-platform-api-9hcf.onrender.com/add-lesson", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                lesson_number,
                title,
                video_url,
                section,
            }),
        });

        alert("Сохранено ✅");
        loadLessons();
    };

    useEffect(() => {
        const auth = localStorage.getItem("videos");

        if (!auth) {
            window.location.href = "/access";
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#f4f7ff] p-3 sm:p-6 text-gray-800">
            <div className="max-w-4xl mx-auto">

                <h1 className="text-xl sm:text-2xl font-bold mb-6">
                    🎥 Управление уроками
                </h1>

                {/* FORM */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 shadow mb-6">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

                        <input
                            type="number"
                            placeholder="Номер урока"
                            className="w-full border p-3 rounded-lg"
                            value={lesson_number}
                            onChange={(e) => setLessonNumber(Number(e.target.value))}
                        />

                        <input
                            placeholder="Название"
                            className="w-full border p-3 rounded-lg"
                            onChange={(e) => setTitle(e.target.value)}
                        />

                        <input
                            placeholder="Ссылка Vimeo"
                            className="w-full border p-3 rounded-lg sm:col-span-2"
                            onChange={(e) => setVideoUrl(e.target.value)}
                        />

                        <input
                            placeholder="Секция (например: Тема 1)"
                            className="w-full border p-3 rounded-lg sm:col-span-2"
                            onChange={(e) => setSection(e.target.value)}
                        />

                    </div>

                    <button
                        onClick={save}
                        className="mt-4 w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl"
                    >
                        Сохранить
                    </button>

                </div>

                {/* LIST */}
                <div className="bg-white rounded-2xl shadow">

                    <div className="p-4 border-b font-semibold text-sm sm:text-base">
                        Список уроков
                    </div>

                    <div className="divide-y">

                        {lessons.map((l) => (
                            <div
                                key={l._id}
                                className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-sm"
                            >
                                <span>
                                    {l.lesson_number}. {l.title}
                                </span>
                                <span className="text-gray-500">
                                    {l.section}
                                </span>
                            </div>
                        ))}

                    </div>
                </div>

            </div>
        </div>
    );
}