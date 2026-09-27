"use client";

// The prayer book: every rule by category, read like the contents page of a
// printed prayer book.
//
// Redesigned 2026-09-26 with the rest of the Prayers hub. What changed:
//   - One card, each category a band across it, and on a wide screen each
//     band's rules in two columns. Four category cards side by side left a
//     hole under every short one (the daily rule has nine, the Church year
//     two), the same empty space that was reported beside Continue praying.
//     Flowing the whole contents through two columns was tried first and cut
//     categories in half, with the second half under no heading.
//   - Each category is complete. The hub used to print a "Popular" list and
//     then leave those rules out of their own categories, so Morning prayers
//     was missing from the daily rule. Pray now and the quick pills are where
//     the common prayers are surfaced now.
//   - A planned rule (no verbatim text yet) is no longer a greyed row with a
//     "Planned" badge. Its category ends with one short line naming them, so
//     the index lists what can be prayed and still says honestly what is
//     coming.
//   - The rope and the reader's own intercessions are Practices tiles above,
//     so they are not repeated here.

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD, CARD_BG } from "@/components/ui/Graphite";
import { cn } from "@/lib/cn";
import { RULE_CATEGORY_ORDER, rulesByCategory, type RuleCategory, type RuleMeta } from "@/lib/prayers/rules";

/** "The Church year" already exists in the saints namespace, so it is reused
 *  rather than re-translated into twenty languages. */
const CATEGORY_KEY: Record<RuleCategory, string> = {
  daily: "prayers.category.daily",
  "daily-life": "prayers.category.dailyLife",
  "church-year": "saints.theChurchYear",
  devotional: "prayers.category.devotional",
};

/** Shown as Practices tiles above the book. */
const TILE_IDS = new Set(["rope", "intercessory"]);

export function PrayerBookIndex({ variant }: { variant: "desktop" | "mobile" }) {
  const { t, tn } = useTranslate();
  const desktop = variant === "desktop";

  // A catalog title when the rule has one, else the registry's English: a
  // missing key must never reach the screen as the key itself, which is how
  // "prayers.rule.pre-communion.title" came to be shown on 2026-09-26.
  const text = (r: RuleMeta, part: "title" | "description", fallback: string) => {
    const key = `prayers.rule.${r.id}.${part}`;
    const v = t(key);
    return v === key ? fallback : v;
  };

  const groups = RULE_CATEGORY_ORDER.map((category) => {
    const rules = rulesByCategory(category).filter((r) => !TILE_IDS.has(r.id));
    return { category, ready: rules.filter((r) => !r.planned), planned: rules.filter((r) => r.planned) };
  }).filter((g) => g.ready.length > 0 || g.planned.length > 0);

  return (
    <div className={cn(CARD, "hover:translate-y-0", desktop ? "p-7 md:p-10" : "p-5 md:p-5")} style={CARD_BG}>
      {groups.map(({ category, ready, planned }, i) => {
        // Two columns from lg: the last row's rules take no rule under them.
        // Below lg it is one column and only the last rule goes without.
        const lastRow = ready.length - (ready.length % 2 || 2);
        return (
          <section key={category} className={cn(i > 0 && (desktop ? "mt-10" : "mt-8"))}>
            <h3 className={cn("font-bold leading-tight text-paper", desktop ? "text-title-sm" : "text-lede")}>
              {t(CATEGORY_KEY[category])}
            </h3>
            {ready.length > 0 ? (
              <ul className={cn("mt-3", desktop && "lg:grid lg:grid-cols-2 lg:gap-x-12")}>
                {ready.map((r, j) => (
                  <li
                    key={r.id}
                    className={cn(
                      "border-b border-paper/10 last:border-b-0",
                      desktop && j >= lastRow && "lg:border-b-0",
                    )}
                  >
                    <Link
                      href={r.href}
                      className="group/row -mx-2 flex min-h-11 items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-paper/[0.04] active:bg-paper/[0.06] focus-visible:outline-2 focus-visible:outline-paper"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-heading text-ui font-semibold leading-snug text-paper">
                          {text(r, "title", r.title)}
                        </span>
                        {r.description ? (
                          <span className="mt-0.5 block truncate font-sans text-caption text-paper/55 md:text-detail">
                            {text(r, "description", r.description)}
                          </span>
                        ) : null}
                      </span>
                      {r.estimatedMinutes ? (
                        <span className="shrink-0 font-sans text-caption tabular-nums text-paper/50">
                          {tn("prayers.approxMin", r.estimatedMinutes)}
                        </span>
                      ) : null}
                      <span
                        aria-hidden
                        className="shrink-0 font-sans text-ui text-paper/35 transition-transform duration-200 group-hover/row:translate-x-0.5 group-hover/row:text-paper motion-reduce:transition-none"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {planned.length > 0 ? (
              <p className="mt-3 font-sans text-caption leading-[1.6] text-paper/45">
                <span className="font-semibold uppercase tracking-[1px] text-paper/55">{t("study.planned")}</span>
                <span aria-hidden className="text-paper/30">{" · "}</span>
                {planned.map((r) => text(r, "title", r.title)).join(", ")}
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
