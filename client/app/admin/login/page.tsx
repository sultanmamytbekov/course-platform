"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [open, setOpen] = useState(false);

    // 🔐 проверка пароля
   const check = async () => {
    console.log("CLICKED CHECK");

    try {
        const res = await fetch("https://course-platform-api-9hcf.onrender.com/admin-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        });

        console.log("STATUS:", res.status);

        if (!res.ok) {
            alert("Ошибка сервера или неверный пароль");
            return;
        }

        const data = await res.json();

        console.log("DATA:", data);

        if (data.success) {
            localStorage.setItem("admin", "true");
            window.location.href = "/admin"; // иногда лучше чем router
        } else {
            alert("Неверный пароль");
        }

    } catch (err) {
        console.error("FETCH ERROR:", err);
        alert("Сервер не отвечает (Render спит 😴)");
    }
};

    // 🔥 Ctrl + Shift + A
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "a") {
                setOpen(true);
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    return (
        <div className="h-screen flex items-center justify-center bg-gray-100">

            {/* 🔐 МОДАЛКА */}
            {open && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50">
                    <div className="bg-white p-6 rounded-xl shadow-lg w-80">
                        <h1 className="text-xl font-bold mb-4">
                            Admin Access
                        </h1>

                        <input
                            type="password"
                            placeholder="Пароль"
                            className="border p-2 w-full mb-3"
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <button
                            onClick={check}
                            className="bg-blue-500 text-white w-full py-2 rounded"
                        >
                            Войти
                        </button>

                        <button
                            onClick={() => setOpen(false)}
                            className="mt-2 text-sm text-gray-500 w-full"
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            )}

            {/* обычный экран */}
            <div className="text-gray-500">
                Нажмите <b>Ctrl + Alt + A</b> для входа
            </div>
        </div>
    );
}