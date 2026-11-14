"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { FONT_CLASSES, SIZE_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { Skeleton } from "@/components/ui/Skeleton";
import type { WritingContent } from "@/lib/saints/load";
import type { Saint } from "@/lib/saints/saints";
import { fetchWriting } from "@/lib/saints/writingClient";
import { watchInput } from "@/lib/ui/lastInput";
import { outlineLeft } from "@/lib/ui/outlineLeave";

import { WritingReader, type AboutBook } from "./WritingReader";

/**
 * The Fathers' reader in the apps, where a work is a file in the bundle and
 * not part of the page (lib/saints/writingFile.ts).
 *
 * The file is read as the page opens, from the app's own origin, so it needs
 * no network. Until it lands the page stands in its own shape (WorkOutline,
 * below), so it does not arrive blank and does not jump when the text comes.
 * A read that fails is tried again a few times: the file is in the bundle, so
 * a failure is a device being slow, not the work being absent.
 */
const TRIES = 4;

// On the server there is no layout to read (the same choice components/ui/AfterAMoment.tsx makes).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function LazyWritingReader({ saint, work, author, about }: { saint: Saint; work: string; author?: string | null; about?: AboutBook | null }) {
  const key = `${saint.slug}/${work}`;
  const [read, setRead] = useState<{ key: string; content: WritingContent } | null>(null);
  // When the page opened, so the reader can tell a thumb that has started
  // scrolling while the text was on its way from a page still opening, and
  // leave that reader where they are (lib/ui/lastInput.ts).
  const [openedAt] = useState(() => (typeof performance === "undefined" ? 0 : performance.now()));

  useEffect(() => {
    watchInput();
  }, []);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = (left: number) => {
      // Whole, however the build wrote it: a work the commentary quotes is an
      // index and parts from 1.9 (lib/saints/writingClient.ts).
      fetchWriting<WritingContent>(saint.slug, work)
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

  if (read?.key !== key) return <WorkOutline />;
  return <WritingReader saint={saint} content={read.content} openedAt={openedAt} author={author} about={about} />;
}

/**
 * The work's page while its text comes (cause 7 of the gate: a Father's work
 * in the apps drew nothing for a moment, then its head and words at once). The
 * house's own outline, as the Bible's chapter has while it opens (app/(app)/
 * bible/[book]/[chapter]/loading.tsx): the chapter's head where WorkHead stands
 * it, the part's name large in the middle, the chapter under it and the short
 * rule, then the first lines where the words will stand.
 *
 * It is written in the reader's own type: the same column and the reader's
 * size and font as the article (WritingReader), and each line of the head an
 * empty line set as WorkHead sets it, the name at its size and leading and the
 * chapter's line at the reader's, with the bar laid in it. So the head's words
 * arrive where their bars stood and nothing on the page moves when the text
 * comes. The room held under it (70vh) is the room it always held, so the
 * page's foot does not jump either.
 *
 * It stands whole as the page arrives: its lines are not a cascade, which
 * waits out the page switch and then lets them in one by one, so a switch
 * into a long work stood empty for most of a second (the gate's walk with
 * motion on). And it leaves as the route's outline does, dissolving over the
 * text as React takes it out (lib/ui/outlineLeave.ts), not cut away.
 */
export function WorkOutline() {
  const { size, font } = useReaderPrefs();
  const outline = useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const el = outline.current;
    return () => {
      if (el) outlineLeft(el);
    };
  }, []);
  return (
    <div ref={outline} aria-busy="true" data-work-outline="" className={`pb-24 safe-pb-reader ${FONT_CLASSES[font]} ${SIZE_CLASSES[size]}`}>
      <div className="mx-auto min-h-[70vh] w-full max-w-[680px]">
        <div aria-hidden className="mb-5 text-center">
          <span className="relative block font-heading text-[40px] leading-[1.08] min-[380px]:text-[44px]">
            {" "}
            <Skeleton weight="strong" className="absolute inset-0 m-auto h-[0.72em] w-40" />
          </span>
          <span className="relative mt-1.5 block font-sans text-ui">
            {" "}
            <Skeleton weight="mid" className="absolute inset-0 m-auto h-3.5 w-24" />
          </span>
          <span className="mx-auto mt-5 block h-px w-7 bg-paper/25" />
        </div>
        <div aria-hidden className="space-y-2">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} weight="faint" className={i === 8 ? "sk-line-end" : "sk-line"} />
          ))}
        </div>
      </div>
    </div>
  );
}
