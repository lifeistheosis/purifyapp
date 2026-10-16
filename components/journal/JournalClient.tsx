"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { PlusGate } from "@/components/florilegium/PlusGate";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { JournalComposer } from "@/components/journal/JournalComposer";
import { JournalFeed } from "@/components/journal/JournalFeed";
import { JournalPrompts } from "@/components/journal/JournalPrompts";
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
import { emptyPromptKey, journalFeed, noteKey, planPrompts, type JournalItem, type PlanQuestion } from "@/lib/journal/feed";
import { dayGuide } from "@/lib/plans/guide";
import { usePlanGuide } from "@/lib/plans/guideContent";
import { dayLabel, getPlan } from "@/lib/plans/plans";
import { usePlans } from "@/lib/plans/progress";
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
 * A Purify Plus tool, as before: without Plus the reader meets the Plus card
 * where the entries would be, and the Write button carries the Plus mark and
 * opens the upgrade sheet named for the journal. Their notes stay on every
 * verse they wrote them on, free.
 */
export function JournalClient() {
  const { t, locale } = useTranslate();
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
  const books = useMemo(() => localBookNames(t), [t]);
  const bookName = useCallback((slug: string) => books[slug] ?? t(`bible.books.${slug}`), [books, t]);
  const sourceLabel = useCallback(
    (s: JournalSource) => {
      if (s.type === "verse") return `${bookName(s.book)} ${s.chapter}:${s.verse}`;
      if (s.type === "chapter") return `${bookName(s.book)} ${s.chapter}`;
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

  const begin = useCallback(
    (next: JournalDraft) => {
      if (locked) {
        upgrade.open("journal");
        return;
      }
      setDraft(next);
      writeDraft(next);
      setOpen(true);
    },
    [locked, upgrade],
  );

  const write = () => {
    const kept = readDraft();
    begin(kept && (kept.body.trim() || kept.prompt || kept.editing) ? kept : BLANK);
  };

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
      <header className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 id="journal-title" className="text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper md:text-heading">
            {t("journal.title")}
          </h1>
          <p className="mt-2 max-w-[60ch] font-sans text-detail leading-[1.6] text-paper/55">{t("journal.lede")}</p>
        </div>
        {mounted ? (
          <div className="hidden shrink-0 md:block native-md-hidden">
            <WriteButton placement="inline" onClick={write} locked={locked} draft={waitingDraft} />
          </div>
        ) : null}
      </header>

      {!mounted ? (
        <div className="min-h-[50vh]" />
      ) : locked ? (
        <PlusGate titleKey="plus.journal.title" blurbKey="plus.journal.body" modalFeature="journal" />
      ) : (
        <div className="pb-28">
          {waiting && plan ? (
            <JournalPrompts
              waiting={waiting}
              dayLabel={t("plans.continueDay", { day: waiting.day + 1, reading: dayLabel(plan.days[waiting.day], bookName) })}
              onAnswer={answer}
              onNotNow={() => dismissPlanDay(waiting.planId, waiting.day)}
            />
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
            <JournalFeed items={items} onOpen={openItem} onRemove={remove} sourceLabel={sourceLabel} />
          )}
        </div>
      )}

      {mounted && !entry ? <WriteButton placement="foot" onClick={write} locked={locked} draft={waitingDraft} /> : null}
      <JournalComposer open={open} draft={draft} onChange={change} onClose={close} onDone={done} sourceLabel={sourceLabel} />
      <UndoBar entry={entry} onUndo={undo} />
    </>
  );
}
