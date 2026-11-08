"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { PlusMark } from "@/components/billing/PlusMark";
import { ClosedBook } from "@/components/ui/icons/ClosedBook";
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
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { dateLocale } from "@/lib/i18n/deviceDates";
import {
  addRecord,
  clearDraft,
  dismissPlanDay,
  readDraft,
  removeRecord,
  restoreRecord,
  updateRecord,
  useDismissedPlanDays,
  useJournalRecords,
  writeDraft,
  type JournalDraft,
  type JournalSource,
} from "@/lib/journal/entries";
import { READING_KIND_KEY, verseSpan } from "@/lib/journal/churchDay";
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
    setWaitingDraft(!!kept && kept.body.trim().length > 0);
  }, []);

  const begin = useCallback((next: JournalDraft) => {
    setDraft(next);
    writeDraft(next);
    setOpen(true);
  }, []);

  const write = () => {
    const kept = readDraft();
    begin(kept && (kept.body.trim() || kept.prompt || kept.editing) ? kept : BLANK);
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
    const r = item.record;
    if (r) begin({ kind: r.kind, body: r.body, prompt: r.prompt, source: r.source, editing: r.id });
  };

  const change = (next: JournalDraft) => {
    setDraft(next);
    writeDraft(next);
  };

  const close = () => {
    setOpen(false);
    const keep = draft.body.trim().length > 0;
    if (!keep) clearDraft();
    setWaitingDraft(keep);
  };

  const done = () => {
    const body = draft.body.trim();
    const editing = draft.editing;
    if (editing?.startsWith("note:")) {
      const [, book, chapter, verse] = editing.split(":");
      const before = readVerseAnnotation(book, Number(chapter), Number(verse));
      const noteAt = !body ? undefined : body === before.note ? before.noteAt : new Date().toISOString();
      writeVerseAnnotation(book, Number(chapter), Number(verse), { ...before, note: body || undefined, noteAt, at: undefined });
    } else if (editing) {
      if (body) updateRecord(editing, { kind: draft.kind, body, prompt: draft.prompt, source: draft.source });
      else removeRecord(editing);
    } else if (body) {
      addRecord({ kind: draft.kind, body, prompt: draft.prompt, source: draft.source });
    }
    clearDraft();
    setWaitingDraft(false);
    setOpen(false);
    if (body) softTick();
  };

  // ── Taking away, with Undo ───────────────────────────────────────────
  const remove = (item: JournalItem) => {
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
        {rail ? <NotebookRail notebooks={notebooks} chosen={book} onChoose={setBook} /> : null}
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
                        <p className="line-clamp-3 whitespace-pre-line font-serif text-body leading-[1.6] text-paper/90">{n.note}</p>
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
                    className="tap-press mt-2 block text-start font-serif text-lede leading-[1.5] text-paper"
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
 * then each notebook the pages name; the one shown stays lit.
 */
function NotebookRail({ notebooks, chosen, onChoose }: { notebooks: readonly string[]; chosen: string | null; onChoose: (notebook: string | null) => void }) {
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
                <ClosedBook size={16} className="shrink-0" />
                <span className="min-w-0 truncate">{n}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
