"use client";

import { useEffect, useState } from "react";

import type { WritingContent } from "@/lib/saints/load";
import type { Saint } from "@/lib/saints/saints";

import { WritingReader } from "./WritingReader";

/**
 * The Fathers' reader in the apps, where a work is a file in the bundle and
 * not part of the page (lib/saints/writingFile.ts).
 *
 * The file is read as the page opens, from the app's own origin, so it needs
 * no network. Until it lands there is room held for the text, so the page
 * does not jump when it does. A read that fails is tried again a few times:
 * the file is in the bundle, so a failure is a device being slow, not the
 * work being absent.
 */
const TRIES = 4;

export function LazyWritingReader({ saint, work }: { saint: Saint; work: string }) {
  const key = `${saint.slug}/${work}`;
  const [read, setRead] = useState<{ key: string; content: WritingContent } | null>(null);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = (left: number) => {
      fetch(`/saints-data/${saint.slug}/${work}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<WritingContent>) : null))
        .catch(() => null)
        .then((content) => {
          if (!live) return;
          if (content) setRead({ key: `${saint.slug}/${work}`, content });
          else if (left > 1) timer = setTimeout(() => ask(left - 1), 800);
        });
    };
    ask(TRIES);
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [saint.slug, work]);

  if (read?.key !== key) return <div aria-busy="true" className="min-h-[70vh]" />;
  return <WritingReader saint={saint} content={read.content} />;
}
