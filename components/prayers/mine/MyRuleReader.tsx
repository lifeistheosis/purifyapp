"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PrayerRuleReader } from "@/components/prayers/PrayerRuleReader";
import { RecordPrayerOpened } from "@/components/prayers/RecordPrayerOpened";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { libraryRule } from "@/lib/prayers/library";
import { MY_RULE_IDS, composeRule, type MyRulePart } from "@/lib/prayers/myRule";
import { useMyRule } from "@/lib/prayers/useMyRule";
import { useIntentions } from "@/lib/prayers/storage";
import { useMounted } from "@/lib/useMounted";

const TITLE_KEY: Record<MyRulePart, string> = {
  morning: "prayers.mine.morningTitle",
  evening: "prayers.mine.eveningTitle",
};

/**
 * A part of the reader's own rule, prayed (1.7): composed on the device from
 * the reader's choice and the prayer book's own words (lib/prayers/myRule.ts),
 * and read in the prayer reader like any rule, with its icon, Begin, Pray
 * with, each prayer line by line under its own source, and Mark prayed.
 * Marking every prayer keeps the day under mine-morning or mine-evening, so
 * the streak counts it as it counts the Morning Rule. An empty part says so
 * and leads back to the builder.
 */
export function MyRuleReader({ part }: { part: MyRulePart }) {
  const { t, locale } = useTranslate();
  const mounted = useMounted();
  const mine = useMyRule();
  const living = useIntentions("living");
  const departed = useIntentions("departed");
  const titleKey = TITLE_KEY[part];

  const composed = useMemo(
    () =>
      composeRule(
        part,
        mine[part],
        (id) => libraryRule(id, locale),
        { living, departed },
        {
          title: t(titleKey),
          namesTitle: t("prayers.mine.names"),
          namesInstruction: t("prayers.mine.namesInstruction"),
          namesNone: t("prayers.mine.namesNone"),
          living: t("prayers.diptychs.livingHeading"),
          departed: t("prayers.diptychs.reposedHeading"),
        },
      ),
    [part, mine, locale, living, departed, t, titleKey],
  );

  // The rule lives on the device: nothing to show until the page has read it.
  if (!mounted) return <div aria-hidden className="min-h-[60vh]" />;

  if (composed.rule.prayers.length === 0) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-center py-16 text-center">
        <h1 id="prayer-title" className="text-title font-bold leading-[1.12] text-paper">
          {t(titleKey)}
        </h1>
        <p className="mt-3 max-w-[40ch] font-sans text-detail leading-[1.6] text-paper/65">{t("prayers.mine.partEmpty")}</p>
        <Link
          href="/prayers/personal"
          className="tap-press mt-6 inline-flex min-h-12 items-center gap-1.5 rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night"
        >
          {t("prayers.mine.build")}
          <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <RecordPrayerOpened id={MY_RULE_IDS[part]} titleKey={titleKey} href={`/prayers/personal/${part}`} />
      <PrayerRuleReader
        rule={composed.rule}
        ruleHref={`/prayers/personal/${part}`}
        titleKey={titleKey}
        artId={MY_RULE_IDS[part]}
        contentLocale={locale === "de" ? "de" : "en"}
      />
      {composed.missing > 0 ? (
        <p className="mx-auto mt-6 max-w-[640px] font-sans text-caption text-paper/50">{t("prayers.mine.missingNote")}</p>
      ) : null}
    </>
  );
}
