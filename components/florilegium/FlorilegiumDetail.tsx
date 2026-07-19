"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  useFlorilegia,
  type FlorilegiumItem,
} from "@/lib/florilegium/florilegium";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * One florilegium: its gathered lines, each rendered as a pull-quote
 * with its source and the reader's own note beneath. Local-first via
 * useFlorilegia. If the id is unknown (e.g. deleted on another device,
 * or a stale link), fall through to notFound after the store has had a
 * chance to hydrate.
 */
export function FlorilegiumDetail({ id }: { id: string }) {
  const { t } = useTranslate();
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
        <div className="mt-10 rounded-md border border-paper/12 bg-paper/[0.02] px-5 py-10 text-center">
          <p className="font-serif italic text-lede text-paper/65">
            {t("study.florilegium.gone")}
          </p>
          <p className="mt-3">
            <Link
              href="/florilegium"
              className="font-sans text-detail text-gold/85 underline decoration-gold/30 underline-offset-4 hover:text-gold"
            >
              {t("study.florilegium.backToYours")}
            </Link>
          </p>
        </div>
      );
    }
    notFound();
  }

  return (
    <div className="mt-8">
      <Link
        href="/florilegium"
        className="font-sans text-detail text-paper/55 hover:text-paper transition-colors"
      >
        {t("study.florilegium.yoursArrow")}
      </Link>

      <h1 className="mt-4 font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
        {f.title}
      </h1>
      {f.description ? (
        <p className="mt-3 font-serif italic text-lede text-paper/70 leading-[1.55]">
          {f.description}
        </p>
      ) : null}
      <p className="mt-3 font-sans text-caption text-paper/45">
        {f.items.length} {f.items.length === 1 ? "line" : "lines"} {t("study.gathered")}
      </p>

      {f.items.length === 0 ? (
        <div className="mt-10 rounded-md border border-paper/12 bg-paper/[0.02] px-5 py-10 text-center">
          <p className="font-serif italic text-body text-paper/60 leading-[1.6] max-w-[48ch] mx-auto">
            {t("study.nothingGatheredYetAsYou")}
          </p>
        </div>
      ) : (
        <ul className="mt-10 space-y-8">
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
          className="font-sans text-detail text-paper/45 hover:text-paper/80 transition-colors"
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

  const sourceLabel =
    item.kind === "scripture"
      ? item.reference
      : [item.author, item.work].filter(Boolean).join(", ");
  const href =
    item.kind === "scripture"
      ? `/bible/${item.book}/${item.chapter}`
      : item.href;

  return (
    <div>
      <blockquote className="border-l border-gold/40 pl-5 font-serif italic text-body text-paper/90 leading-[1.7]">
        {item.text}
      </blockquote>
      <p className="mt-2 pl-5 font-sans text-caption uppercase tracking-[1.2px] text-paper/55">
        {href ? (
          <Link href={href} className="hover:text-paper transition-colors">
            {sourceLabel}
          </Link>
        ) : (
          sourceLabel
        )}
      </p>

      {editing ? (
        <div className="mt-3 pl-5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={t("study.florilegium.notePlaceholder")}
            className="w-full bg-paper/[0.04] border border-paper/20 rounded-md px-3 py-2 font-serif text-detail text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/50 transition-colors"
          />
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => {
                onNote(draft);
                setEditing(false);
              }}
              className="font-sans text-detail font-semibold rounded-pill px-4 py-2 bg-paper text-night hover:bg-paper/90 transition-colors"
            >
              {t("study.florilegium.saveNote")}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(item.note ?? "");
                setEditing(false);
              }}
              className="font-sans text-detail text-paper/60 hover:text-paper transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 pl-5 flex items-start gap-4">
          {item.note ? (
            <p className="flex-1 font-serif text-detail text-paper/70 leading-[1.6]">
              {item.note}
            </p>
          ) : (
            <span className="flex-1" />
          )}
          <div className="shrink-0 flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-sans text-caption text-paper/45 hover:text-paper/80 transition-colors"
            >
              {item.note ? "Edit note" : "Add note"}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="font-sans text-caption text-paper/45 hover:text-paper/80 transition-colors"
            >
              {t("prayers.diptychs.remove")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
