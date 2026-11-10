"use client";

import { useEffect, useRef } from "react";

import { markReadToEnd, type ReadToEndKind } from "@/lib/reading/readToEnd";

/**
 * The foot of a page that can be read to its end (1.9, rec 79): a council's
 * page, a work's last chapter. When it comes into view the page is kept as
 * read to its end (lib/reading/readToEnd.ts), once. Draws nothing a reader
 * sees or a screen reader says.
 */
export function ReadToEndMark({ kind, id }: { kind: ReadToEndKind; id: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const seen = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        markReadToEnd(kind, id);
        seen.disconnect();
      }
    });
    seen.observe(el);
    return () => seen.disconnect();
  }, [kind, id]);
  return <span ref={ref} aria-hidden data-read-to-end={`${kind}:${id}`} className="block h-px w-full" />;
}
