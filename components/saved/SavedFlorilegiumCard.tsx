"use client";

// The Florilegium's card beside the /saved heading: the way from the things a
// reader has bookmarked to the lines they have gathered, with how many lines
// that is once there are any. Client-side because the count is on the device.
// It used to be a plain box at the foot of the page, under every group.

import Link from "next/link";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PREMIUM_CHIP } from "@/components/premium/PremiumUI";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { CARD, CARD_BG, CTA, ICON_TILE } from "@/components/ui/Graphite";
import { Flower } from "@/components/ui/icons/Flower";
import { cn } from "@/lib/cn";
import { useFlorilegia } from "@/lib/florilegium/florilegium";
import { useMounted } from "@/lib/useMounted";

export function SavedFlorilegiumCard() {
  const { t, tn } = useTranslate();
  const { florilegia } = useFlorilegia();
  const mounted = useMounted();
  const lines = florilegia.reduce((n, f) => n + f.items.length, 0);
  // Plus: shown to everyone, with a Plus chip where it is locked; a reader
  // without Plus meets the upgrade sheet named for it rather than the gate
  // page (lib/entitlements/usePlusFeatures.ts).
  const upgrade = useUpgradeModal();
  const plusAllowed = usePlusFeatures();
  const locked = plusAllowed === false;

  return (
    <Link
      href="/florilegium"
      onClick={(e) => {
        if (!locked) return;
        e.preventDefault();
        upgrade.open("florilegium");
      }}
      className={cn(CARD, "rounded-[22px] md:p-7")}
      style={CARD_BG}
    >
      <div className="flex items-start justify-between gap-4">
        <span aria-hidden className={ICON_TILE}>
          <Flower size={24} />
        </span>
        {locked ? (
          <span className={PREMIUM_CHIP}>{t("study.purifyPlus")}</span>
        ) : mounted && lines > 0 ? (
          <span className="font-sans text-caption tabular-nums text-paper/55">
            {tn("study.florilegium.lineCount", lines)}
          </span>
        ) : null}
      </div>
      <p className="mt-6 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
        {t("study.florilegium.title")}
      </p>
      <p className="mt-2 font-heading text-title-sm font-bold leading-tight text-paper">
        {t("study.florilegium.lead")}
      </p>
      <p className="mt-2 font-sans text-detail leading-[1.55] text-paper/65">
        {t("study.yourOwnCollectionsOfVerses")}
      </p>
      <p className={cn(CTA, "mt-auto pt-6")}>
        <span aria-hidden>→</span>
      </p>
    </Link>
  );
}
