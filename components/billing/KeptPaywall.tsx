"use client";

// The Plus paywall as the owner locked it (1.8): round 10 merged, "kept by
// those it helps, then the features working, then the plans", refined and
// locked as R2 on 2026-10-27 (boards/purify-master/variants/10b-paywall.png):
// the features in depth as you scroll, the plans and the button held at the
// bottom, and the billed price the big number with what it comes to a month
// small beside it, which is what App Review looks for.
//
// Four parts, shared by the three places the paywall stands: the upgrade
// sheet a lock opens (components/billing/UpgradeModal.tsx), the apps' full
// screen at /pricing (components/billing/PlusPaywall.tsx) and the website's
// /pricing (components/billing/WebPaywall.tsx).
//
//   KeptHero         the scribe of St Prochorus's icon, and why Plus exists:
//                    "Purify is kept by those it helps", with the app's own
//                    line under it (plus.footer).
//   PlusFeatureRows  every Plus feature, each with a small working picture,
//                    in the app's own words (lib/premium/plusRows.ts).
//   PlusReviews      two or three of the stores' own reviews, word for word,
//                    after the features and before the plans (the owner's
//                    second round, 2026-10-28; lib/premium/paywallReviews.ts).
//   PlansDock        the plans, the price, the trial, the button and the
//                    small print, held at the bottom while the rows scroll.
//
// Every figure in the dock is the store's (lib/billing/offers.ts): the price
// it bills, the month a year comes to, the trial it grants this reader, and
// so the button's own words, "Start 7 days free" only where the store gives
// this reader seven days. None is written here. "Kept by those it helps" is
// the headline and its line, as the design draws it; the reviews are real
// ones, quoted as written, and there are no reader counts.
//
// Black, white and grey (the owner, 2026-10-28: "that yellow is vibe
// coded"): where something must stand out, the chosen plan and the feature a
// reader came for, it is white with a soft white glow.

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { STORE_NAME, Stars } from "@/components/marketing/storeBits";
import { FeatureMark, PREMIUM_CTA, SoonPill } from "@/components/premium/PremiumUI";
import { AMBIENCE_TRACKS } from "@/lib/ambience/ambience";
import { offeredPlans, savingsPct, type Plan, type PlusOffers, type TrialPeriod } from "@/lib/billing/offers";
import { cn } from "@/lib/cn";
import { dateLocale } from "@/lib/i18n/deviceDates";
import type { LocaleCode } from "@/lib/i18n/locales";
import { paywallReviews } from "@/lib/premium/paywallReviews";
import { plusRowsLedBy } from "@/lib/premium/plusRows";

/* ── The scribe, and why ─────────────────────────────────────────────────── */

/**
 * The scribe in black and white, falling into the page. Carried in the apps
 * (public/premium), so it is there the moment the screen is.
 */
export function ScribePicture({ className, focus = "50% 27%" }: { className?: string; focus?: string }) {
  return (
    <div aria-hidden className={cn("relative overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- carried in the apps, served as it is. */}
      <img
        src="/premium/scribe.v1.webp"
        alt=""
        width={600}
        height={750}
        decoding="async"
        fetchPriority="high"
        className="paywall-glow-in absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: focus }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(75% 60% at 50% 0%, rgba(255,255,255,0.14), rgba(255,255,255,0) 72%), linear-gradient(to bottom, rgb(16 16 19 / 0.4) 0%, rgb(16 16 19 / 0) 26%, rgb(16 16 19 / 0) 34%, var(--color-night) 92%)",
        }}
      />
      <div
        className="absolute inset-0 hidden sm:block"
        style={{ background: "linear-gradient(to right, var(--color-night), transparent 16%, transparent 84%, var(--color-night))" }}
      />
    </div>
  );
}

/**
 * "Purify is kept by those it helps", over the scribe. In the sheet it runs
 * from edge to edge of the sheet; on the apps' screen it is held to a phone's
 * width. `eyebrow` names the plan above it where nothing else on the screen
 * does (the apps' screen; the sheet's own title bar says Purify Plus).
 */
export function KeptHero({
  place,
  eyebrow,
  heading: Heading = "h2",
}: {
  place: "sheet" | "screen";
  eyebrow?: string;
  heading?: "h1" | "h2";
}) {
  const { t } = useTranslate();
  const sheet = place === "sheet";
  return (
    <div className={cn("relative", sheet ? "-mx-5" : "mx-auto w-full max-w-[600px]")}>
      <ScribePicture className={sheet ? "h-[196px]" : "h-[min(36svh,288px)]"} />
      <div className={cn("relative -mt-[88px] px-5", !sheet && "mx-auto max-w-[520px] sm:px-6")}>
        {eyebrow ? (
          <p className="paywall-in font-sans text-caption font-semibold text-paper/70 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]" style={{ animationDelay: "80ms" }}>
            {eyebrow}
          </p>
        ) : null}
        <Heading
          className="paywall-in paywall-title max-w-[340px] text-balance font-heading text-[26px] font-bold leading-[1.12] text-paper"
          style={{ animationDelay: "120ms" }}
        >
          {t("plus.kept.title")}
        </Heading>
        <p className="paywall-in mt-2 max-w-[420px] font-sans text-[13.5px] leading-[1.45] text-paper/70" style={{ animationDelay: "200ms" }}>
          {t("plus.footer")}
        </p>
      </div>
    </div>
  );
}

/* ── The features, in depth ──────────────────────────────────────────────── */

/** Candlelight's own page and ink (app/globals.css, html[data-reading-mode="candlelight"]): black and light grey. */
const CANDLELIGHT = { page: "#0a0a0a", ink: "#d4d4d8" } as const;

/** A feature's small working picture: the Greek word itself, the page in Candlelight, or the feature's mark. */
function FeaturePicture({ id }: { id: string }) {
  const box = "grid h-[66px] w-[66px] shrink-0 place-items-center overflow-hidden rounded-[14px]";
  if (id === "word-study") {
    return (
      <span aria-hidden className={cn(box, "bg-paper/[0.08]")}>
        <span lang="grc" className="font-serif text-[19px] font-semibold text-paper">
          λόγος
        </span>
      </span>
    );
  }
  if (id === "reading-modes") {
    return (
      <span aria-hidden className={cn(box, "ring-1 ring-inset ring-paper/10")} style={{ background: CANDLELIGHT.page }}>
        <span className="font-serif text-[26px]" style={{ color: CANDLELIGHT.ink }}>
          Aa
        </span>
      </span>
    );
  }
  return (
    <span aria-hidden className={cn(box, "bg-paper/[0.08] text-paper/85")}>
      <FeatureMark id={id} size={26} />
    </span>
  );
}

/** One feature, with its picture. `lit` is the one a reader came for: white, softly glowing. */
export function FeatureRow({
  id,
  name,
  body,
  soon,
  keep,
  lit = false,
  children,
  index,
}: {
  id: string;
  name: string;
  body: string;
  soon?: string;
  keep?: string | null;
  lit?: boolean;
  children?: ReactNode;
  /** Its place in the list: the first few rise in, one after another. */
  index: number;
}) {
  const rise = index < 5;
  return (
    <li
      data-plus-feature={id}
      data-lit={lit ? "" : undefined}
      className={cn(
        "flex items-center gap-3.5 rounded-[18px] p-3 ring-1 ring-inset",
        lit ? "bg-paper/[0.07] ring-paper/50 shadow-[0_0_30px_-10px_rgba(255,255,255,0.5)]" : "bg-paper/[0.035] ring-paper/[0.08]",
        rise && "paywall-in",
      )}
      style={rise ? { animationDelay: `${280 + index * 70}ms` } : undefined}
    >
      <FeaturePicture id={id} />
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[15px] font-semibold leading-snug text-paper">
          {name}
          {soon ? <SoonPill label={soon} /> : null}
        </p>
        <p className="mt-0.5 font-sans text-[12.5px] leading-[1.4] text-paper/60">{body}</p>
        {children}
        {keep ? <p className="mt-1.5 font-sans text-caption leading-[1.45] text-paper/45">{keep}</p> : null}
      </div>
    </li>
  );
}

/** The sounds Ambience plays, by the names the ambience sheet gives them: the 1.8 ones among them. */
function AmbienceSounds() {
  const { t } = useTranslate();
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("ambience.title")}>
      {AMBIENCE_TRACKS.map((track) => (
        <li
          key={track.id}
          className="rounded-pill bg-paper/[0.06] px-2 py-0.5 font-sans text-[11px] font-medium text-paper/70 ring-1 ring-inset ring-paper/10"
        >
          {t(track.labelKey)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Every Plus feature, in depth (lib/premium/plusRows.ts). The one a lock
 * opened the sheet on leads, lit, in the words the sheet has always had for
 * that lock: its headline, what it does, and what stays free beside it. With
 * none, the free core is said once under the list, as the sheet always said it.
 */
export function PlusFeatureRows({ lead, className }: { lead?: string | null; className?: string }) {
  const { t } = useTranslate();
  const rows = plusRowsLedBy(lead);
  const ledBy = lead ? rows[0]?.feature === lead : false;
  return (
    <div className={className}>
      <ul className="flex flex-col gap-2.5" aria-label={t("plus.sheet.title")}>
        {rows.map((row, i) => {
          const lit = ledBy && i === 0;
          const name = lit && row.title ? t(row.title) : t(row.name);
          return (
            <FeatureRow key={row.id} index={i} id={row.id} name={name} body={t(row.body)} lit={lit} keep={lit && row.keep ? t(row.keep) : null}>
              {row.id === "ambience" ? <AmbienceSounds /> : null}
            </FeatureRow>
          );
        })}
      </ul>
      {!ledBy ? <p className="mt-3 font-sans text-caption leading-[1.5] text-paper/45">{t("plus.general.keep")}</p> : null}
    </div>
  );
}

/* ── What readers say ────────────────────────────────────────────────────── */

/**
 * Two or three of the stores' own reviews (lib/premium/paywallReviews.ts),
 * quiet, after the features and before the plans: each with the stars its
 * reviewer gave, the name as the store shows it, and the store. The words are
 * the reviewer's, as written, and they are a quotation in English: marked as
 * English, and set left to right on every page, Arabic and Urdu too, so the
 * marks stay where the reviewer put them. Only the stars' label is the
 * reader's language. No title and no month, to keep them quiet.
 */
export function PlusReviews({ className }: { className?: string }) {
  const { t } = useTranslate();
  const reviews = paywallReviews();
  if (reviews.length === 0) return null;
  return (
    <div className={className} data-plus-reviews="">
      <p className="font-sans text-caption font-semibold text-paper/55">{t("home.reviews.title")}</p>
      <ul
        aria-label={t("home.reviews.region")}
        className="mt-2 divide-y divide-paper/[0.07] rounded-[18px] bg-paper/[0.025] px-3.5 ring-1 ring-inset ring-paper/[0.06]"
      >
        {reviews.map((r) => (
          <li key={r.id} data-plus-review={r.id} className="py-3">
            <figure dir="ltr">
              <span className="block opacity-70">
                <Stars label={t("home.apps.outOfFive", { rating: r.stars.toFixed(1) })} count={r.stars} outOf={5} size={11} tone="ink" />
              </span>
              <blockquote lang="en" className="mt-1.5 font-serif text-[13.5px] leading-[1.5] text-paper/75">
                {`“${r.quote}”`}
              </blockquote>
              <figcaption className="mt-1.5 font-sans text-[11.5px] leading-snug text-paper/45">
                <span lang="en" className="font-semibold text-paper/65">
                  {r.name}
                </span>
                {" · "}
                {STORE_NAME[r.store]}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── The plans, held at the bottom ───────────────────────────────────────── */

/** A trial's length in the reader's language: days in the app's own count words, a month or a year by the device. */
function trialWords(period: TrialPeriod, tn: (k: string, n: number) => string, locale: LocaleCode): string {
  if (period.unit === "day") return tn("plans.days", period.count);
  try {
    return new Intl.NumberFormat(dateLocale(locale), { style: "unit", unit: period.unit, unitDisplay: "long" }).format(period.count);
  } catch {
    return `${period.count} ${period.unit}${period.count === 1 ? "" : "s"}`;
  }
}

/** A whole percent the way the reader's language writes one: "40%", "40 %", "%40". */
function percentWords(pct: number, locale: LocaleCode): string {
  try {
    return new Intl.NumberFormat(dateLocale(locale), { style: "percent", maximumFractionDigits: 0 }).format(pct / 100);
  } catch {
    return `${pct}%`;
  }
}

/** Yearly and Monthly, the chosen one white and softly lit; the year carries what it saves. */
function PlanSwitch({
  plans,
  plan,
  onPlan,
  save,
}: {
  plans: Plan[];
  plan: Plan;
  onPlan: (p: Plan) => void;
  save: string | null;
}) {
  const { t } = useTranslate();
  return (
    <div className="flex gap-1 rounded-pill bg-paper/[0.04] p-1 ring-1 ring-inset ring-paper/10">
      {plans.map((p) => {
        const on = p === plan;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPlan(p)}
            aria-pressed={on}
            className={cn(
              "paywall-choice flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-pill px-2 font-sans text-[14.5px] font-semibold",
              on ? "bg-paper text-night shadow-[0_0_18px_-4px_rgba(255,255,255,0.55)]" : "text-paper/60 hover:text-paper",
            )}
          >
            <span className="truncate">{t(p === "yearly" ? "plus.plan.yearly" : "plus.plan.monthly")}</span>
            {p === "yearly" && save ? (
              <span
                className={cn(
                  "paywall-choice shrink-0 whitespace-nowrap rounded-pill px-2 py-0.5 text-[11px] font-bold",
                  on ? "bg-night text-paper" : "bg-paper text-night",
                )}
              >
                {t("plus.plan.save", { pct: save })}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Where a subscription is bought: an app store in the apps, the web checkout on the website. */
export type BuyPlace = "store" | "web";

/**
 * The plans, the price, the trial, the action and the small print, held at
 * the bottom while the features scroll (the caller makes it sticky).
 *
 * The billed price is the big number and what a year comes to a month the
 * small one, both as the store formats them. The trial is said only when the
 * store grants it to this reader, and then the action says it too: "Start 7
 * days free", the owner's pick B on sheet 3 of his second round (2026-10-28),
 * in the store's length and the reader's language; with no trial it says
 * "Join Plus". With no offers (signed out, no billing, the store did not
 * answer) no price is shown at all, never a remembered one, and the action
 * leads to /pricing (`href`).
 *
 * The small print says what the action commits to in the store's price, that
 * it renews automatically until it is cancelled (App Review looks for that
 * line), then who bills it and that it can be cancelled any time, in the
 * words the paywall has always used.
 *
 * Its fill is solid, with no blur: the features scroll under it, a feature's
 * title showed faintly through the old 90% glass, and the app keeps blur off
 * anything over a moving page (the Bible pill, the saint page).
 */
export function PlansDock({
  offers,
  plan,
  onPlan,
  tier = "plus",
  place,
  busy,
  note,
  onBuy,
  href,
  onRestore,
  onNavigate,
  more,
  className,
  style,
}: {
  offers: PlusOffers | null;
  plan: Plan;
  onPlan: (p: Plan) => void;
  tier?: "plus" | "pro";
  place: BuyPlace;
  /** What is under way: a purchase or a restore. */
  busy: "buy" | "restore" | null;
  /** A message above the action: a failure, a restore that found nothing, a word about two plans. */
  note?: ReactNode;
  onBuy?: () => void;
  /** Instead of buying here, the action goes here. */
  href?: string;
  /** Restore purchases, where the store can (the apps). */
  onRestore?: () => void;
  /** Called as a link leaves (the sheet closes). */
  onNavigate?: () => void;
  /** One more link at the end of the row (See all plans, in the sheet). */
  more?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { t, tn, locale } = useTranslate();
  const plans = offers ? offeredPlans(offers) : [];
  const chosen = offers ? (offers[plan] ?? null) : null;
  const pct = offers ? savingsPct(offers) : null;
  const save = pct != null ? percentWords(pct, locale) : null;
  const yearly = plan === "yearly";
  const billed = chosen ? t(yearly ? "plus.perYear" : "plus.perMonth", { price: chosen.price }) : null;
  const trial = chosen?.trial ? trialWords(chosen.trial, tn, locale) : null;
  // The store's own trial, when it grants this reader one, in the button too.
  const join = trial ? t("plus.cta.trial", { trial }) : t(tier === "pro" ? "plus.cta.joinPro" : "plus.cta.join");
  const action = cn(PREMIUM_CTA, "mt-3.5 min-h-[50px] w-full text-[16px]");
  // What the action commits to, in the store's own price, that it renews
  // until cancelled, then how it is billed and that it can be cancelled: the
  // line every selling state of the paywall carries.
  const terms = chosen
    ? trial
      ? t(yearly ? "plus.fine.trialYear" : "plus.fine.trialMonth", { trial, price: chosen.price })
      : t(yearly ? "plus.fine.year" : "plus.fine.month", { price: chosen.price })
    : null;
  const cancel = place === "store" ? t("plus.billedThroughStore") : chosen ? t("plus.billedOnWeb") : null;
  const renews = terms || cancel ? t("plus.fine.renews") : null;
  const links = "inline-flex min-h-11 items-center transition-colors hover:text-paper";

  return (
    <div
      className={cn("rounded-t-[26px] border-t border-paper/10 bg-night-soft px-5 pt-4", className)}
      style={style}
      data-plans-dock=""
    >
      <div className="mx-auto w-full max-w-[520px]">
        {plans.length > 1 ? <PlanSwitch plans={plans} plan={plan} onPlan={onPlan} save={save} /> : null}

        {chosen && billed ? (
          <>
            <div className={cn("flex items-baseline justify-between gap-3", plans.length > 1 && "mt-3")}>
              <p className="font-sans text-[20px] font-bold leading-tight tracking-[-0.01em] text-paper tabular-nums">{billed}</p>
              {yearly && chosen.perMonth ? (
                <p className="shrink-0 font-sans text-[12.5px] text-paper/55 tabular-nums">{t("plus.perMonth", { price: chosen.perMonth })}</p>
              ) : null}
            </div>
            <p className="mt-0.5 font-sans text-[13px] leading-snug text-paper/70">
              {trial
                ? t(yearly ? "plus.plan.trialYearly" : "plus.plan.trialMonthly", { trial })
                : t(yearly ? "plus.plan.billedYearly" : "plus.plan.billedMonthly")}
            </p>
          </>
        ) : null}

        {note}

        {href ? (
          <Link href={href} onClick={onNavigate} className={action}>
            {join}
          </Link>
        ) : (
          <button type="button" onClick={onBuy} disabled={!chosen || busy !== null} className={action}>
            {busy === "buy" ? t("plus.opening") : join}
          </button>
        )}

        {terms || cancel ? (
          <p className="mt-2 text-center font-sans text-[11.5px] leading-[1.45] text-paper/45">
            {[terms, renews, cancel].filter(Boolean).join(" ")}
          </p>
        ) : null}

        <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-4 font-sans text-[11.5px] font-semibold text-paper/55">
          {onRestore ? (
            <button type="button" onClick={onRestore} disabled={busy !== null} className={cn(links, "disabled:opacity-50")}>
              {busy === "restore" ? t("plus.restoring") : t("plus.restore")}
            </button>
          ) : null}
          <Link href="/terms" onClick={onNavigate} className={links}>
            {t("shop.terms")}
          </Link>
          <Link href="/privacy" onClick={onNavigate} className={links}>
            {t("footer.privacy")}
          </Link>
          {more}
        </div>
      </div>
    </div>
  );
}

/** A message in the dock: a failure, or a restore that found nothing. */
export function DockNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-3 text-center font-sans text-caption leading-relaxed text-crimson-soft">
      {children}
    </p>
  );
}
