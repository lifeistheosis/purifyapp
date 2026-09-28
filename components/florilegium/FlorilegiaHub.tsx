"use client";

import { useState } from "react";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD, CARD_BG, CTA, ICON_TILE } from "@/components/ui/Graphite";
import { Flower } from "@/components/ui/icons/Flower";
import { Plus } from "@/components/ui/icons/Plus";
import { cn } from "@/lib/cn";
import { useFlorilegia, type Florilegium, type FlorilegiumItem } from "@/lib/florilegium/florilegium";
import { useMounted } from "@/lib/useMounted";

/** Where a gathered line came from, as its card prints it. */
export function itemSource(item: FlorilegiumItem): string {
  return item.kind === "scripture"
    ? item.reference
    : [item.author, item.work].filter(Boolean).join(", ");
}

/**
 * The Florilegium hub: the reader's collections, newest first, plus a way to
 * begin a new one. Local-first; the list comes straight from localStorage via
 * useFlorilegia, so it is instant and works offline. Sign-in (with Plus)
 * syncs it across devices.
 *
 * Redrawn 2026-09-28 at the owner's request. Each gathering is a graphite
 * card that shows its newest line and where it came from, so a reader can
 * tell their gatherings apart by what is in them and not by name alone; they
 * were a list of names with a count. "Begin a new gathering" is the first
 * card of the grid and opens into the naming form in place.
 */
export function FlorilegiaHub() {
  const { t } = useTranslate();
  const { florilegia, create } = useFlorilegia();
  const mounted = useMounted();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create(title);
    setTitle("");
    // Stay on the hub; the new collection appears first among the
    // gatherings. The reader can open it to begin gathering.
    setCreating(false);
  }

  function cancel() {
    setCreating(false);
    setTitle("");
  }

  const empty = mounted && florilegia.length === 0;

  return (
    <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <li className="min-w-0">
        {creating ? (
          <form
            onSubmit={submit}
            className={cn(CARD, "h-full min-h-[240px] rounded-[28px] hover:translate-y-0")}
            style={CARD_BG}
          >
            <span aria-hidden className={ICON_TILE}>
              <Flower size={24} />
            </span>
            <label
              htmlFor="florilegium-title"
              className="mt-6 block font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55"
            >
              {t("study.florilegium.nameThisGathering")}
            </label>
            <input
              id="florilegium-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancel();
              }}
              placeholder={t("study.florilegium.hubPlaceholder")}
              maxLength={80}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="mt-2 w-full rounded-pill border border-paper/20 bg-paper/[0.05] px-4 py-3 font-sans text-ui text-paper transition-colors placeholder:text-paper/40 focus:border-paper/50 focus:outline-none"
            />
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90"
              >
                {t("today.prayNow.begin")}
              </button>
              <button
                type="button"
                onClick={cancel}
                className="inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-ui font-medium text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            // Short on a phone, where it stacks above the gatherings; the
            // height of its neighbours in a grid row.
            className="flex h-full min-h-[132px] w-full flex-col items-start rounded-[28px] border-2 border-dashed border-paper/15 p-6 text-left transition-colors duration-150 hover:border-paper/35 hover:bg-paper/[0.03] sm:min-h-[240px] sm:p-7 md:p-8"
          >
            <span aria-hidden className={ICON_TILE}>
              <Plus size={22} />
            </span>
            <span className="mt-auto block pt-5 font-heading text-title-sm font-bold leading-tight text-paper sm:pt-8">
              {t("study.florilegium.beginNewArrow")}
            </span>
          </button>
        )}
      </li>

      {empty ? (
        <li className={cn(CARD, "min-h-[240px] rounded-[28px] hover:translate-y-0 sm:col-span-1 lg:col-span-2")} style={CARD_BG}>
          <p className="font-serif text-title-sm italic leading-[1.4] text-paper/80">
            {t("study.florilegium.definition")}
          </p>
          <p className="mt-4 max-w-[52ch] font-sans text-detail leading-[1.6] text-paper/60">
            {t("study.asYouReadKeepThe")}
          </p>
        </li>
      ) : (
        florilegia.map((f) => (
          <li key={f.id} className="min-w-0">
            <GatheringCard f={f} />
          </li>
        ))
      )}
    </ul>
  );
}

function GatheringCard({ f }: { f: Florilegium }) {
  const { tn } = useTranslate();
  const newest = f.items[0];
  return (
    <Link href={`/florilegium/${f.id}`} className={cn(CARD, "h-full min-h-[240px] rounded-[28px]")} style={CARD_BG}>
      <div className="flex items-start justify-between gap-4">
        <span aria-hidden className={ICON_TILE}>
          <Flower size={24} />
        </span>
        <span className="font-sans text-caption tabular-nums text-paper/55">
          {tn("study.florilegium.lineCount", f.items.length)}
        </span>
      </div>
      <p className="mt-6 line-clamp-2 font-heading text-title-sm font-bold leading-tight text-paper">{f.title}</p>
      {f.description ? (
        <p className="mt-1.5 line-clamp-2 font-serif text-detail italic leading-[1.5] text-paper/60">
          {f.description}
        </p>
      ) : null}
      {newest ? (
        <figure className="mt-5">
          <blockquote className="line-clamp-3 border-l-2 border-paper/15 pl-3 font-serif text-detail italic leading-[1.6] text-paper/75">
            {newest.text}
          </blockquote>
          <figcaption className="mt-2 truncate pl-3 font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/45">
            {itemSource(newest)}
          </figcaption>
        </figure>
      ) : null}
      <p className={cn(CTA, "mt-auto pt-6")}>
        <span aria-hidden>→</span>
      </p>
    </Link>
  );
}
