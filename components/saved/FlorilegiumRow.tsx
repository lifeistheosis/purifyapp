"use client";

// The way from Saved to the Florilegium, as one slim row at the top of the
// list (1.7, the owner's note 21: "cleaner, a simpler UI"). It was a large
// card beside a desktop hero, ending in a bare arrow character. Shown to
// every reader: with the Plus mark where it is locked, whose tap opens the
// upgrade sheet named for it (lib/entitlements/usePlusFeatures.ts), and with
// the count of lines gathered once there are any.

import Link from "next/link";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PREMIUM_CHIP } from "@/components/premium/PremiumUI";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Flower } from "@/components/ui/icons/Flower";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { useFlorilegia } from "@/lib/florilegium/florilegium";
import { useMounted } from "@/lib/useMounted";

export function FlorilegiumRow() {
  const { t, tn } = useTranslate();
  const { florilegia } = useFlorilegia();
  const mounted = useMounted();
  const upgrade = useUpgradeModal();
  const locked = usePlusFeatures() === false;
  const lines = florilegia.reduce((n, f) => n + f.items.length, 0);

  return (
    <Link
      href="/florilegium"
      onClick={(e) => {
        if (!locked) return;
        e.preventDefault();
        upgrade.open("florilegium");
      }}
      className="tap-press flex min-h-14 items-center gap-3.5 border-y border-paper/8 py-3 text-paper/85 motion-safe:transition-colors hover:text-paper"
    >
      <Flower size={20} className="shrink-0 text-paper/60" />
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-ui font-semibold text-paper">{t("study.florilegium.title")}</span>
        <span className="block truncate font-sans text-caption text-paper/55">{t("study.florilegium.lead")}</span>
      </span>
      {locked ? (
        <span className={PREMIUM_CHIP}>{t("study.purifyPlus")}</span>
      ) : mounted && lines > 0 ? (
        <span className="shrink-0 font-sans text-caption tabular-nums text-paper/55">{tn("study.florilegium.lineCount", lines)}</span>
      ) : null}
      <ChevronLeft size={16} className="shrink-0 -scale-x-100 text-paper/40 rtl:scale-x-100" />
    </Link>
  );
}
