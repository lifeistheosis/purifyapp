"use client";

import Link from "next/link";
import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CoverArt } from "@/components/player/CoverArt";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Plus } from "@/components/ui/icons/Plus";
import { cn } from "@/lib/cn";
import { itemSource } from "@/lib/florilegium/asText";
import { useFlorilegia, type Florilegium } from "@/lib/florilegium/florilegium";
import { gatheringHref, starterHref } from "@/lib/florilegium/href";
import { keptStarter, STARTERS, starterPicture, starterReference } from "@/lib/florilegium/starters";
import { useFlorilegiaSyncedAt, useMinute } from "@/lib/florilegium/syncedAt";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { useCoversVersion } from "@/lib/readAloud/useCovers";
import { useMounted } from "@/lib/useMounted";

import { FLOR_FIELD, FLOR_H2, FLOR_PLATE, FLOR_ROW, FLOR_TRAY } from "./florStyle";
import { GatheringRowBody } from "./GatheringRow";
import { useBookName } from "./useBookName";

/** Where a gathered line came from, as its card prints it (lib/florilegium/asText.ts); named here too, for the pages that ask this file. */
export { itemSource };

/**
 * The Florilegium's first page (1.9, build 89 notes 6 and 12; the owner,
 * 2026-11-10, of the starters: "The UX experience on these need to get fixed
 * also, like these, this section and like where it leads to", and of the
 * whole: "I also want the Florilegium, like entire design revamped. I just
 * don't like that"). The plan is docs/1.9-build/notes/florilegium-fable.md.
 *
 * Drawn from the forms he has passed:
 *
 *   Your gatherings   rows in one raised tray, as Theology's pages list
 *                     their places to go: a gathering's name in Lora, its
 *                     newest line under it so a reader tells them apart by
 *                     what is in them (his request of 2026-09-28), and how
 *                     many lines it keeps. The tray's last row begins a new
 *                     one, and opens into the naming field in place.
 *   Begin with a      four whole passages of Scripture to begin with
 *   gathering         (lib/florilegium/starters.ts), as the plans' picture
 *                     tiles, two across. A tile opens the passage's own
 *                     page (StarterPage.tsx), carrying its picture in; one
 *                     the reader already keeps says so in words, where it
 *                     wore a tick with no word for what the tick meant.
 *
 * On top, when this device has exchanged the collections with the server,
 * when it last did (lib/florilegium/syncedAt.ts); never a count of devices,
 * which nothing in the app knows.
 *
 * Local-first: the list comes straight from localStorage via useFlorilegia,
 * so it is instant and works offline. Sign-in (with Plus) syncs it.
 *
 * `readOnly`: a reader whose Plus has lapsed (components/florilegium/
 * FlorilegiumGate.tsx, rec 10): their gatherings to open and read, and
 * nothing that begins or keeps one.
 */
export function FlorilegiaHub({ readOnly = false }: { readOnly?: boolean } = {}) {
  useCoversVersion();
  const { t } = useTranslate();
  const { florilegia, create } = useFlorilegia();
  const mounted = useMounted();
  const bookName = useBookName();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  if (readOnly) {
    return (
      <section aria-labelledby="florilegium-yours" className="mt-9">
        <h2 id="florilegium-yours" className={FLOR_H2}>
          {t("study.florilegium.yours")}
        </h2>
        <ul className={cn(FLOR_TRAY, "mt-2.5")} data-florilegium-yours="">
          {florilegia.map((f) => (
            <li key={f.id} className="theology-rule">
              <GatheringRow f={f} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

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

  const empty = mounted && florilegia.length === 0;

  return (
    <div data-florilegium-hub="">
      <SyncLine />

      <section aria-labelledby="florilegium-yours" className="mt-7">
        <h2 id="florilegium-yours" className={FLOR_H2}>
          {t("study.florilegium.yours")}
        </h2>
        <ul className={cn(FLOR_TRAY, "mt-2.5")} data-florilegium-yours="">
          {empty ? <li className="px-2.5 pb-1.5 pt-3 font-sans text-detail leading-[1.5] text-paper/60">{t("study.florilegium.youHaveNone")}</li> : null}
          {florilegia.map((f) => (
            <li key={f.id} className="theology-rule">
              <GatheringRow f={f} />
            </li>
          ))}
          <li className="theology-rule">
            {creating ? (
              <form onSubmit={submit} className="px-2 pb-2.5 pt-3.5" data-florilegium-naming="">
                {/* Its own id: the page's title is florilegium-title. */}
                <label htmlFor="florilegium-name" className="block font-sans text-caption font-semibold text-paper/60">
                  {t("study.florilegium.nameThisGathering")}
                </label>
                <input dir="auto"
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
                  className={cn(FLOR_FIELD, "mt-2 min-h-12 py-2.5 font-sans text-ui")}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="tap-press inline-flex h-11 items-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90"
                  >
                    {t("today.prayNow.begin")}
                  </button>
                  <button
                    type="button"
                    onClick={cancel}
                    className="tap-press inline-flex h-11 items-center rounded-pill px-3.5 font-sans text-ui font-medium text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={() => setCreating(true)} data-florilegium-begin="" className={FLOR_ROW}>
                <span aria-hidden className={FLOR_PLATE}>
                  <Plus size={18} />
                </span>
                <span className="min-w-0 flex-1 font-sans text-ui font-semibold leading-snug text-paper">{t("study.florilegium.beginNew")}</span>
              </button>
            )}
          </li>
        </ul>
      </section>

      <section aria-labelledby="florilegium-starters" className="mt-9">
        <h2 id="florilegium-starters" className={FLOR_H2}>
          {t("study.florilegium.starters")}
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4" data-florilegium-starters="">
          {STARTERS.map((s) => {
            const reference = starterReference(s, bookName(s.book));
            const kept = mounted ? keptStarter(florilegia, t(s.nameKey), reference) : undefined;
            const picture = starterPicture(s);
            return (
              <li key={s.id}>
                {/* The plans' picture tile (components/plans/PlansClient.tsx). */}
                <Link
                  href={starterHref(s.id)}
                  data-starter={s.id}
                  data-kept={kept ? "" : undefined}
                  className="tap-press relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[18px] bg-night-soft p-3 ring-1 ring-inset ring-paper/10"
                >
                  {/* The picture in a frame of its own, cut to the tile's
                      shape: what travels to the head of the page the tile
                      opens (lib/ui/routeMotion.ts). */}
                  <span data-carry={picture.src} className="absolute inset-0 overflow-hidden rounded-[inherit]">
                    <CoverArt src={picture.src} fallback={picture.fallback} size={240} className="plan-tile-picture absolute inset-0 h-full w-full" />
                  </span>
                  <h3 className="relative font-serif text-[16px] font-semibold leading-[1.15] text-paper">{t(s.nameKey)}</h3>
                  {kept ? (
                    // In words: the tick alone said nothing a reader could read (build 89 note 6).
                    <p className="relative mt-1 flex items-start gap-1.5 font-sans text-caption leading-[1.35] text-paper/85" data-starter-kept="">
                      <Check size={13} aria-hidden className="mt-0.5 shrink-0" />
                      <span>{t("study.florilegium.inYours")}</span>
                    </p>
                  ) : (
                    <p className="relative mt-1 font-sans text-caption leading-[1.35] text-paper/70">{reference}</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
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
    <p className="mt-5 flex items-center gap-2 font-sans text-caption text-paper/60" data-florilegium-synced="">
      <Check size={14} className="shrink-0" />
      {line}
    </p>
  );
}

/** One of the reader's gatherings as a row: a place to go (GatheringRow.tsx draws what it says). */
function GatheringRow({ f }: { f: Florilegium }) {
  return (
    <Link href={gatheringHref(f.id)} className={FLOR_ROW} data-gathering={f.id}>
      <GatheringRowBody f={f} carry />
      <ChevronRight size={14} aria-hidden className="shrink-0 text-paper/45 rtl:-scale-x-100" />
    </Link>
  );
}
