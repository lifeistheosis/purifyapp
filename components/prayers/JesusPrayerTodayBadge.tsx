"use client";

import { useEffect, useState } from "react";

/**
 * Tiny client island that reads today's Jesus Prayer count from
 * localStorage and renders it inside the /prayers/today card. Static
 * placeholder before hydration so the server HTML doesn't flash zero.
 */
export function JesusPrayerTodayBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const d = new Date();
    const k = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    try {
      const t = window.localStorage.getItem(`purify.prayers.jesus.${k}`);
      setCount(t ? parseInt(t, 10) || 0 : 0);
    } catch {
      setCount(0);
    }
  }, []);

  if (count === null) {
    return (
      <span className="font-sans text-[13px] text-paper/45">
        Tap to start
      </span>
    );
  }
  return (
    <span className="font-sans text-[13px] text-paper/75">
      <span className="font-semibold text-[#d4af37] tabular-nums">{count}</span>{" "}
      prayed today
    </span>
  );
}
