"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useInReadersLanguage, type Loaders } from "@/components/i18n/useInReadersLanguage";

import { PrayerRuleReader, type Rule } from "./PrayerRuleReader";

/**
 * Every language a prayer rule is written in besides English, each its own
 * file beside the English (`rules/morning.de.json`), loaded on the device when
 * the reader's language is one of them (1.9; the Morning and Evening Rules and
 * the Creed have German). lib/i18n/__tests__/serverLocale.test.ts holds every
 * such file to a row here, so a new translation cannot sit unread.
 */
export const RULE_FILES: Readonly<Record<string, Loaders<Rule>>> = {
  "rules/morning.json": { de: () => import("@/data/prayers/rules/morning.de.json").then((m) => m.default as unknown as Rule) },
  "rules/evening.json": { de: () => import("@/data/prayers/rules/evening.de.json").then((m) => m.default as unknown as Rule) },
  "rules/creed.json": { de: () => import("@/data/prayers/rules/creed.de.json").then((m) => m.default as unknown as Rule) },
};

/**
 * A prayer rule in the reader's language (1.9, the arbiter's yes to the
 * German texts in the apps). The page writes the English rule, as it always
 * has; a German reader prays the German file's, loaded on the device. Until
 * 1.9 the page chose on the server, which in the apps knows no reader
 * (lib/i18n/server.ts): a German reader prayed in English.
 *
 * The reader says so where the words are not in the reader's language
 * (`contentLocale`, components/prayers/service/ServiceHeader.tsx). While the
 * reader's own file is on its way, a moment, the English stands without
 * saying so, and the rule is drawn anew in its language when it comes.
 */
export function RuleInReadersLanguage({ rule, file, ruleHref, titleKey }: { rule: Rule; file: string; ruleHref: string; titleKey: string }) {
  const { locale } = useTranslate();
  const { value, lang, coming } = useInReadersLanguage<Rule>(rule, RULE_FILES[file] ?? {}, file);
  return <PrayerRuleReader key={lang} rule={value} ruleHref={ruleHref} titleKey={titleKey} contentLocale={coming ? locale : lang} />;
}
