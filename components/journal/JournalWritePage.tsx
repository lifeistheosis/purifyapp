"use client";

// Writing in the journal, as a page of its own (1.9, Fable round 3; build 97
// note 2, the owner on 2026-11-14: "journal is still messy in terms of UI ...
// rather than a pop up window for the journal game you give it its own
// simplified optimized UI?"; build 98 note 4: "I wanted this system and
// design revamped").
//
// It was a sheet as tall as the screen (components/journal/JournalComposer.tsx)
// with Close and Done in its head, a second Done in each tray, a toolbar of
// four tools at its foot and a tray opening on top of them. Now:
//
//   the head     the way back at the start, the day in the middle as the
//                small line, and ONE Done at the end, the page's only filled
//                button. Back keeps what is written as the page that waits
//                (lib/journal/waiting.ts), as Close did; Done keeps the entry.
//   the page     one calm surface on the page's own ground, no boxes: the
//                cover, when one is chosen, as a band under the head that
//                scrolls away with the page; what the page is about, one
//                quiet line with Open; the kind as the house's track; the
//                title and the words as fields with no box and no ring.
//   one control  a round button with the plus at the foot's start side. It
//                opens the page's one sheet (components/journal/WriteSheet.tsx).
//                With the keyboard up it stands alone just above the keys
//                (app/globals.css, .journal-add): nothing else rides the
//                keyboard, and nothing appears or goes as it comes. The page
//                only scrolls, and it keeps room at its foot as tall as the
//                control and its gap (.journal-write-room), so the last line
//                written scrolls clear of it.
//
// A page for writing only: it holds the screen as Community's page for making
// a post does (components/community/ComposePage.tsx, lib/ui/overlay.ts), so
// the tab bar and the floating pills step aside while it is open, with the
// keyboard up or down, and come back as the reader leaves.
//
// The page being written is the journal's kept draft (lib/journal/entries.ts,
// purify:journal.draft): whatever opens this page writes it first
// (lib/journal/openWriting.ts), and the page reads it on the device, so it is
// one static page in the apps' export. A kept page may also be asked for by
// its id (?entry=, or lib/journal/gatheringActions.ts).
//
// A verse's note opened from the journal's list is words alone here too, as
// it is kept on its verse: no kind, no title, no control.

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { KIND_KEY, SourceCard } from "@/components/journal/JournalComposer";
import { PageBlocks } from "@/components/journal/PageBlocks";
import { SharedPageLine, useJournalShare } from "@/components/journal/SharePageButton";
import { usePage } from "@/components/journal/usePage";
import { useSourceLabel } from "@/components/journal/useSourceLabel";
import { WriteSheet, type WriteSheetView } from "@/components/journal/WriteSheet";
import { TOP_ICON, TOP_PLATE } from "@/components/nav/topPlate";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Plus } from "@/components/ui/icons/Plus";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { coverById } from "@/lib/journal/covers";
import { clearDraft, JOURNAL_KINDS, MAX_BODY, readDraft, readRecords, useJournalRecords, writeDraft, type JournalDraft } from "@/lib/journal/entries";
import { takeJournalPage } from "@/lib/journal/gatheringActions";
import { draftWaits, keepDone, openKeeping } from "@/lib/journal/keepDraft";
import { JOURNAL_HREF, openedFromVerse } from "@/lib/journal/openWriting";
import { pageIsEmpty, parsePage } from "@/lib/journal/page";
import { takeJournalOpen } from "@/lib/journal/quoteInJournal";
import { goBack } from "@/lib/nav/goBack";
import { setOverlayOpen } from "@/lib/ui/overlay";
import { softTick } from "@/lib/ui/softTick";

const BLANK: JournalDraft = { kind: "reflection", body: "" };

// On the server there is no page to mark, and useLayoutEffect only warns.
const useHoldEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** The page asked for: a kept one by its id, else the one being written, else a new one. Read on the device. */
function pageToOpen(): JournalDraft {
  // The ask to open the journal on this page is answered here.
  takeJournalOpen();
  let id = takeJournalPage();
  if (!id) {
    try {
      id = new URLSearchParams(window.location.search).get("entry");
    } catch {
      id = null;
    }
  }
  const asked = id ? readRecords().find((r) => r.id === id && !r.deletedAt) : undefined;
  // What waits is kept before another page opens; the same page goes on (lib/journal/waiting.ts).
  if (asked) return openKeeping({ kind: asked.kind, body: asked.body, prompt: asked.prompt, source: asked.source, editing: asked.id });
  return readDraft() ?? BLANK;
}

export function JournalWritePage() {
  const [first, setFirst] = useState<JournalDraft | null>(null);
  // The page holds the screen: the tab bar and the floating pills step aside
  // (lib/ui/overlay.ts), as they do for Community's page for making a post.
  // Said as the page is committed, so the bar is going as the page arrives.
  // The page itself scrolls, so nothing is locked.
  useHoldEffect(() => {
    setOverlayOpen(true);
    return () => setOverlayOpen(false);
  }, []);
  useEffect(() => {
    const page = pageToOpen();
    writeDraft(page);
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the page
       being written is on the device, read after the first paint. */
    setFirst(page);
  }, []);
  return first ? <Writing first={first} /> : <Head />;
}

/** The page's head: the way back, the day, and the one Done. */
function Head({ onBack, onDone, doneDisabled = true }: { onBack?: () => void; onDone?: () => void; doneDisabled?: boolean }) {
  const { t, locale } = useTranslate();
  const router = useRouter();
  const today = (() => {
    try {
      return new Intl.DateTimeFormat(dateLocale(locale), { weekday: "long", month: "long", day: "numeric" }).format(new Date());
    } catch {
      return "";
    }
  })();
  return (
    <div
      // The marker globals.css looks for to give a phone this bar alone, and
      // what stands at the top of the screen (lib/ui/readingPlace.ts).
      data-mobile-topbar
      data-screen-edge="top"
      data-journal-head=""
      className="journal-write-head topbar-safe sticky top-0 z-30 border-b border-white/8 bg-night"
    >
      <div className="relative mx-auto flex h-12 max-w-[760px] items-center justify-between gap-2 px-2">
        <button
          type="button"
          aria-label={t("nav.back")}
          data-journal-back=""
          onClick={onBack ?? (() => goBack(router, JOURNAL_HREF))}
          className={`${TOP_PLATE} tap-press text-paper/80 hover:text-paper`}
        >
          <ChevronLeft {...TOP_ICON} className="rtl:-scale-x-100" />
        </button>
        {/* The day, as the small line, in the middle of the bar whatever stands at its ends. */}
        <p suppressHydrationWarning className="pointer-events-none absolute inset-x-[88px] truncate text-center font-sans text-caption font-semibold text-paper/55">
          {today}
        </p>
        <button
          type="button"
          onClick={onDone}
          disabled={doneDisabled}
          data-journal-done=""
          className="tap-press hit-44 me-1.5 inline-flex h-9 shrink-0 items-center rounded-pill bg-paper px-[18px] font-sans text-ui font-semibold text-night disabled:opacity-40"
        >
          {t("common.done")}
        </button>
      </div>
    </div>
  );
}

function Writing({ first }: { first: JournalDraft }) {
  const { t } = useTranslate();
  const router = useRouter();
  const locked = usePlusFeatures() === false;
  const { sourceLabel } = useSourceLabel();
  const records = useJournalRecords();
  // Plus: the notebooks the pages name (lib/journal/page.ts), to pick again.
  const notebooks = useMemo(() => {
    const names = new Set<string>();
    for (const r of records) {
      if (r.deletedAt) continue;
      const name = parsePage(r.body).notebook;
      if (name) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [records]);

  const [draft, setDraft] = useState<JournalDraft>(first);
  const change = (next: JournalDraft) => {
    setDraft(next);
    writeDraft(next);
  };
  const isNote = draft.editing?.startsWith("note:") ?? false;
  // A verse's note opened from its verse draws no Open back to it: the reader came from there (lib/journal/openVerseNote.ts).
  const [fromVerse] = useState(() => openedFromVerse(window.location.search));
  const editor = usePage(true, draft.body, (body) => change({ ...draft, body }));
  const empty = isNote ? draft.body.trim().length === 0 : pageIsEmpty(editor.page);
  // A saved page may be shared (step 3), and its sharing stopped; a verse's note and a page not yet kept may not.
  const shareable = !!draft.editing && !isNote && !empty;
  const share = useJournalShare(shareable && draft.editing ? draft.editing : null, draft.body, editor.page.title);

  const [sheet, setSheet] = useState<WriteSheetView | null>(null);

  // Left by the phone's own Back, or any other way that is not the head's:
  // a page with nothing new on it does not wait (lib/journal/waiting.ts).
  useEffect(
    () => () => {
      const kept = readDraft();
      if (kept && !draftWaits(kept)) clearDraft();
    },
    [],
  );

  // What waits is what is not kept yet. A kept entry opened to be read and
  // left as it was does not: Write begins a new page after it.
  const back = () => {
    if (!draftWaits(draft)) clearDraft();
    goBack(router, JOURNAL_HREF);
  };
  // Done's rules are lib/journal/waiting.ts (`keeping`).
  const done = () => {
    keepDone(draft);
    clearDraft();
    if (draft.body.trim()) softTick();
    goBack(router, JOURNAL_HREF);
  };

  const cover = isNote ? null : coverById(editor.page.cover);

  return (
    <>
      <Head onBack={back} onDone={done} doneDisabled={empty && !draft.editing} />
      <section data-journal-write="" className="journal-write-room min-h-[70vh] bg-night px-5 md:px-8" aria-label={t("journal.write")}>
        <div data-journal-composer="" className="mx-auto w-full max-w-[720px]">
          {/* The cover, at the head of the page under the bar, from edge to
              edge on a phone: a band that scrolls away with the page. Its
              credit is one small line. The pictures are icons, whose faces
              stand high in the frame, so the cut is taken from there. */}
          {cover ? (
            <figure data-page-cover="" className="-mx-5 md:mx-0 md:mt-5">
              {/* eslint-disable-next-line @next/next/no-img-element -- a file the apps carry; the export has no image server */}
              <img src={cover.src} alt={cover.alt} className="block h-[168px] w-full object-cover object-[50%_22%] md:h-[220px] md:rounded-[18px]" />
              <figcaption
                dir="auto"
                data-mock-allow="cut"
                data-mock-why="a picture's credit, kept to one small line under the cover; the whole of it is in the cover's own list"
                title={cover.credit}
                className="truncate px-5 pt-1.5 font-sans text-[12px] text-paper/70 md:px-1"
              >
                {cover.credit}
              </figcaption>
            </figure>
          ) : null}

          {shareable ? <SharedPageLine share={share} /> : null}
          {draft.source || draft.prompt ? (
            <div className="pt-4">
              <SourceCard source={draft.source} prompt={draft.prompt?.text} sourceLabel={sourceLabel} openLink={!fromVerse} />
            </div>
          ) : null}

          {isNote ? null : (
            // The kind, as the house's track (.set-track): one small choice,
            // one form. A tap on one holds the cursor where it is, as the
            // page's control does: the keyboard stays up and the words keep
            // their place.
            <div role="radiogroup" aria-label={t("journal.kindLabel")} data-journal-kinds="" className="set-track !mt-4" style={{ "--set-cols": JOURNAL_KINDS.length } as CSSProperties}>
              {JOURNAL_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={draft.kind === k}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => change({ ...draft, kind: k })}
                  className="hit-44"
                  // The lit choice stands on its raised plate (::before), which
                  // checkMock cannot read as a ground (components/settings/LitPanel.tsx, Track).
                  data-mock-allow={draft.kind === k ? "contrast" : undefined}
                  data-mock-why={draft.kind === k ? "the lit choice on its raised plate (::before), 11:1 or more, measured" : undefined}
                >
                  {t(KIND_KEY[k])}
                </button>
              ))}
            </div>
          )}

          {isNote ? (
            <label className="mt-5 block">
              <span className="sr-only">{t("journal.composer.label")}</span>
              <textarea dir="auto"
                value={draft.body}
                maxLength={MAX_BODY}
                rows={6}
                onChange={(e) => change({ ...draft, body: e.target.value })}
                placeholder={t(draft.editing?.startsWith("note:words:") ? "saints.words.note" : "bible.notePlaceholder")}
                className="block min-h-[40vh] w-full resize-none bg-transparent font-serif text-body leading-[1.7] text-paper placeholder:text-paper/55 focus:outline-none"
              />
            </label>
          ) : (
            <PageBlocks editor={editor} placeholder={t("journal.composer.placeholder")} onPage onProps={() => setSheet("notebook")} />
          )}
        </div>
      </section>

      {isNote ? null : (
        <>
          {/* The page's one control. It takes no cursor from the words, so
              the keyboard stays as it is; its place is app/globals.css
              (.journal-add): at the foot's start side over the safe area,
              and with the keyboard up alone just above the keys. */}
          <button
            type="button"
            data-journal-add=""
            aria-label={t("journal.page.tools")}
            aria-haspopup="dialog"
            aria-expanded={sheet !== null}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => setSheet("menu")}
            className="journal-add tap-press inline-flex h-11 w-11 items-center justify-center rounded-full bg-night-soft text-paper shadow-[0_10px_26px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-paper/15"
          >
            <Plus size={20} />
          </button>
          <WriteSheet open={sheet !== null} start={sheet ?? "menu"} onClose={() => setSheet(null)} editor={editor} notebooks={notebooks} locked={locked} share={shareable ? share : null} />
        </>
      )}
    </>
  );
}
