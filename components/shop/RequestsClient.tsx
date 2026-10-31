"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { RequestIcon } from "@/components/shop/RequestIcon";
import { RequestIconForm } from "@/components/shop/RequestIconForm";
import { MailGlyph } from "@/components/shop/shopGlyphs";
import { ShopError, ShopLoading, ShopSignInPrompt } from "@/components/shop/ShopStates";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Plus } from "@/components/ui/icons/Plus";
import { cn } from "@/lib/cn";
import { deviceDateLocale } from "@/lib/i18n/deviceDates";
import { saintShopHref } from "@/lib/shop/bySaint";
import { BUDGET_BAND_LABELS } from "@/lib/shop/format";
import { REQUEST_WORD_KEY, requestLife, type RequestLife } from "@/lib/shop/requestLife";
import { requestSaint, saintByName, saintShortName } from "@/lib/shop/requestSaint";
import type { ShopBudgetBand, ShopIconRequest } from "@/lib/shop/types";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { useWide } from "@/lib/shop/useWide";
import { createClient } from "@/lib/supabase/client";
import { AUTH_UNRESOLVED_MESSAGE, resolveUser } from "@/lib/supabase/resolveUser";

type Result =
  | { signedIn: false }
  | { signedIn: true; requests: ShopIconRequest[]; email: string | null };

async function load(): Promise<Result> {
  // Auth-required page: an unresolved check (auth lock, network) must land
  // on the retry state, never on the sign-in prompt (F-13).
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  if (auth.state === "signed-out") return { signedIn: false };
  const supabase = createClient();
  const { data } = await supabase
    .from("shop_icon_requests")
    .select(
      "id, subject, saint_slug, request_type, preferred_size, product_preference, budget_band, desired_date, notes, notify_when_available, status, created_at",
    )
    .order("created_at", { ascending: false });
  return { signedIn: true, requests: (data ?? []) as ShopIconRequest[], email: auth.user.email ?? null };
}

/** A budget in the reader's language where it has words; the figures are the same everywhere. */
const BUDGET_KEY: Partial<Record<ShopBudgetBand, string>> = {
  under_50: "shop.priceBand.under_50",
  unsure: "shop.budgetUnsure",
};

const KIND_KEY: Record<ShopIconRequest["request_type"], string> = {
  ready_made: "shop.readyMade",
  custom: "shop.customWork",
  either: "shop.either",
};

/**
 * Your icon requests, Requests A, "The saint's icon" (r3-19, the owner's pick
 * of 2026-10-31): each request with its saint's own icon from the app, what
 * was asked, and its life as marks with its word lit (in the reader's
 * language; build 85 wrote the five words in English, in pills). Icon found
 * opens that saint's icons in the shop; We wrote to you says where the answer
 * went. At the website's width the requests stand two across with Request an
 * icon beside them.
 */
export function RequestsClient() {
  const { t } = useTranslate();
  const { data, error, loading, reload } = useAsyncData(load, []);
  const wide = useWide();

  if (loading && !data) return <ShopLoading label={t("shop.loadingYourRequests")} />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title={t("shop.yourIconRequests")}
        body="Sign in to see requests tied to your account. Requests sent with an email address only are answered by email."
        next="/shop/requests"
        extra={
          <Link
            href="/shop/request"
            className="tap-press inline-flex min-h-[44px] items-center rounded-pill border border-paper/20 px-6 font-sans text-ui font-semibold text-paper"
          >
            {t("shop.newRequest")}
          </Link>
        }
      />
    );
  }

  const requests = data && data.signedIn ? data.requests : [];
  const email = data && data.signedIn ? data.email : null;

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-8 md:px-8 lg:max-w-[1200px]">
      <header className="pt-6 md:pt-14">
        <h1 className="font-heading text-[28px] font-semibold leading-[1.12] tracking-[-0.2px] text-paper">
          {t("shop.yourIconRequests")}
        </h1>
      </header>
      <div className="lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5">
        <div>
          <Link href="/shop/request" className="shop-raise press-card mb-[18px] mt-4 flex items-center gap-3 rounded-[18px] px-3.5 py-3 lg:hidden">
            <span aria-hidden className="shop-well grid size-9 shrink-0 place-items-center rounded-full text-paper">
              <Plus size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-[15px] font-semibold text-paper">{t("shop.newRequest")}</span>
              <span className="block font-sans text-caption leading-snug text-paper/60">{t("shop.tellUsWhoYouRe")}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-paper/40 rtl:-scale-x-100" />
          </Link>
          {requests.length === 0 ? (
            <p className="mt-6 font-serif text-body leading-[1.65] text-paper/65 lg:mt-0">{t("shop.noRequestsYetWhenYou")}</p>
          ) : (
            <ul className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
              {requests.map((r) => (
                <RequestCard key={r.id} request={r} email={email} />
              ))}
            </ul>
          )}
        </div>
        {wide ? (
          <aside className="shop-raise hidden rounded-[22px] p-[18px] lg:block" aria-label={t("shop.requestAnIcon")}>
            <h2 className="font-heading text-[18px] font-semibold leading-tight text-paper">{t("shop.requestAnIcon")}</h2>
            <p className="mt-1 font-sans text-[12.5px] leading-snug text-paper/60">{t("shop.tellUsWhoYouRe")}</p>
            <div className="mt-3.5">
              <RequestIconForm signedIn onSent={reload} />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function RequestCard({ request: r, email }: { request: ShopIconRequest; email: string | null }) {
  const { t } = useTranslate();
  const saint = requestSaint(r.saint_slug) ?? saintByName(r.subject);
  const life = requestLife(r.status);
  const day = (iso: string) => new Date(iso).toLocaleDateString(deviceDateLocale(), { month: "short", day: "numeric" });
  const details = [
    t(KIND_KEY[r.request_type]),
    r.product_preference,
    r.preferred_size,
    r.budget_band ? (BUDGET_KEY[r.budget_band] ? t(BUDGET_KEY[r.budget_band]!) : BUDGET_BAND_LABELS[r.budget_band]) : null,
    r.desired_date ? t("shop.requestNeededBy", { date: day(`${r.desired_date}T12:00:00`) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="shop-raise rounded-[20px]" data-request={r.status}>
      <div className="flex items-start gap-3.5 p-3.5">
        <RequestIcon src={saint?.icon ?? null} width={62} height={82} className="rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[17px] font-semibold leading-[1.28] text-paper">{r.subject}</p>
          {details ? <p className="mt-[3px] font-sans text-caption leading-snug text-paper/60">{details}</p> : null}
          <p className="mt-2.5 flex items-center gap-2.5">
            <LifeMarks life={life} />
            <span className={cn("font-sans text-[13.5px] font-semibold text-paper", life.lit && "shop-lit")}>
              {t(REQUEST_WORD_KEY[life.word])}
            </span>
          </p>
          <p className="mt-[3px] font-sans text-[11.5px] text-paper/60">{t("shop.requestAsked", { date: day(r.created_at) })}</p>
        </div>
      </div>
      {life.door === "icons" && saint ? (
        <Link
          href={saintShopHref(saint.slug)}
          className="flex min-h-11 items-center gap-2 border-t border-paper/[0.09] px-3.5 py-2.5 font-sans text-[13.5px] font-semibold text-paper"
        >
          {t("shop.requestSeeIcons", { saint: saintShortName(saint.name) })}
          <ChevronRight size={15} className="shrink-0 text-paper/40 rtl:-scale-x-100" />
        </Link>
      ) : null}
      {life.door === "email" && email ? (
        <p className="flex items-center gap-2 border-t border-paper/[0.09] px-3.5 py-2.5 font-sans text-[12.5px] text-paper/70">
          <MailGlyph size={16} className="shrink-0" />
          <span className="min-w-0 break-words">{t("shop.requestAnswerInEmail", { address: email })}</span>
        </p>
      ) : null}
    </li>
  );
}

/** A request's life on one line: done solid, now lit, ahead hollow. */
function LifeMarks({ life }: { life: RequestLife }) {
  return (
    <span aria-hidden className="flex shrink-0 items-center" style={{ width: life.steps.length * 22 }}>
      {life.steps.map((s, i) => (
        <span key={s} className="contents">
          {i ? <span className="shop-seg" data-done={life.marks[i] !== "todo" ? "" : undefined} /> : null}
          <span className="shop-mark" data-size="sm" data-state={life.marks[i]} />
        </span>
      ))}
    </span>
  );
}
