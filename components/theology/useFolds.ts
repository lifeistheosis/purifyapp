"use client";

import { useEffect, type RefObject } from "react";

/**
 * A passage longer than its fold folds after so many lines and ends in the
 * soft fade every fold in Purify ends in, never an ellipsis (app/
 * globals.css, .post-fold, the owner's note 19 of build 80): the fade is
 * drawn only where words run past the fold (data-cut). Each `[data-card-
 * words]` under `root` is measured by a ResizeObserver, which answers before
 * it is first painted and again when its box changes (a face arriving, a
 * wider screen), and once more when the words' own face has loaded. `key`
 * names what the words are, so new words are measured again.
 */
export function useFolds(root: RefObject<HTMLElement | null>, key: unknown): void {
  useEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const cut = (words: Element) => words.toggleAttribute("data-cut", words.scrollHeight > words.clientHeight + 1);
    const watch = new ResizeObserver((entries) => {
      for (const entry of entries) cut(entry.target);
    });
    const all = el.querySelectorAll("[data-card-words]");
    for (const words of all) watch.observe(words);
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) for (const words of all) cut(words);
    });
    return () => {
      live = false;
      watch.disconnect();
    };
  }, [root, key]);
}
