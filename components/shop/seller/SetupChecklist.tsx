"use client";

import Link from "next/link";

import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  nextSetupStep,
  setupProgress,
  type SetupStep,
  type SetupStepKey,
} from "@/lib/shop/sellerSetup";

/**
 * What a new seller still has to do, on the first screen they land on.
 *
 * The console used to open on four stat cards reading zero and a note saying
 * the store was not live. All true, none of it actionable: nothing said what
 * to do, in what order, or why publishing a listing was refused. A seller
 * arriving from the provisioning email had a three-step list in the email and
 * nothing matching it in the product.
 *
 * The sequence itself lives in lib/shop/sellerSetup.ts, which is pure and
 * tested. This file only renders it. It disappears completely once the store
 * is open and selling, because a finished checklist that never goes away is
 * clutter.
 */

const COPY: Record<SetupStepKey, { title: string; body: string }> = {
  store: { title: "shop.setupStoreTitle", body: "shop.setupStoreBody" },
  payouts: { title: "shop.setupPayoutsTitle", body: "shop.setupPayoutsBody" },
  listings: { title: "shop.setupListingsTitle", body: "shop.setupListingsBody" },
  open: { title: "shop.setupOpenTitle", body: "shop.setupOpenBody" },
  publish: { title: "shop.setupPublishTitle", body: "shop.setupPublishBody" },
};

export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const { t } = useTranslate();
  const next = nextSetupStep(steps);
  const { done, total } = setupProgress(steps);

  // Nothing left. Say so once and get out of the way.
  if (done === total) {
    return (
      <p className="mt-5 font-serif text-body text-paper/60 leading-[1.6]">
        {t("shop.setupAllDone")}
      </p>
    );
  }

  return (
    <section
      aria-label={t("shop.setupTitle")}
      className="mt-5 rounded-lg border border-gold/25 bg-gold/[0.04] p-5 md:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display-serif text-title text-paper">
          {t("shop.setupTitle")}
        </h2>
        <p className="font-sans text-caption tabular-nums text-paper/55">
          {done}/{total} {t("shop.setupProgress")}
        </p>
      </div>

      <ol className="mt-4 space-y-2.5">
        {steps.map((step) => {
          const isNext = next?.key === step.key;
          const copy = COPY[step.key];
          return (
            <li key={step.key}>
              <div
                className={cn(
                  "flex gap-3.5 rounded-md border p-3.5 transition-colors",
                  step.done
                    ? "border-paper/8 bg-transparent"
                    : isNext
                      ? "border-gold/40 bg-night-soft/70"
                      : "border-paper/10 bg-night-soft/40",
                )}
              >
                {/* State in form as well as colour: a filled check, an open
                    ring for what is next, a dash for what is waiting. */}
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-sans text-caption font-bold leading-none",
                    step.done
                      ? "border-gold/50 bg-gold/20 text-gold"
                      : isNext
                        ? "border-gold/60 text-gold"
                        : "border-paper/20 text-paper/35",
                  )}
                >
                  {step.done ? "✓" : isNext ? "●" : "–"}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-sans text-ui font-semibold",
                      step.done ? "text-paper/55 line-through" : "text-paper",
                    )}
                  >
                    {t(copy.title)}
                  </p>

                  {!step.done ? (
                    <p className="mt-1 font-serif text-body text-paper/65 leading-[1.55]">
                      {t(copy.body)}
                    </p>
                  ) : null}

                  {/* Which step is in the way, by name. "Not yet" tells
                      somebody nothing they can act on. */}
                  {step.blockedBy ? (
                    <p className="mt-2 font-sans text-caption text-paper/45">
                      {t("shop.setupWaitingOn")}:{" "}
                      {t(COPY[step.blockedBy].title).toLowerCase()}
                    </p>
                  ) : null}

                  {!step.done && !step.blockedBy ? (
                    <Link
                      href={step.href}
                      className="tap-press mt-3 inline-flex min-h-[40px] items-center rounded-pill border border-gold/40 bg-gold/[0.08] px-4 font-sans text-detail font-semibold text-gold hover:bg-gold/[0.16]"
                    >
                      {isNext ? t("shop.setupNext") : t(copy.title)}
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
