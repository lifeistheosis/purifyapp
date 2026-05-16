"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * App-wide Interlinear toggle. When ON, the chapter reader shows the
 * original Greek alongside the English.
 *
 * Stored as a single boolean in localStorage so the choice persists across
 * chapters and reloads. Mirrors the pattern used by useVerseAnnotation.
 */

const KEY = "purify:interlinear";
const EVT = "purify:interlinear:change";

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function useInterlinear() {
  const [on, setOn] = useState<boolean>(false);

  useEffect(() => {
    setOn(read());
    function onExternal(e: Event) {
      const detail = (e as CustomEvent<{ on: boolean }>).detail;
      if (detail) setOn(detail.on);
    }
    window.addEventListener(EVT, onExternal);
    return () => window.removeEventListener(EVT, onExternal);
  }, []);

  const toggle = useCallback(() => {
    setOn((prev) => {
      const next = !prev;
      try {
        if (next) window.localStorage.setItem(KEY, "1");
        else window.localStorage.removeItem(KEY);
        window.dispatchEvent(
          new CustomEvent(EVT, { detail: { on: next } }),
        );
      } catch {
        /* storage may be unavailable */
      }
      return next;
    });
  }, []);

  return { on, toggle };
}
