"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { landVerse, takeHeldPlace } from "@/lib/bible/keepPlace";

/**
 * Sets the verse a change of translation kept back at the reading place, once
 * the chapter stands in the new translation (1.9, build 93 note 20;
 * lib/bible/keepPlace.ts). `textKey` names what the chapter is shown in, and
 * `ready` says its words are on the page: a downloaded Bible's chapter comes
 * a moment after the switch, and landing on the words it replaces would leave
 * the reader where those words stood. It tries for a moment while the verse
 * is drawn, and gives up quietly where the chapter has no such verse.
 */
export function KeptPlace({ textKey, ready }: { textKey: string; ready: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!ready) return;
    const verse = takeHeldPlace(pathname);
    if (!verse) return;
    let frames = 0;
    let id = 0;
    const land = () => {
      if (landVerse(verse) || ++frames > 90) return;
      id = requestAnimationFrame(land);
    };
    id = requestAnimationFrame(land);
    return () => cancelAnimationFrame(id);
  }, [pathname, textKey, ready]);
  return null;
}
