"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CoverArt } from "@/components/player/CoverArt";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { Plus } from "@/components/ui/icons/Plus";
import { localBookNames } from "@/lib/bible/books";
import { cn } from "@/lib/cn";
import { useFlorilegia, type Florilegium, type FlorilegiumItem } from "@/lib/florilegium/florilegium";
import { STARTERS, starterItems, starterPicture, starterReference, type Starter } from "@/lib/florilegium/starters";
import { useFlorilegiaSyncedAt, useMinute } from "@/lib/florilegium/syncedAt";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { useMounted } from "@/lib/useMounted";

/** Where a gathered line came from, as its card prints it. */
export function itemSource(item: FlorilegiumItem): string {
  return item.kind === "scripture"
    ? item.reference
    : [item.author, item.work].filter(Boolean).join(", ");
}

/**
 * The Florilegium's first page (1.9, the owner's pick for Keeping of
 * 2026-11-06, "honestly, a whole entire revamp", and for it "a mix of A and
 * C": the reader's collections and the sync line on top, the ready
 * collections below as tiles; docs/1.9-build/BRAINSTORM.md).
 *
 * On top, when this device has exchanged the collections with the server,
 * when it last did (lib/florilegium/syncedAt.ts); never a count of devices,
 * which nothing in the app knows. Then the reader's gatherings as cards in two
 * columns, each with its newest line and where it came from, so a reader
 * tells them apart by what is in them (the owner's request of 2026-09-28),
 * and "Begin a new gathering" first, opening into the naming form in place.
 * Below, four whole passages of Scripture to begin with
 * (lib/florilegium/starters.ts), as picture tiles: a tap shows the passage,
 * and Keep makes it the reader's own gathering, a verse a line. A starter
 * already kept opens the reader's own.
 *
 * Local-first: the list comes straight from localStorage via useFlorilegia,
 * so it is instant and works offline. Sign-in (with Plus) syncs it.
 */
export function FlorilegiaHub() {
  const { t } = useTranslate();
  const router = useRouter();
  const { florilegia, create, addItem } = useFlorilegia();
  const mounted = useMounted();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState<Starter | null>(null);
  const books = useMemo(() => localBookNames(t), [t]);
  const bookName = useCallback((slug: string) => books[slug] ?? t(`bible.books.${slug}`), [books, t]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // An unnamed gathering is named in the reader's language, as the Gather
    // button names it (AddToFlorilegium).
    create(title.trim() || t("study.florilegium.untitled"));
    setTitle("");
    // Stay on the hub; the new collection appears among the gatherings.
    setCreating(false);
  }

  function cancel() {
    setCreating(false);
    setTitle("");
  }

  /** The reader's own copy of a starter: its name and its reference, as Keep wrote them. */
  const keptOf = (s: Starter) =>
    florilegia.find((f) => f.title === t(s.nameKey) && f.description === starterReference(s, bookName(s.book)));

  function keep(s: Starter) {
    const id = create(t(s.nameKey), starterReference(s, bookName(s.book)));
    for (const item of starterItems(s, bookName(s.book))) addItem(id, item);
    setPreview(null);
    router.push(`/florilegium/${id}`);
  }

  const empty = mounted && florilegia.length === 0;

  return (
    <div className="mt-8">
      <SyncLine />
      {empty ? (
        <p className="mt-3 max-w-[52ch] font-serif text-detail italic leading-[1.6] text-paper/65">{t("study.florilegium.definition")}</p>
      ) : null}

      <ul className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3" data-florilegium-yours="">
        <li className="min-w-0">
          {creating ? (
            <form onSubmit={submit} className="flex h-full min-h-[156px] flex-col rounded-[20px] bg-night-soft p-4 ring-1 ring-inset ring-paper/10">
              {/* Its own id: the page's title is florilegium-title. */}
              <label htmlFor="florilegium-name" className="block font-sans text-caption font-semibold text-paper/55">
                {t("study.florilegium.nameThisGathering")}
              </label>
              <input
                id="florilegium-name"
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
                className="mt-2 w-full rounded-pill border border-paper/20 bg-paper/[0.05] px-3.5 py-2.5 font-sans text-ui text-paper transition-colors placeholder:text-paper/40 focus:border-paper/50 focus:outline-none"
              />
              <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-pill bg-paper px-4 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90"
                >
                  {t("today.prayNow.begin")}
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="inline-flex min-h-11 items-center rounded-pill px-3 font-sans text-ui font-medium text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="tap-press flex h-full min-h-[156px] w-full flex-col items-start rounded-[20px] border border-dashed border-paper/20 p-4 text-start transition-colors duration-150 hover:border-paper/35 hover:bg-paper/[0.03]"
            >
              <span aria-hidden className="grid size-10 place-items-center rounded-full bg-paper/10 text-paper">
                <Plus size={20} />
              </span>
              <span className="mt-auto block pt-4 font-sans text-ui font-semibold leading-snug text-paper">{t("study.florilegium.beginNewArrow")}</span>
            </button>
          )}
        </li>
        {florilegia.map((f) => (
          <li key={f.id} className="min-w-0">
            <GatheringCard f={f} />
          </li>
        ))}
      </ul>

      <section aria-labelledby="florilegium-starters" className="mt-10">
        <h2 id="florilegium-starters" className="font-sans text-eyebrow font-semibold uppercase tracking-[0.08em] text-paper/55">
          {t("study.florilegium.starters")}
        </h2>
        <ul className="-mx-5 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0" data-florilegium-starters="">
          {STARTERS.map((s) => {
            const kept = mounted ? keptOf(s) : undefined;
            const picture = starterPicture(s);
            return (
              <li key={s.id} className="w-40 shrink-0 snap-start">
                <button
                  type="button"
                  data-starter={s.id}
                  aria-haspopup={kept ? undefined : "dialog"}
                  onClick={() => (kept ? router.push(`/florilegium/${kept.id}`) : setPreview(s))}
                  className="tap-press relative flex aspect-[4/5] w-full flex-col justify-end overflow-hidden rounded-[18px] bg-night-soft p-3 text-start ring-1 ring-inset ring-paper/10"
                >
                  <CoverArt src={picture.src} fallback={picture.fallback} size={240} className="plan-tile-picture absolute inset-0 h-full w-full" />
                  <span className="relative block font-sans text-ui font-semibold leading-tight text-paper">{t(s.nameKey)}</span>
                  <span className="relative mt-1 flex items-center gap-1.5 font-sans text-caption text-paper/70">
                    {kept ? <Check size={13} className="shrink-0" /> : null}
                    {starterReference(s, bookName(s.book))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <StarterSheet starter={preview} bookName={bookName} onClose={() => setPreview(null)} onKeep={keep} />
    </div>
  );
}

/** When this device last exchanged the collections with the server, if it ever has. */
function SyncLine() {
  const { t, locale } = useTranslate();
  const at = useFlorilegiaSyncedAt();
  const minute = useMinute();
  if (!at || minute === 0) return null;
  const ago = Math.max(0, minute - Math.floor(Date.parse(at) / 60_000));
  // In a language the device can write (lib/i18n/deviceDates.ts).
  const rtf = new Intl.RelativeTimeFormat(dateLocale(locale), { numeric: "auto" });
  const when = ago < 60 ? rtf.format(-ago, "minute") : ago < 1440 ? rtf.format(-Math.round(ago / 60), "hour") : rtf.format(-Math.round(ago / 1440), "day");
  const line = `${t("ui.lastSynced")} ${when}`;
  return (
    <p className="flex items-center gap-2 font-sans text-caption text-paper/60" data-florilegium-synced="">
      <Check size={14} className="shrink-0" />
      {line}
    </p>
  );
}

/** A starter's passage: its reference, Keep, then the passage a verse a line. */
function StarterSheet({
  starter,
  bookName,
  onClose,
  onKeep,
}: {
  starter: Starter | null;
  bookName: (slug: string) => string;
  onClose: () => void;
  onKeep: (s: Starter) => void;
}) {
  const { t } = useTranslate();
  return (
    <Sheet open={starter !== null} onClose={onClose} title={starter ? t(starter.nameKey) : ""} desktop>
      {starter ? (
        <div data-starter-sheet={starter.id}>
          <p className="font-sans text-caption font-semibold text-paper/55">{starterReference(starter, bookName(starter.book))}</p>
          {/* Keep above the passage, in sight without reading to its end. */}
          <button
            type="button"
            onClick={() => onKeep(starter)}
            data-starter-keep=""
            className="tap-press mt-4 inline-flex h-12 w-full items-center justify-center rounded-pill bg-paper font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90"
          >
            {t("study.florilegium.keepStarter")}
          </button>
          <ol className="mt-5 space-y-2.5">
            {starter.lines.map((l) => (
              <li key={l.verse} className="flex gap-2.5 font-serif text-detail leading-[1.65] text-paper/85">
                <span aria-hidden className="w-5 shrink-0 pt-0.5 text-end font-sans text-caption tabular-nums text-paper/40">
                  {l.verse}
                </span>
                <span>{l.text}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </Sheet>
  );
}

function GatheringCard({ f }: { f: Florilegium }) {
  const { tn } = useTranslate();
  const newest = f.items[0];
  return (
    <Link
      href={`/florilegium/${f.id}`}
      className="tap-press flex h-full min-h-[156px] flex-col rounded-[20px] bg-night-soft p-4 ring-1 ring-inset ring-paper/10 transition-colors hover:ring-paper/20"
    >
      <p className="line-clamp-2 font-sans text-ui font-semibold leading-snug text-paper">{f.title}</p>
      <p className="mt-1 font-sans text-caption tabular-nums text-paper/55">{tn("study.florilegium.lineCount", f.items.length)}</p>
      {newest ? (
        <figure className={cn("mt-auto pt-3")}>
          <blockquote className="line-clamp-2 border-s-2 border-paper/15 ps-2.5 font-serif text-caption italic leading-[1.55] text-paper/70">
            {newest.text}
          </blockquote>
          <figcaption className="mt-1 truncate ps-2.5 font-sans text-caption font-semibold text-paper/45">{itemSource(newest)}</figcaption>
        </figure>
      ) : null}
    </Link>
  );
}
