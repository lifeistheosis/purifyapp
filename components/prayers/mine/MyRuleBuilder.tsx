"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { ArtPlate } from "@/components/prayers/ArtPlate";
import { Diptychs } from "@/components/prayers/Diptychs";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Plus } from "@/components/ui/icons/Plus";
import { libraryRule, libraryRules } from "@/lib/prayers/library";
import {
  MY_RULE_PARTS,
  addItem,
  addItems,
  insertAt,
  itemKey,
  moveItem,
  partMinutes,
  removeAt,
  withMinutes,
  type MyRule,
  type MyRuleItem,
  type MyRulePart,
} from "@/lib/prayers/myRule";
import { ruleIdForHour } from "@/lib/prayers/ruleForHour";
import { useMyRule, writeMyRule } from "@/lib/prayers/useMyRule";

import { ItemSheet } from "./ItemSheet";
import { LibrarySheet } from "./LibrarySheet";
import { RememberedIn } from "./RememberedIn";
import { ReorderList, type ReorderRow } from "./ReorderList";

/** How long "Removed ... Undo" stays. */
const UNDO_MS = 5000;

const PART_KEY: Record<MyRulePart, string> = {
  morning: "prayers.tabs.morning",
  evening: "prayers.tabs.evening",
};

/**
 * Your rule (1.7, the owner's note 17): a morning and an evening rule of the
 * reader's own. The prayers are chosen from the prayer book (the Add sheet),
 * set in the reader's order by dragging a row's handle or from the row's
 * sheet, and prayed as one rule in the prayer reader with one button, Pray my
 * rule (/prayers/personal/<part>), which opens the part the hour calls for.
 * Today leads its Pray row with it, and praying it through keeps the day for
 * the streak as the Morning Rule does (lib/prayers/myRule.ts).
 *
 * Under the rule, the names the reader carries (the Diptychs, unchanged in
 * what they keep), which a rule can take in as one of its steps.
 *
 * The rule is kept on this device for now, and the page says so.
 */
export function MyRuleBuilder() {
  const { t, tn, locale } = useTranslate();
  const rule = useMyRule();
  const library = useMemo(() => libraryRules(locale), [locale]);
  const lookup = useMemo(() => (id: string) => libraryRule(id, locale), [locale]);
  const [hourPart, setHourPart] = useState<MyRulePart>("morning");
  // The sheets stay mounted with the part they were opened for, so each can
  // follow the finger away when it closes.
  const [adding, setAdding] = useState<MyRulePart>("morning");
  const [addOpen, setAddOpen] = useState(false);
  const [opened, setOpened] = useState<{ part: MyRulePart; index: number }>({ part: "morning", index: 0 });
  const [itemOpen, setItemOpen] = useState(false);
  const [undo, setUndo] = useState<{ part: MyRulePart; index: number; item: MyRuleItem; title: string } | null>(null);
  const undoTimer = useRef<number | undefined>(undefined);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate: the clock is client-only, and a server render of it bakes the
     build hour into the Android export. */
  useEffect(() => {
    setHourPart(ruleIdForHour(new Date().getHours()));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => () => window.clearTimeout(undoTimer.current), []);

  function save(next: MyRule) {
    writeMyRule(
      withMinutes(next, {
        morning: partMinutes(next.morning, lookup),
        evening: partMinutes(next.evening, lookup),
      }),
    );
  }

  const titleOf = (item: MyRuleItem): string => {
    if (item.kind === "names") return t("prayers.mine.names");
    return lookup(item.rule)?.prayers.find((p) => p.id === item.prayer)?.title ?? t("prayers.mine.missing");
  };
  const ruleNameOf = (id: string): string => {
    const key = `prayers.rule.${id}.title`;
    const v = t(key);
    return v === key ? (lookup(id)?.title ?? id) : v;
  };
  const rowsOf = (part: MyRulePart): ReorderRow[] =>
    rule[part].map((item) => {
      if (item.kind === "names") {
        return { key: itemKey(item), title: t("prayers.mine.names"), meta: t("prayers.mine.namesSub") };
      }
      const from = library.find((r) => r.id === item.rule);
      const p = from?.rule.prayers.find((x) => x.id === item.prayer);
      return {
        key: itemKey(item),
        title: p?.title ?? t("prayers.mine.missing"),
        meta: [t("prayers.mine.fromRule", { rule: ruleNameOf(item.rule) }), p ? t("today.minRead", { count: partMinutes([item], lookup) }) : null]
          .filter(Boolean)
          .join(" · "),
        lang: from?.lang,
      };
    });

  function remove(part: MyRulePart, index: number) {
    const item = rule[part][index];
    if (!item) return;
    save(removeAt(rule, part, index));
    setItemOpen(false);
    window.clearTimeout(undoTimer.current);
    setUndo({ part, index, item, title: titleOf(item) });
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
  }

  function toggle(part: MyRulePart, item: MyRuleItem) {
    const at = rule[part].findIndex((x) => itemKey(x) === itemKey(item));
    save(at >= 0 ? removeAt(rule, part, at) : addItem(rule, part, item));
  }

  function seed(part: MyRulePart) {
    const from = lookup(part);
    if (!from) return;
    save(addItems(rule, part, from.prayers.map((p) => ({ kind: "prayer", rule: part, prayer: p.id }) satisfies MyRuleItem)));
  }

  const has = (part: MyRulePart) => rule[part].length > 0;
  const prayPart: MyRulePart | null = has(hourPart) ? hourPart : MY_RULE_PARTS.find(has) ?? null;
  const meta = MY_RULE_PARTS.filter(has).map((part) =>
    t("prayers.mine.partMinutes", { part: t(PART_KEY[part]), min: rule.minutes[part] || partMinutes(rule[part], lookup) }),
  );

  const panel = (part: MyRulePart) => (
    <div>
      {has(part) ? (
        <>
          <p className="mb-3 font-sans text-caption text-paper/50">{t("prayers.mine.reorderHint")}</p>
          <ReorderList
            rows={rowsOf(part)}
            onMove={(from, to) => save(moveItem(rule, part, from, to))}
            onOpen={(index) => {
              setOpened({ part, index });
              setItemOpen(true);
            }}
          />
          <p className="mt-3 font-sans text-caption text-paper/55">
            {[tn("prayers.reader.prayerCount", rule[part].length), t("prayers.reader.aboutMin", { min: partMinutes(rule[part], lookup) })].join(" · ")}
          </p>
        </>
      ) : (
        <div className="border-y border-paper/10 py-6">
          <p className="font-serif text-body text-paper/85">{t("prayers.mine.emptyPart")}</p>
          <p className="mt-1 font-sans text-detail leading-[1.55] text-paper/60">{t("prayers.mine.emptyBody")}</p>
          <button
            type="button"
            onClick={() => seed(part)}
            className="tap-press mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-pill px-4 font-sans text-detail font-semibold text-paper ring-1 ring-inset ring-paper/25 hover:bg-paper/[0.06]"
          >
            {part === "morning" ? t("prayers.mine.startFromMorning") : t("prayers.mine.startFromEvening")}
          </button>
        </div>
      )}

      {undo && undo.part === part ? (
        <p role="status" className="mt-3 flex min-h-11 items-center gap-3 font-sans text-detail text-paper/75">
          <span className="min-w-0 truncate">{t("prayers.mine.removed", { title: undo.title })}</span>
          <button
            type="button"
            onClick={() => {
              save(insertAt(rule, undo.part, undo.index, undo.item));
              window.clearTimeout(undoTimer.current);
              setUndo(null);
            }}
            className="tap-press inline-flex min-h-11 shrink-0 items-center px-2 font-semibold text-paper underline underline-offset-4"
          >
            {t("prayers.mine.undo")}
          </button>
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setAdding(part);
          setAddOpen(true);
        }}
        aria-haspopup="dialog"
        className="tap-press mt-4 inline-flex min-h-12 items-center gap-2 rounded-pill bg-paper/[0.08] px-5 font-sans text-ui font-semibold text-paper hover:bg-paper/[0.12]"
      >
        <Plus size={17} className="shrink-0" />
        {t("prayers.mine.add")}
      </button>
    </div>
  );

  const openedItem = rule[opened.part][opened.index];
  const openedRule = openedItem && openedItem.kind === "prayer" ? library.find((r) => r.id === openedItem.rule) : undefined;
  const openedPrayer = openedItem && openedItem.kind === "prayer" ? openedRule?.rule.prayers.find((p) => p.id === openedItem.prayer) : undefined;

  return (
    <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14" aria-labelledby="mine-title">
      <div className="mx-auto w-full max-w-[640px]">
        <header className="flex flex-col items-center text-center">
          <ArtPlate id="mine" size="md" className="shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]" />
          <h1 id="mine-title" className="mt-6 text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper md:text-heading">
            {t("prayers.mine.title")}
          </h1>
          {meta.length ? <p className="mt-2 font-sans text-caption text-paper/50">{meta.join(" · ")}</p> : null}
          <p className="mt-3 max-w-[46ch] font-sans text-detail leading-[1.6] text-paper/65">{t("prayers.mine.intro")}</p>
          {prayPart ? (
            <Link
              href={`/prayers/personal/${prayPart}`}
              data-mine-pray
              className="tap-press mt-6 inline-flex min-h-12 items-center gap-1.5 rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night"
            >
              {t("prayers.mine.pray")}
              <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
            </Link>
          ) : null}
        </header>

        <SectionTabs
          idBase="mine"
          labelKey="prayers.mine.partsLabel"
          className="mt-8"
          tabs={MY_RULE_PARTS.map((part) => ({ id: part, labelKey: PART_KEY[part], panel: panel(part) }))}
        />

        <section aria-labelledby="mine-names" className="mt-14">
          <h2 id="mine-names" className="text-title-sm font-bold leading-tight text-paper">
            {t("prayers.mine.namesHeading")}
          </h2>
          <p className="mt-2 max-w-[60ch] font-sans text-detail leading-[1.6] text-paper/65">
            {t("prayers.personalPage.intro")} <em className="font-serif">{t("prayers.personalPage.theotokosLine")}</em>.
          </p>
          {/* Which prayers carry these names, and anyone added from the prayer wall (1.7.1). */}
          <RememberedIn />
          <div className="mt-6">
            <Diptychs />
          </div>
        </section>

        <p className="mt-12 border-t border-paper/10 pt-6 font-sans text-caption leading-[1.7] text-paper/50">
          {t("prayers.mine.deviceNote")}
        </p>
      </div>

      <LibrarySheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        library={library}
        chosen={new Set(rule[adding].map(itemKey))}
        onToggle={(item) => toggle(adding, item)}
        onAddAll={(items) => save(addItems(rule, adding, items))}
      />

      {openedItem ? (
        <ItemSheet
          open={itemOpen}
          onClose={() => setItemOpen(false)}
          title={titleOf(openedItem)}
          from={openedItem.kind === "prayer" ? t("prayers.mine.fromRule", { rule: ruleNameOf(openedItem.rule) }) : t("prayers.mine.namesSub")}
          words={openedPrayer ? (openedPrayer.text ?? openedPrayer.variants?.[0]?.text ?? openedPrayer.instruction) : undefined}
          lang={openedRule?.lang}
          canUp={opened.index > 0}
          canDown={opened.index < rule[opened.part].length - 1}
          onUp={() => {
            save(moveItem(rule, opened.part, opened.index, opened.index - 1));
            setOpened({ ...opened, index: opened.index - 1 });
          }}
          onDown={() => {
            save(moveItem(rule, opened.part, opened.index, opened.index + 1));
            setOpened({ ...opened, index: opened.index + 1 });
          }}
          onRemove={() => remove(opened.part, opened.index)}
        />
      ) : null}
    </section>
  );
}
