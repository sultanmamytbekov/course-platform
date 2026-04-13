"use client";

import { useEffect, useState } from "react";

export default function LessonPage() {
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");

//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     const token = params.get("token");

//     fetch(`https://course-platform-api-9hcf.onrender.com/check-access?token=${token}`)
//       .then((res) => res.json())
//       .then((res) => {
//         if (res.error) {
//           setError(res.error);
//         } else {
//           setAllowed(true);
//         }
//       });
//   }, []);
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const lesson = Number(params.get("lesson"));

  fetch(`https://course-platform-api-9hcf.onrender.com/check-access?token=${token}`)
    .then((res) => res.json())
    .then((res) => {
      if (res.error) {
        setError(res.error);
      } else {
        if (lesson > res.lessons_available) {
          setError("Урок закрыт");
        } else {
          setAllowed(true);
        }
      }
    });
}, []);

  if (error) return <h1>{error}</h1>;
  if (!allowed) return <h1>Проверка...</h1>;

  return (
    <div style={{ padding: 20 }}>
      <h1>🎥 Урок</h1>

      <iframe
        src="https://player.vimeo.com/video/1181448162"
        width="800"
        height="450"
        allow="autoplay; fullscreen"
      ></iframe>
    </div>
  );
}