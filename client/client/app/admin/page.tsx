"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Table } from "lucide-react";

interface User {
  _id: string;
  telegram_id: number;
  lessons_available: number;
  is_active: boolean;
  expires_at: string | null;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "cards">("table");

  useEffect(() => {
    const auth = localStorage.getItem("admin");

    if (!auth) {
      window.location.href = "/admin/login";
      return;
    }

    fetch("https://course-platform-api-9hcf.onrender.com/users")
      .then((res) => res.json())
      .then((data) => setUsers(data));
  }, []);

  const filtered = users.filter((u) =>
    u.telegram_id.toString().includes(search)
  );
  useEffect(() => {
    const auth = localStorage.getItem("admin");

    if (!auth) {
      window.location.href = "/access";
    }
  }, []);
  return (
    <div className="min-h-screen bg-[#f4f7ff] font-sans p-4 sm:p-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Admin Panel
          </h1>
          <p className="text-gray-500 text-sm">
            User management system
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gray-300 rounded-full" />
          <span className="text-gray-700 font-medium">Admin</span>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          User Management
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 text-gray-800 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 "
            placeholder="Search by Telegram ID"
            onChange={(e) => setSearch(e.target.value)}
          />

          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium w-full sm:w-auto">
            Search
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-500 text-white rounded-2xl p-5">
          <p className="text-sm opacity-80">Total Users</p>
          <h3 className="text-2xl font-bold">{users.length}</h3>
        </div>

        <div className="bg-green-500 text-white rounded-2xl p-5">
          <p className="text-sm opacity-80">Active</p>
          <h3 className="text-2xl font-bold">
            {users.filter((u) => u.is_active).length}
          </h3>
        </div>

        <div className="bg-red-500 text-white rounded-2xl p-5">
          <p className="text-sm opacity-80">Blocked</p>
          <h3 className="text-2xl font-bold">
            {users.filter((u) => !u.is_active).length}
          </h3>
        </div>

        <div className="bg-orange-400 text-white rounded-2xl p-5">
          <p className="text-sm opacity-80">Expiring</p>
          <h3 className="text-2xl font-bold">8</h3>
        </div>
      </div>

      {/* ================= TABLE / HEADER ================= */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

        {/* HEADER + SWITCH */}
        <div className="p-4 border-b flex justify-between items-center">

          <h2 className="text-lg font-semibold text-gray-800">
            Users List
          </h2>

          {/* 🔘 КРАСИВЫЙ ПЕРЕКЛЮЧАТЕЛЬ */}
          <div className="flex bg-gray-100 p-1 rounded-xl">

            <button
              onClick={() => setView("table")}
              className={`p-2 rounded-lg transition-all duration-300 ${view === "table"
                  ? "bg-white shadow text-gray-900 scale-105"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <Table size={18} />
            </button>

            <button
              onClick={() => setView("cards")}
              className={`p-2 rounded-lg transition-all duration-300 ${view === "cards"
                  ? "bg-white shadow text-gray-900 scale-105"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <LayoutGrid size={18} />
            </button>

          </div>
        </div>

        {/* ================= TABLE ================= */}
        {view === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">

              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-3 text-left">Telegram ID</th>
                  <th className="p-3 text-left">Lessons</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Access Until</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u._id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="p-3 font-medium text-gray-800">
                      {u.telegram_id}
                    </td>

                    <td className="p-3 text-gray-600">
                      {u.lessons_available}
                    </td>

                    <td className="p-3">
                      {u.is_active ? (
                        <span className="text-green-600 font-semibold">
                          ✔ Active
                        </span>
                      ) : (
                        <span className="text-red-500 font-semibold">
                          ✖ Blocked
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-gray-500">
                      {u.expires_at
                        ? new Date(u.expires_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </div>

      {/* ================= CARDS ================= */}
      {view === "cards" && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {filtered.map((u) => (
            <div
              key={u._id}
              className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >

              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg text-gray-800">
                  {u.telegram_id}
                </h3>

                {u.is_active ? (
                  <span className="text-green-600 text-sm font-semibold">
                    ✔ Active
                  </span>
                ) : (
                  <span className="text-red-500 text-sm font-semibold">
                    ✖ Blocked
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium text-gray-800">
                    Lessons:
                  </span>{" "}
                  {u.lessons_available}
                </p>

                <p>
                  <span className="font-medium text-gray-800">
                    Access Until:
                  </span>{" "}
                  {u.expires_at
                    ? new Date(u.expires_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  );
}