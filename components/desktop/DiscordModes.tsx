"use client";

// Discord status settings, in the desktop app only: the four modes approved
// on 26 September 2026 (lib/desktop/presenceModes.ts has the what and why;
// the design canvas is linked there). Rendered inside Settings' "Discord
// status" section, as its rows.
//
// Everything here is kept on this computer (lib/desktop/presencePref.ts)
// except the patron saint, which is the account's own (profiles.patron_saint,
// chosen under Account, Data) and is only read here.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { DiscordPreviewCard } from "@/components/desktop/DiscordPreviewCard";
import { usePlusCustom } from "@/components/desktop/usePlusCustom";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/SearchSelect";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { cn } from "@/lib/cn";
import { presenceStatus, type PresenceStatus } from "@/lib/desktop/bridge";
import {
  allSaints,
  assemblePresence,
  loadSaint,
  localDay,
  patronSlug,
  seasonToday,
  type SaintRecord,
} from "@/lib/desktop/presenceAssemble";
import {
  SEASON_COLORS,
  dayNumber,
  nextNameDay,
  quoteOfTheDay,
  type NameDay,
  type PlusBase,
  type PresenceMode,
  type PresenceRequest,
  type ReadingPlace,
  type SeasonColor,
} from "@/lib/desktop/presenceModes";
import { usePresencePrefs } from "@/lib/desktop/presencePref";
import type { SeasonReason } from "@/lib/desktop/seasonColor";

/** The swatches' own colors: the frames on the pictures (artRender.ts). */
const SWATCH: Record<SeasonColor, string> = {
  gold: "#b8892f",
  purple: "#5b2d86",
  crimson: "#8a1f2f",
  green: "#2f6d3e",
  blue: "#2b5f93",
  white: "#e8e1cf",
};

/** Reading, away from a text: St John's Gospel, halfway through chapter 3. */
const EXAMPLE_PLACE: ReadingPlace = { kind: "scripture", book: "john", chapter: 3, chapters: 21, fraction: 0.5 };

const MODES: readonly Exclude<PresenceMode, "off">[] = ["patron", "favorite", "reading", "plus"];
const BASES: readonly PlusBase[] = ["patron", "favorite", "reading"];

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="flex h-11 w-14 shrink-0 items-center justify-center"
    >
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-11 rounded-full border transition-colors motion-reduce:transition-none",
          on ? "border-gold/50 bg-gold/40" : "border-paper/20 bg-paper/10",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-paper transition-[left] motion-reduce:transition-none",
            on ? "left-[22px]" : "left-[3px]",
          )}
        />
      </span>
    </button>
  );
}

function ModeIcon({ mode }: { mode: Exclude<PresenceMode, "off"> }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 20,
    height: 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (mode) {
    case "patron":
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="6.5" />
          <circle cx="12" cy="9" r="2.8" />
          <path d="M5 21c1.3-3.4 4-5.2 7-5.2s5.7 1.8 7 5.2" />
        </svg>
      );
    case "favorite":
      return (
        <svg {...common}>
          <path d="M9.5 6.5C6.5 7.6 5 9.8 5 13v4.5h5V12H7.2c.2-1.9 1.1-3 2.8-3.9" />
          <path d="M18.5 6.5c-3 1.1-4.5 3.3-4.5 6.5v4.5h5V12h-2.8c.2-1.9 1.1-3 2.8-3.9" />
        </svg>
      );
    case "reading":
      return (
        <svg {...common}>
          <path d="M3 5.5c2.7-1 5.7-.8 9 1.2 3.3-2 6.3-2.2 9-1.2v13c-2.7-1-5.7-.8-9 1.2-3.3-2-6.3-2.2-9-1.2z" />
          <path d="M12 6.7v13" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M11 3.5l1.7 4.8 4.8 1.7-4.8 1.7-1.7 4.8-1.7-4.8-4.8-1.7 4.8-1.7z" />
          <path d="M18 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
        </svg>
      );
  }
}

function Portrait({ saint }: { saint: SaintRecord }) {
  if (!saint.iconUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a 44px icon the library already serves
    <img
      src={saint.iconUrl}
      alt=""
      width={44}
      height={58}
      className="h-[58px] w-11 shrink-0 rounded-md border border-gold/40 object-cover object-top"
    />
  );
}

function SwitchRow({
  label,
  description,
  on,
  onChange,
  children,
}: {
  label: string;
  description?: React.ReactNode;
  on: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-ui text-paper">{label}</p>
        {description ? <p className="mt-0.5 font-sans text-caption leading-[1.5] text-paper/55">{description}</p> : null}
        {children}
      </div>
      <Switch on={on} label={label} onChange={onChange} />
    </div>
  );
}

export function DiscordModes() {
  const { t, locale } = useTranslate();
  const [prefs, setPrefs] = usePresencePrefs();
  const plus = usePlusCustom();
  const upgrade = useUpgradeModal();
  const [styleDefault] = useCalendarStyleDefault();
  const style: "new" | "old" = styleDefault === "old" ? "old" : "new";

  const on = prefs.mode !== "off";
  const base: PresenceMode = prefs.mode === "plus" ? prefs.plusBase : prefs.mode;

  const [status, setStatus] = useState<PresenceStatus | null>(null);
  const [patron, setPatron] = useState<
    { state: "loading" } | { state: "signed-out" } | { state: "none" } | { state: "ready"; saint: SaintRecord; nameDay: NameDay | null }
  >({ state: "loading" });
  const [favorite, setFavorite] = useState<SaintRecord | null>(null);
  const [saintList, setSaintList] = useState<{ slug: string; name: string }[] | null>(null);
  const [today, setToday] = useState<{ color: SeasonColor; reason: SeasonReason } | null>(null);
  const [preview, setPreview] = useState<{ request: PresenceRequest | null; example: boolean }>({
    request: null,
    example: false,
  });

  // Whether Discord is there to show it. Polled only while a mode is on and
  // this screen is open; the answer changes when the reader opens Discord.
  // Every setState below runs in a promise callback, never in an effect body.
  useEffect(() => {
    if (!on) return;
    let live = true;
    const read = () => {
      void presenceStatus().then((s) => {
        if (live) setStatus(s);
      });
    };
    read();
    const timer = window.setInterval(read, 4000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [on]);

  const format = useMemo(
    () => (d: Date) => d.toLocaleDateString(locale, { month: "long", day: "numeric", timeZone: "UTC" }),
    [locale],
  );

  useEffect(() => {
    if (base !== "patron") return;
    let live = true;
    void patronSlug(true).then(async ({ slug, signedIn }) => {
      const s = slug ? await loadSaint(slug) : null;
      if (!live) return;
      if (!signedIn) setPatron({ state: "signed-out" });
      else if (!s) setPatron({ state: "none" });
      else setPatron({ state: "ready", saint: s, nameDay: nextNameDay(s.feastDays, localDay(), style, format) });
    });
    return () => {
      live = false;
    };
  }, [base, style, format]);

  useEffect(() => {
    if (base !== "favorite") return;
    let live = true;
    void allSaints().then((list) => {
      if (live) setSaintList(list);
    });
    void (prefs.favorite ? loadSaint(prefs.favorite) : Promise.resolve(null)).then((s) => {
      if (live) setFavorite(s);
    });
    return () => {
      live = false;
    };
  }, [base, prefs.favorite]);

  useEffect(() => {
    if (prefs.mode !== "plus") return;
    let live = true;
    void seasonToday(style).then((c) => {
      if (live) setToday(c);
    });
    return () => {
      live = false;
    };
  }, [prefs.mode, style]);

  useEffect(() => {
    let live = true;
    void assemblePresence({
      prefs,
      plusAllowed: plus.allowed,
      pathname: "/settings",
      title: null,
      t,
      style,
      locale,
      place: base === "reading" ? EXAMPLE_PLACE : undefined,
      preview: true,
    }).then((request) => {
      if (live) setPreview({ request, example: base === "reading" });
    });
    return () => {
      live = false;
    };
  }, [prefs, plus.allowed, base, t, style, locale, patron, favorite]);

  const saintOptions = useMemo<SearchSelectOption[]>(
    () => (saintList ?? []).map((s) => ({ value: s.slug, label: s.name })),
    [saintList],
  );

  function pickMode(mode: Exclude<PresenceMode, "off">) {
    if (mode === "plus" && plus.locked) {
      upgrade.open("general");
      return;
    }
    setPrefs({ mode });
  }

  const quote = favorite ? quoteOfTheDay(favorite.quotes, dayNumber(new Date())) : null;

  return (
    <>
      <div className="px-5 py-4">
        <SwitchRow
          label={t("settings.discordShow")}
          description={on ? t("settings.discordShowOn") : t("settings.discordShowOff")}
          on={on}
          onChange={(v) => setPrefs({ mode: v ? "reading" : "off" })}
        />
      </div>

      {on ? (
        <div className="px-5 py-4">
          <p className="mb-3 font-sans text-eyebrow font-semibold uppercase tracking-[1.4px] text-paper/55">
            {t("settings.discordWhat")}
          </p>
          <div role="radiogroup" aria-label={t("settings.discordWhat")} className="grid gap-2.5 sm:grid-cols-2">
            {MODES.map((mode) => {
              const picked = prefs.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  onClick={() => pickMode(mode)}
                  className={cn(
                    "flex min-h-[88px] items-start gap-3.5 rounded-xl border p-4 text-left transition-colors motion-reduce:transition-none",
                    picked ? "border-gold/70 bg-gold/[0.08]" : "border-paper/12 bg-paper/[0.02] hover:bg-paper/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      picked ? "bg-gold/15 text-gold" : "bg-paper/[0.06] text-paper/75",
                    )}
                  >
                    <ModeIcon mode={mode} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-heading text-lede font-bold leading-tight text-paper">
                        {t(`settings.discordMode.${mode}`)}
                      </span>
                      {mode === "plus" ? (
                        <span className="rounded-pill bg-gold/85 px-2 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-night">
                          {t("settings.discordPlusPill")}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block font-sans text-caption leading-[1.45] text-paper/60">
                      {mode === "plus" && plus.locked ? t("settings.discordPlusLocked") : t(`settings.discordModeHint.${mode}`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {on && base === "patron" ? (
        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              {patron.state === "ready" ? <Portrait saint={patron.saint} /> : null}
              <div className="min-w-0">
                <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55">
                  {t("settings.discordPatronLabel")}
                </p>
                {patron.state === "ready" ? (
                  <>
                    <p className="font-heading text-lede font-bold text-paper">{patron.saint.name}</p>
                    {patron.nameDay ? (
                      <p className="font-sans text-caption text-gold">
                        {patron.nameDay.today
                          ? t("desktop.presence.nameDayToday")
                          : t("desktop.presence.nameDay", { date: patron.nameDay.date })}
                      </p>
                    ) : null}
                  </>
                ) : patron.state === "loading" ? null : (
                  <p className="font-sans text-caption text-paper/70">
                    {patron.state === "signed-out" ? t("settings.discordPatronSignedOut") : t("settings.discordPatronNone")}
                  </p>
                )}
              </div>
            </div>
            {patron.state !== "loading" ? (
              <Link
                href="/account/data"
                className="tap-press flex h-11 shrink-0 items-center rounded-pill border border-paper/20 px-4 font-sans text-caption font-semibold text-paper hover:bg-paper/[0.05]"
              >
                {patron.state === "ready" ? t("settings.discordPatronChange") : t("settings.discordPatronChoose")}
              </Link>
            ) : null}
          </div>
          <p className="font-sans text-caption leading-[1.5] text-paper/55">{t("settings.discordNameDayHint")}</p>
        </div>
      ) : null}

      {on && base === "favorite" ? (
        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center gap-3.5">
            {favorite ? <Portrait saint={favorite} /> : null}
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55">
                {t("settings.discordFavoriteLabel")}
              </p>
              <SearchSelect
                value={prefs.favorite ?? ""}
                onChange={(slug) => setPrefs({ favorite: slug })}
                options={saintOptions}
                placeholder={t("settings.discordFavoritePick")}
                ariaLabel={t("settings.discordFavoriteLabel")}
                searchPlaceholder={t("settings.discordFavoriteSearch")}
                emptyLabel={t("settings.discordFavoriteNoMatch")}
              />
            </div>
          </div>
          {favorite ? (
            quote ? (
              <figure className="rounded-lg bg-paper/[0.04] p-4">
                <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55">
                  {t("settings.discordTodaysLine")}
                </p>
                <blockquote className="mt-1.5 font-serif text-body leading-[1.5] text-paper">{`“${quote.text}”`}</blockquote>
                <figcaption className="mt-1 font-sans text-caption text-paper/55">{quote.source}</figcaption>
              </figure>
            ) : (
              <p className="font-sans text-caption leading-[1.5] text-paper/55">{t("settings.discordNoQuote")}</p>
            )
          ) : null}
          <p className="font-sans text-caption leading-[1.5] text-paper/55">{t("settings.discordQuoteHint")}</p>
        </div>
      ) : null}

      {on && base === "reading" ? (
        <div className="space-y-3 px-5 py-4">
          <SwitchRow
            label={t("settings.discordShowPlace")}
            description={prefs.showPlace ? t("settings.discordShowPlaceOn") : t("settings.discordShowPlaceOff")}
            on={prefs.showPlace}
            onChange={(v) => setPrefs({ showPlace: v })}
          />
          <SwitchRow
            label={t("settings.discordLiveBar")}
            description={t("settings.discordLiveBarHint")}
            on={prefs.liveBar}
            onChange={(v) => setPrefs({ liveBar: v })}
          />
          <p className="font-sans text-caption leading-[1.5] text-paper/55">{t("settings.discordReadingNote")}</p>
        </div>
      ) : null}

      {on && prefs.mode === "plus" && !plus.locked ? (
        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="mb-2 font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55">
              {t("settings.discordDressUp")}
            </p>
            <div role="radiogroup" aria-label={t("settings.discordDressUp")} className="flex flex-wrap gap-2">
              {BASES.map((b) => (
                <button
                  key={b}
                  type="button"
                  role="radio"
                  aria-checked={prefs.plusBase === b}
                  onClick={() => setPrefs({ plusBase: b })}
                  className={cn(
                    "h-11 rounded-pill border px-4 font-sans text-caption font-semibold",
                    prefs.plusBase === b ? "border-paper bg-paper text-night" : "border-paper/20 text-paper hover:bg-paper/[0.05]",
                  )}
                >
                  {t(`settings.discordMode.${b}`)}
                </button>
              ))}
            </div>
          </div>
          <SwitchRow
            label={t("settings.discordFollowSeason")}
            description={
              prefs.followSeason && today
                ? t("settings.discordSeasonToday", {
                    color: t(`settings.discordColor.${today.color}`),
                    reason: t(`desktop.presence.season.${today.reason}`),
                  })
                : t("settings.discordSeasonManual")
            }
            on={prefs.followSeason}
            onChange={(v) => setPrefs({ followSeason: v })}
          />
          <div role="radiogroup" aria-label={t("settings.discordColors")} className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {SEASON_COLORS.map((c) => {
              const current = prefs.followSeason && today ? today.color : prefs.season;
              return (
                <div key={c} className="flex flex-col items-center gap-1.5 text-center">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={current === c}
                    aria-label={`${t(`settings.discordColor.${c}`)}, ${t(`settings.discordColorWhen.${c}`)}`}
                    onClick={() => setPrefs({ season: c, followSeason: false })}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full border-2 p-[3px]",
                      current === c ? "border-paper" : "border-transparent",
                    )}
                  >
                    <span aria-hidden className="block h-full w-full rounded-full" style={{ background: SWATCH[c] }} />
                  </button>
                  <span className="font-sans text-caption font-semibold text-paper">{t(`settings.discordColor.${c}`)}</span>
                  <span className="font-sans text-eyebrow leading-[1.3] text-paper/55">{t(`settings.discordColorWhen.${c}`)}</span>
                </div>
              );
            })}
          </div>
          <SwitchRow
            label={t("settings.discordGilded")}
            description={t("settings.discordGildedHint")}
            on={prefs.gilded}
            onChange={(v) => setPrefs({ gilded: v })}
          />
        </div>
      ) : null}

      <DiscordPreviewCard request={on ? preview.request : null} status={status} example={preview.example} on={on} />
    </>
  );
}
