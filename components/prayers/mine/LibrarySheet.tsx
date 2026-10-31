"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SearchField } from "@/components/search/SearchField";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { Plus } from "@/components/ui/icons/Plus";
import { cn } from "@/lib/cn";
import { savedPrayers } from "@/lib/prayers/bookmarks";
import type { LibraryGroup, LibraryRule } from "@/lib/prayers/library";
import { itemKey, prayerMinutes, type MyRuleItem } from "@/lib/prayers/myRule";

/** The prayer book's groups, by the names the prayer book itself uses. */
const GROUP_KEY: Record<LibraryGroup, string> = {
  daily: "prayers.category.daily",
  "daily-life": "prayers.category.dailyLife",
  "church-year": "saints.theChurchYear",
  devotional: "prayers.category.devotional",
  hours: "ui.theHours",
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function subscribeSaved(cb: () => void): () => void {
  window.addEventListener("purify:bookmark", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("purify:bookmark", cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * The prayer book, to choose from (1.7, Your rule): the prayers the reader
 * has saved first, then those they pray for, then every rule of the prayer
 * book in its own order and the Hours, each opening to its prayers. A
 * prayer already in the rule wears a check; a tap on it takes it out again.
 * A search finds a prayer by its name or its rule's.
 */
export function LibrarySheet({
  open,
  onClose,
  library,
  chosen,
  onToggle,
  onAddAll,
}: {
  open: boolean;
  onClose: () => void;
  library: LibraryRule[];
  /** The part's items, by itemKey. */
  chosen: ReadonlySet<string>;
  onToggle: (item: MyRuleItem) => void;
  onAddAll: (items: MyRuleItem[]) => void;
}) {
  const { t, tn } = useTranslate();
  const [query, setQuery] = useState("");
  const [openRule, setOpenRule] = useState<string | null>(null);
  const savedRaw = useSyncExternalStore(
    subscribeSaved,
    () => JSON.stringify(savedPrayers()),
    () => "[]",
  );

  const ruleName = (r: LibraryRule) => {
    const key = `prayers.rule.${r.id}.title`;
    const v = t(key);
    return v === key ? r.rule.title : v;
  };

  const saved = useMemo(() => {
    const list = JSON.parse(savedRaw) as { ruleId: string; prayerId: string }[];
    return list.flatMap(({ ruleId, prayerId }) => {
      const r = library.find((x) => x.id === ruleId);
      const p = r?.rule.prayers.find((x) => x.id === prayerId);
      return r && p ? [{ r, p }] : [];
    });
  }, [savedRaw, library]);

  const q = normalize(query.trim());
  const found = q
    ? library.flatMap((r) =>
        r.rule.prayers.filter((p) => normalize(p.title).includes(q) || normalize(ruleName(r)).includes(q)).map((p) => ({ r, p })),
      )
    : [];

  const row = (r: LibraryRule, prayerId: string, title: string, minutes: number, withRule: boolean) => {
    const item: MyRuleItem = { kind: "prayer", rule: r.id, prayer: prayerId };
    const on = chosen.has(itemKey(item));
    return (
      <li key={`${r.id}/${prayerId}`} className="flex items-center gap-3 py-2.5">
        <span className="flex min-w-0 flex-1 flex-col">
          <span lang={r.lang} className="truncate font-serif text-ui font-semibold text-paper">
            {title}
          </span>
          <span className="truncate font-sans text-caption text-paper/50">
            {[withRule ? ruleName(r) : null, t("today.minRead", { count: minutes })].filter(Boolean).join(" · ")}
          </span>
        </span>
        <button
          type="button"
          aria-pressed={on}
          aria-label={on ? t("prayers.mine.takeOut", { title }) : t("prayers.mine.addPrayer", { title })}
          onClick={() => onToggle(item)}
          className={cn(
            "tap-press inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full motion-safe:transition-colors",
            on ? "bg-paper text-night" : "text-paper/80 ring-1 ring-inset ring-paper/20 hover:text-paper",
          )}
        >
          {on ? <Check size={17} /> : <Plus size={18} />}
        </button>
      </li>
    );
  };

  const groups = (["daily", "daily-life", "church-year", "devotional", "hours"] as LibraryGroup[])
    .map((g) => ({ g, rules: library.filter((r) => r.group === g) }))
    .filter(({ rules }) => rules.length > 0);
  const namesOn = chosen.has("names");

  return (
    <Sheet open={open} onClose={onClose} title={t("prayers.mine.add")} desktop>
      {/* The prayer book to choose from filters itself in place, in the app's
          one field (1.8, r3-12). */}
      <SearchField value={query} onChange={setQuery} placeholder={t("prayers.searchPlaceholder")} className="mb-3" />

      {q ? (
        found.length ? (
          <ul className="divide-y divide-paper/10">{found.map(({ r, p }) => row(r, p.id, p.title, prayerMinutes(p), true))}</ul>
        ) : (
          <p className="py-6 font-sans text-detail text-paper/55">{t("bible.noMatches")}</p>
        )
      ) : (
        <>
          {saved.length ? (
            <section aria-labelledby="mine-lib-saved" className="mb-5">
              <h3 id="mine-lib-saved" className="font-sans text-caption text-paper/55" style={{ fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                {t("prayers.mine.saved")}
              </h3>
              <ul className="divide-y divide-paper/10">{saved.map(({ r, p }) => row(r, p.id, p.title, prayerMinutes(p), true))}</ul>
            </section>
          ) : null}

          <ul className="mb-5 border-y border-paper/10">
            <li className="flex items-center gap-3 py-2.5">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-serif text-ui font-semibold text-paper">{t("prayers.mine.names")}</span>
                <span className="font-sans text-caption text-paper/50">{t("prayers.mine.namesSub")}</span>
              </span>
              <button
                type="button"
                aria-pressed={namesOn}
                aria-label={namesOn ? t("prayers.mine.takeOut", { title: t("prayers.mine.names") }) : t("prayers.mine.addPrayer", { title: t("prayers.mine.names") })}
                onClick={() => onToggle({ kind: "names" })}
                className={cn(
                  "tap-press inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full motion-safe:transition-colors",
                  namesOn ? "bg-paper text-night" : "text-paper/80 ring-1 ring-inset ring-paper/20 hover:text-paper",
                )}
              >
                {namesOn ? <Check size={17} /> : <Plus size={18} />}
              </button>
            </li>
          </ul>

          {groups.map(({ g, rules }) => (
            <section key={g} aria-labelledby={`mine-lib-${g}`} className="mb-5">
              <h3 id={`mine-lib-${g}`} className="font-sans text-caption text-paper/55" style={{ fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                {t(GROUP_KEY[g])}
              </h3>
              <ul className="divide-y divide-paper/10">
                {rules.map((r) => {
                  const expanded = openRule === r.id;
                  const items: MyRuleItem[] = r.rule.prayers.map((p) => ({ kind: "prayer", rule: r.id, prayer: p.id }));
                  const all = items.every((i) => chosen.has(itemKey(i)));
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setOpenRule(expanded ? null : r.id)}
                        className="tap-press flex min-h-12 w-full items-center gap-3 py-2 text-start"
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-serif text-ui font-semibold text-paper">{ruleName(r)}</span>
                          <span className="font-sans text-caption text-paper/50">
                            {[tn("prayers.reader.prayerCount", r.rule.prayers.length), t("today.minRead", { count: r.rule.estimatedMinutes })].join(" · ")}
                          </span>
                        </span>
                        <ChevronDown size={15} className={cn("shrink-0 text-paper/50 motion-safe:transition-transform", expanded && "rotate-180")} />
                      </button>
                      {expanded ? (
                        <div className="pb-3 ps-3">
                          <button
                            type="button"
                            disabled={all}
                            onClick={() => onAddAll(items)}
                            className="tap-press mb-1 inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 font-sans text-detail font-semibold text-paper/80 ring-1 ring-inset ring-paper/15 hover:text-paper disabled:opacity-40"
                          >
                            {all ? <Check size={15} className="shrink-0" /> : <Plus size={15} className="shrink-0" />}
                            {all ? t("prayers.mine.allAdded") : t("prayers.mine.addAll")}
                          </button>
                          <ul className="divide-y divide-paper/[0.07]">
                            {r.rule.prayers.map((p) => row(r, p.id, p.title, prayerMinutes(p), false))}
                          </ul>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </Sheet>
  );
}
