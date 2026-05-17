"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * When a chapter page loads with a `#v123` hash — whether from the
 * BibleSearch result, a shared deep link, or a copy-link click — find
 * the matching verse element, scroll it into view, and flash it gold
 * for ~1.6s so the eye lands on the right line.
 *
 * The verse element (in VerseRow) is `<div id="v{n}" ...>`. We attach
 * `data-focus="true"` while the flash is active and let CSS in the
 * same component pick it up via a Tailwind selector applied on
 * VerseRow's class string (`data-[focus=true]:...`).
 */
export function VerseFocusFlash() {
  const pathname = usePathname();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function focusFromHash() {
      const hash = window.location.hash;
      const m = hash.match(/^#v(\d+)$/);
      if (!m) return;
      // Defer one frame so the verse list has mounted and laid out.
      requestAnimationFrame(() => {
        const el = document.getElementById(`v${m[1]}`);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.setAttribute("data-focus", "true");
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          el.removeAttribute("data-focus");
        }, 1600);
      });
    }

    focusFromHash();
    window.addEventListener("hashchange", focusFromHash);
    return () => {
      window.removeEventListener("hashchange", focusFromHash);
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
