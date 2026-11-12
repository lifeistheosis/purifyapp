"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { PlusMark } from "@/components/billing/PlusMark";
import { ClosedBook } from "@/components/ui/icons/ClosedBook";
import { Flower } from "@/components/ui/icons/Flower";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { JournalComposer } from "@/components/journal/JournalComposer";
import { JournalFeed } from "@/components/journal/JournalFeed";
import { JournalPrompts } from "@/components/journal/JournalPrompts";
import { TodayPage } from "@/components/journal/TodayPage";
import { WriteButton } from "@/components/journal/WriteButton";
import { UndoBar } from "@/components/ui/UndoBar";
import { readVerseAnnotation, writeVerseAnnotation } from "@/lib/bible/annotations";
import { localBookNames } from "@/lib/bible/books";
import { fromThisDay, useJournal } from "@/lib/bible/journal";
import { useFlorilegia } from "@/lib/florilegium/florilegium";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { dateLocale } from "@/lib/i18n/deviceDates";
import {
  clearDraft,
  dismissPlanDay,
  readDraft,
  readRecords,
  removeRecord,
  restoreRecord,
  useDismissedPlanDays,
  useJournalRecords,
  writeDraft,
  type JournalDraft,
  type JournalRecord,
  type JournalSource,
} from "@/lib/journal/entries";
import { READING_KIND_KEY, verseSpan } from "@/lib/journal/churchDay";
import { takeJournalPage } from "@/lib/journal/gatheringActions";
import { gatheringOf } from "@/lib/journal/gatherings";
import { draftWaits, keepDone, keepWaiting, openKeeping } from "@/lib/journal/keepDraft";
import { parsePage } from "@/lib/journal/page";
import { takeJournalOpen } from "@/lib/journal/quoteInJournal";
import { emptyPromptKey, journalFeed, noteKey, planPrompts, type JournalItem, type PlanQuestion } from "@/lib/journal/feed";
import { dayGuide } from "@/lib/plans/guide";
import { usePlanGuide } from "@/lib/plans/guideContent";
import { dayLabel, getPlan } from "@/lib/plans/plans";
import { usePlans } from "@/lib/plans/progress";
import { useIsNative } from "@/lib/platform/native";
import { printPart } from "@/lib/ui/printPart";
import { softTick } from "@/lib/ui/softTick";
import { useUndo } from "@/lib/ui/useUndo";
import { useMounted } from "@/lib/useMounted";

const BLANK: JournalDraft = { kind: "reflection", body: "" };

/**
 * The journal (1.7, the owner's note 23: "the journal feels thin and not made
 * for phones. Needs a lot of work").
 *
 * Its own entries (lib/journal/entries.ts) and the notes written on verses
 * (lib/bible/journal.ts), in one list by day (components/journal/
 * JournalFeed.tsx). One Write button always in reach, which opens a sheet as
 * tall as the screen (components/journal/JournalComposer.tsx). A reading
 * plan's questions wait at the top until answered or put aside; an empty
 * journal offers one gentle prompt rather than a blank page.
 *
 * Everyone's, from 1.9 (his word of 2026-11-08: "let's make the free version
 * just a journal, right, for you"; docs/1.9-build/JOURNAL.md). Writing, the
 * days, today's page and every entry are free. What Plus adds is shown, never
 * hidden: From this day and the journal's search carry the Plus mark and open
 * the upgrade sheet named for the journal. Printing stays free, as the
 * library's export does: what a reader wrote is theirs to keep.
 */
export function JournalClient() {
  const { t, locale } = useTranslate();
  const native = useIsNative();
  const mounted = useMounted();
  const locked = usePlusFeatures() === false;
  const upgrade = useUpgradeModal();
  const notes = useJournal();
  const records = useJournalRecords();
  const dismissed = useDismissedPlanDays();
  const plans = usePlans();
  const guide = usePlanGuide(locale);
  const { entry, offer, undo } = useUndo();

  const items = useMemo(() => journalFeed(notes, records), [notes, records]);
  // Plus: the notebooks the pages name (lib/journal/page.ts). A notebook is
  // the pages that name it, so there is no list of them to keep in step.
  const notebooks = useMemo(() => {
    const names = new Set<string>();
    for (const r of records) {
      if (r.deletedAt) continue;
      const name = parsePage(r.body).notebook;
      if (name) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [records]);
  // The reader's gatherings (1.9, build 93 note 19): a notebook that bears a
  // gathering's name is that gathering's (lib/journal/gatherings.ts), and the
  // list says so and leads to it.
  const { florilegia } = useFlorilegia();
  const gatherings = useMemo(() => florilegia.map((f) => ({ id: f.id, name: f.title, lines: f.items.length })), [florilegia]);
  const books = useMemo(() => localBookNames(t), [t]);
  const bookName = useCallback((slug: string) => books[slug] ?? t(`bible.books.${slug}`), [books, t]);
  const sourceLabel = useCallback(
    (s: JournalSource) => {
      if (s.type === "verse") return `${bookName(s.book)} ${s.chapter}:${s.verse}`;
      if (s.type === "chapter") return `${bookName(s.book)} ${s.chapter}`;
      if (s.type === "reading") return `${t(READING_KIND_KEY[s.kind])} · ${bookName(s.book)} ${s.chapter}:${verseSpan(s.from, s.to)}`;
      const plan = getPlan(s.planId);
      const day = plan?.days[s.day];
      return day ? t("plans.continueDay", { day: s.day + 1, reading: dayLabel(day, bookName) }) : s.label;
    },
    [bookName, t],
  );

  const waiting = useMemo(
    () => (guide ? planPrompts(plans, records, dismissed, (planId, day) => dayGuide(guide.own, guide.en, planId, day)?.questions ?? null) : null),
    [guide, plans, records, dismissed],
  );
  const [now] = useState(() => new Date());
  // The notebook the list shows: chosen by its chip, or at the side on a computer.
  const [book, setBook] = useState<string | null>(null);
  const rail = notebooks.length > 0;
  const remembered = useMemo(() => fromThisDay(notes, now).slice(0, 2), [notes, now]);

  // ── Writing ──────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<JournalDraft>(BLANK);
  const [waitingDraft, setWaitingDraft] = useState(false);
  useEffect(() => {
    const kept = readDraft();
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the kept
       draft is on the device, read after the first paint. */
    setWaitingDraft(!!kept && draftWaits(kept));
  }, []);

  // What waits is kept before anything else opens, and the same page goes on
  // (lib/journal/waiting.ts). Until 2026-11-11 the page opened here took the
  // waiting one's place: half a thought, closed, was lost to the next entry
  // tapped (the journal's fact 17).
  const begin = useCallback((next: JournalDraft) => {
    const page = openKeeping(next);
    setDraft(page);
    writeDraft(page);
    setOpen(true);
  }, []);

  // Write goes on with the page that waits, or with a question put to the
  // reader and not yet answered; with neither, a new page.
  const write = () => {
    const kept = readDraft();
    begin(kept && (draftWaits(kept) || (!kept.editing && kept.prompt)) ? kept : BLANK);
  };

  // A quote just laid on the page being written (Quote in journal, from a
  // held paragraph or a verse's Study; lib/journal/quoteInJournal.ts): the
  // journal opens on that page.
  useEffect(() => {
    if (!mounted || !takeJournalOpen()) return;
    const kept = readDraft();
    if (!kept) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the ask
       is on the device, read once after the first paint. */
    begin(kept);
  }, [mounted, begin]);

  const openRecord = useCallback((r: JournalRecord) => begin({ kind: r.kind, body: r.body, prompt: r.prompt, source: r.source, editing: r.id }), [begin]);

  // One of a gathering's pages, asked for from the gathering (components/
  // florilegium/GatheringPages.tsx): the journal opens on it.
  useEffect(() => {
    if (!mounted) return;
    const id = takeJournalPage();
    const asked = id ? readRecords().find((r) => r.id === id && !r.deletedAt) : undefined;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the ask
       is on the device, read once after the first paint. */
    if (asked) openRecord(asked);
  }, [mounted, openRecord]);

  const answer = (q: PlanQuestion) => {
    if (!waiting) return;
    const source: JournalSource = { type: "plan-day", planId: waiting.planId, day: waiting.day, label: "" };
    begin({ kind: "question", body: "", prompt: { key: q.key, text: q.text }, source: { ...source, label: sourceLabel(source) } });
  };

  const openItem = (item: JournalItem) => {
    if (item.note) {
      const n = item.note;
      begin({
        kind: "reflection",
        body: n.note,
        source: { type: "verse", book: n.book, chapter: n.chapter, verse: n.verse, label: `${bookName(n.book)} ${n.chapter}:${n.verse}` },
        editing: noteKey(n.book, n.chapter, n.verse),
      });
      return;
    }
    if (item.record) openRecord(item.record);
  };

  const change = (next: JournalDraft) => {
    setDraft(next);
    writeDraft(next);
  };

  // What waits is what is not kept yet (lib/journal/waiting.ts, `waits`). A
  // page with nothing on it does not: one that only names its notebook (begun
  // from a gathering and closed) is no page yet. Nor does a kept entry opened
  // to be read and left as it was: Write begins a new page after it.
  const close = () => {
    setOpen(false);
    const keep = draftWaits(draft);
    if (!keep) clearDraft();
    setWaitingDraft(keep);
  };

  // Done's rules are lib/journal/waiting.ts (`keeping`), the same ones a page
  // that waits is kept by.
  const done = () => {
    keepDone(draft);
    clearDraft();
    setWaitingDraft(false);
    setOpen(false);
    if (draft.body.trim()) softTick();
  };

  // ── Taking away, with Undo ───────────────────────────────────────────
  const remove = (item: JournalItem) => {
    // The page taken away is the one that waits with changes: they are kept on
    // it first, so Undo brings back what was written, and nothing waits on a
    // page that is gone. Until 2026-11-11 Continue writing then opened it, and
    // Done put the words on the removed entry, where no one saw them again.
    const waiting = readDraft();
    const itemKey = item.note ? noteKey(item.note.book, item.note.chapter, item.note.verse) : item.record?.id;
    if (waiting?.editing && waiting.editing === itemKey) {
      keepWaiting(waiting);
      clearDraft();
      setWaitingDraft(false);
    }
    if (item.note) {
      const n = item.note;
      const before = readVerseAnnotation(n.book, n.chapter, n.verse);
      // The note goes; a highlight on the verse stays.
      writeVerseAnnotation(n.book, n.chapter, n.verse, { ...before, note: undefined, noteAt: undefined, at: undefined });
      offer({ label: t("journal.deleted"), restore: () => writeVerseAnnotation(n.book, n.chapter, n.verse, { ...before, at: undefined }) });
      return;
    }
    if (item.record) {
      const id = item.record.id;
      removeRecord(id);
      offer({ label: t("journal.deleted"), restore: () => restoreRecord(id) });
    }
  };

  const dayOf = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(dateLocale(locale), { month: "long", day: "numeric", year: "numeric" }).format(new Date(iso));
    } catch {
      return "";
    }
  };

  const plan = waiting ? getPlan(waiting.planId) : null;

  return (
    <>
      {/* On a computer, with notebooks, the notebooks stand at the side and
          the page in its column of 720px (1.9, JOURNAL.md); in the apps, a
          tablet keeps the phone's one column. */}
      <div className={cn(rail ? "md:mx-auto md:grid md:max-w-[968px] md:grid-cols-[200px_minmax(0,1fr)] md:gap-12 native-md-block" : "mx-auto max-w-[760px]")}>
        {rail ? <NotebookRail notebooks={notebooks} gatherings={gatherings} chosen={book} onChoose={setBook} /> : null}
        <div className="min-w-0">
          <header className="flex items-end justify-between gap-6">
            <div className="min-w-0">
              <h1 id="journal-title" className="text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper md:text-heading">
                {t("journal.title")}
              </h1>
              <p className="mt-2 max-w-[60ch] font-sans text-detail leading-[1.6] text-paper/55">{t("journal.lede")}</p>
            </div>
            {mounted ? (
              <div className="hidden shrink-0 md:block native-md-hidden">
                <WriteButton placement="inline" onClick={write} draft={waitingDraft} />
              </div>
            ) : null}
          </header>

          {!mounted ? (
            <div className="min-h-[50vh]" />
          ) : (
            <div className="pb-28">
              <TodayPage onWriteFrom={(source) => begin({ kind: "reflection", body: "", source: { ...source, label: sourceLabel(source) } })} />
              {waiting && plan ? (
                <JournalPrompts
                  waiting={waiting}
                  dayLabel={t("plans.continueDay", { day: waiting.day + 1, reading: dayLabel(plan.days[waiting.day], bookName) })}
                  onAnswer={answer}
                  onNotNow={() => dismissPlanDay(waiting.planId, waiting.day)}
                />
              ) : remembered.length > 0 && locked ? (
                // Plus shown, never hidden: a note from this day is waiting, and
                // bringing it back is Plus's (lib/bible/journal.ts, fromThisDay).
                <section aria-labelledby="journal-remembered" data-journal-remembered="locked" className="mt-6 border-y border-paper/10 py-4">
                  <p id="journal-remembered" role="heading" aria-level={2} className="flex flex-wrap items-center gap-2 font-sans text-caption font-semibold text-paper/60">
                    {t("journal.fromThisDay")}
                    <PlusMark />
                  </p>
                  <button
                    type="button"
                    onClick={() => upgrade.open("journal")}
                    className="tap-press mt-1 block min-h-11 w-full py-1 text-start font-serif text-body leading-[1.6] text-paper/85"
                  >
                    {t("journal.fromThisDayPlus")}
                  </button>
                </section>
              ) : remembered.length > 0 ? (
                <section aria-labelledby="journal-remembered" className="mt-6 border-y border-paper/10 py-4">
                  <p id="journal-remembered" role="heading" aria-level={2} className="font-sans text-caption font-semibold text-paper/60">
                    {t("journal.fromThisDay")}
                  </p>
                  <ul className="mt-2 space-y-3">
                    {remembered.map((n) => (
                      <li key={noteKey(n.book, n.chapter, n.verse)}>
                        <p dir="auto" className="line-clamp-3 whitespace-pre-line font-serif text-body leading-[1.6] text-paper/90">{n.note}</p>
                        <p className="mt-1 font-sans text-caption text-paper/50">
                          {`${bookName(n.book)} ${n.chapter}:${n.verse}`}
                          {n.at ? ` · ${dayOf(n.at)}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {items.length === 0 ? (
                <section aria-labelledby="journal-empty" data-journal-empty="" className="mt-8 border-y border-paper/10 py-6">
                  <p id="journal-empty" role="heading" aria-level={2} className="font-sans text-caption font-semibold text-paper/60">
                    {t("journal.emptyTitle")}
                  </p>
                  <button
                    type="button"
                    onClick={() => begin({ kind: "reflection", body: "", prompt: { text: t(emptyPromptKey(now)) } })}
                    // 44 to the touch where it stands on one line (a tablet: 28.5px tall, the store pictures' run of 2026-11-12).
                    className="tap-press hit-44 mt-2 block text-start font-serif text-lede leading-[1.5] text-paper"
                  >
                    {t(emptyPromptKey(now))}
                  </button>
                  <p className="mt-4 font-sans text-detail leading-[1.6] text-paper/55">{t("journal.emptyLine")}</p>
                </section>
              ) : (
                <>
                  <JournalFeed
                    items={items}
                    onOpen={openItem}
                    onRemove={remove}
                    sourceLabel={sourceLabel}
                    onSearchLocked={locked ? () => upgrade.open("journal") : undefined}
                    notebooks={notebooks}
                    gatherings={gatherings}
                    notebook={book}
                    onNotebook={setBook}
                    railShown={rail}
                  />
                  {/* 1.9 (s4-09, "a reader's journal is theirs"): on the website, the
                      browser's own print, whose dialog saves a PDF; the page prints
                      its entries alone (lib/ui/printPart.ts). The
                      apps' WebView cannot print: there the journal leaves with
                      Export your library, through the share sheet. */}
                  {!native ? (
                    <button
                      type="button"
                      onClick={printPart}
                      className="tap-press mt-6 inline-flex min-h-11 items-center font-sans text-detail font-semibold text-paper/70 underline-offset-4 hover:text-paper hover:underline"
                    >
                      {t("journal.print")}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {mounted && !entry ? <WriteButton placement="foot" onClick={write} draft={waitingDraft} /> : null}
      <JournalComposer open={open} draft={draft} onChange={change} onClose={close} onDone={done} sourceLabel={sourceLabel} notebooks={notebooks} />
      <UndoBar entry={entry} onUndo={undo} />
    </>
  );
}

/**
 * Plus: the notebooks at the side of the journal, on a computer (1.9,
 * JOURNAL.md, "notebooks at the side, the page in a column of 720px"). All,
 * then each notebook the pages name; the one shown stays lit. A notebook that
 * is a gathering's wears the Florilegium's flower (build 93 note 19).
 */
function NotebookRail({
  notebooks,
  gatherings,
  chosen,
  onChoose,
}: {
  notebooks: readonly string[];
  /** The reader's gatherings: a notebook that bears one's name wears the flower. */
  gatherings: readonly { name: string }[];
  chosen: string | null;
  onChoose: (notebook: string | null) => void;
}) {
  const { t } = useTranslate();
  const item = (on: boolean) =>
    cn(
      "tap-press flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-xl px-3 text-start font-sans text-detail font-semibold motion-safe:transition-colors",
      on ? "bg-paper/[0.1] text-paper" : "text-paper/75 hover:bg-paper/[0.05] hover:text-paper",
    );
  return (
    <nav aria-label={t("journal.notebooks")} data-journal-rail="" className="hidden md:block native-md-hidden">
      <div className="sticky top-24 pt-2">
        <p className="px-3 font-sans text-caption font-semibold text-paper/70">{t("journal.notebooks")}</p>
        <ul className="mt-2 space-y-0.5">
          <li>
            <button type="button" aria-pressed={!chosen} onClick={() => onChoose(null)} className={item(!chosen)}>
              {t("common.all")}
            </button>
          </li>
          {notebooks.map((n) => (
            <li key={n}>
              <button type="button" aria-pressed={chosen === n} onClick={() => onChoose(chosen === n ? null : n)} className={item(chosen === n)}>
                {gatheringOf(n, gatherings) ? <Flower size={16} className="shrink-0" /> : <ClosedBook size={16} className="shrink-0" />}
                <span className="min-w-0 truncate">{n}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
