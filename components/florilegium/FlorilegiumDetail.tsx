"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { itemSource } from "@/components/florilegium/FlorilegiaHub";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CARD, CARD_BG, Eyebrow, ICON_TILE_SM, PILL } from "@/components/ui/Graphite";
import { Book } from "@/components/ui/icons/Book";
import { Quill } from "@/components/ui/icons/Quill";
import { cn } from "@/lib/cn";
import {
  useFlorilegia,
  type FlorilegiumItem,
} from "@/lib/florilegium/florilegium";

const SMALL_PILL =
  "inline-flex min-h-11 items-center rounded-pill px-3.5 font-sans text-caption font-medium text-paper/65 transition-colors hover:bg-paper/10 hover:text-paper";

/**
 * One florilegium: its gathered lines, each rendered as a pull-quote
 * with its source and the reader's own note beneath. Local-first via
 * useFlorilegia. If the id is unknown (e.g. deleted on another device,
 * or a stale link), fall through to notFound after the store has had a
 * chance to hydrate.
 *
 * Redrawn 2026-09-28 at the owner's request: each line is a graphite card
 * with its source's mark (the Scriptures or a Father), the quotation set
 * large, and the reader's note in a panel of its own beneath it, where they
 * were a rule, a quote and two grey words.
 */
export function FlorilegiumDetail({ id }: { id: string }) {
  const { t, tn } = useTranslate();
  const { florilegia, remove, removeItem, setItemNote } = useFlorilegia();
  const f = useMemo(
    () => florilegia.find((x) => x.id === id),
    [florilegia, id],
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // The store reads synchronously from localStorage, so by first client
  // render `florilegia` is populated. An unknown id is a genuine miss.
  if (!f) {
    if (typeof window !== "undefined" && florilegia.length >= 0) {
      // Render a gentle empty state rather than a hard 404 inside a
      // client component (notFound() in a client component throws).
      return (
        <div className={cn(CARD, "mt-10 items-center text-center hover:translate-y-0")} style={CARD_BG}>
          <p className="font-serif text-lede italic text-paper/70">{t("study.florilegium.gone")}</p>
          <Link href="/florilegium" className={cn(PILL, "mt-6 text-detail")}>
            {t("study.florilegium.backToYours")}
          </Link>
        </div>
      );
    }
    notFound();
  }

  return (
    <div>
      <Link href="/florilegium" className={cn(PILL, "px-4 py-1.5 text-detail")}>
        <span aria-hidden className="mr-1.5">
          ←
        </span>
        {t("study.florilegium.backToYours")}
      </Link>

      <Eyebrow className="mt-10">{t("study.florilegium.title")}</Eyebrow>
      <h1 className="mt-4 text-heading font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display-sm">
        {f.title}
      </h1>
      {f.description ? (
        <p className="mt-4 font-serif text-lede italic leading-[1.55] text-paper/70">{f.description}</p>
      ) : null}
      <p className="mt-5">
        <span className="inline-flex items-center rounded-pill border border-paper/15 bg-paper/[0.04] px-3 py-1 font-sans text-caption tabular-nums text-paper/65">
          {tn("study.florilegium.lineCount", f.items.length)}
        </span>
      </p>

      {f.items.length === 0 ? (
        <div className={cn(CARD, "mt-10 hover:translate-y-0")} style={CARD_BG}>
          <p className="max-w-[52ch] font-serif text-body italic leading-[1.6] text-paper/65">
            {t("study.nothingGatheredYetAsYou")}
          </p>
        </div>
      ) : (
        <ul className="mt-10 space-y-5">
          {f.items.map((item) => (
            <li key={item.id}>
              <ItemCard
                item={item}
                onRemove={() => removeItem(f.id, item.id)}
                onNote={(note) => setItemNote(f.id, item.id, note)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-16 border-t border-paper/10 pt-6">
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="inline-flex min-h-11 items-center rounded-pill px-3.5 font-sans text-detail text-paper/50 transition-colors hover:bg-crimson/15 hover:text-crimson-soft"
        >
          {t("study.florilegium.deleteThis")}
        </button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title={t("study.florilegium.deleteConfirm")}
        description={t("study.florilegium.deleteDescription")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("study.florilegium.keepIt")}
        destructive
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          remove(f.id);
          if (typeof window !== "undefined") {
            window.location.assign("/florilegium");
          }
        }}
      />
    </div>
  );
}

function ItemCard({
  item,
  onRemove,
  onNote,
}: {
  item: FlorilegiumItem;
  onRemove: () => void;
  onNote: (note: string) => void;
}) {
  const { t } = useTranslate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.note ?? "");

  const source = itemSource(item);
  const href =
    item.kind === "scripture"
      ? `/bible/${item.book}/${item.chapter}`
      : item.href;

  return (
    <article className={cn(CARD, "hover:translate-y-0 md:p-8")} style={CARD_BG}>
      {/* The mark above the quotation on a phone, beside it from sm up, so a
          narrow screen gives the words its whole width. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span aria-hidden className={ICON_TILE_SM}>
          {item.kind === "scripture" ? <Book size={20} /> : <Quill size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <blockquote className="font-serif text-lede italic leading-[1.6] text-paper/90 md:text-title-sm md:leading-[1.55]">
            {item.text}
          </blockquote>
          <p className="mt-3 font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55">
            {href ? (
              <Link href={href} className="transition-colors hover:text-paper">
                {source}
              </Link>
            ) : (
              source
            )}
          </p>
        </div>
      </div>

      {editing ? (
        <div className="mt-6">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            aria-label={t("bible.yourNote")}
            placeholder={t("study.florilegium.notePlaceholder")}
            className="w-full rounded-2xl border border-paper/20 bg-paper/[0.05] px-4 py-3 font-serif text-detail leading-[1.6] text-paper transition-colors placeholder:text-paper/40 focus:border-paper/50 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onNote(draft);
                setEditing(false);
              }}
              className="inline-flex min-h-11 items-center rounded-pill bg-paper px-4 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90"
            >
              {t("study.florilegium.saveNote")}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(item.note ?? "");
                setEditing(false);
              }}
              className={SMALL_PILL}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : item.note ? (
        <div className="mt-6 rounded-2xl bg-paper/[0.04] px-4 py-3.5 ring-1 ring-inset ring-paper/10">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/50">
            {t("bible.yourNote")}
          </p>
          <p className="mt-1.5 font-serif text-detail leading-[1.6] text-paper/80">{item.note}</p>
        </div>
      ) : null}

      {!editing && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setEditing(true)} className={SMALL_PILL}>
            {item.note ? t("bible.editNote") : t("bible.addNote")}
          </button>
          <button type="button" onClick={onRemove} className={SMALL_PILL}>
            {t("prayers.diptychs.remove")}
          </button>
        </div>
      )}
    </article>
  );
}
