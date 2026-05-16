"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { nextChapter, prevChapter } from "@/lib/bible/books";

export function ChapterKeyNav({
  slug,
  chapter,
}: {
  slug: string;
  chapter: number;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t?.isContentEditable
      )
        return;
      if (e.key === "ArrowLeft") {
        const p = prevChapter(slug, chapter);
        if (p) {
          e.preventDefault();
          router.push(`/bible/${p.slug}/${p.chapter}`);
        }
      } else if (e.key === "ArrowRight") {
        const n = nextChapter(slug, chapter);
        if (n) {
          e.preventDefault();
          router.push(`/bible/${n.slug}/${n.chapter}`);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, slug, chapter]);

  return null;
}
