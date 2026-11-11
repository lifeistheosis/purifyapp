"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Diptychs } from "@/components/prayers/Diptychs";
import { PART_KEY, PartSwitch } from "@/components/prayers/mine/PartSwitch";
import { RuleHead } from "@/components/prayers/mine/RuleHead";
import { Book } from "@/components/ui/icons/Book";
import { Plus } from "@/components/ui/icons/Plus";
import { libraryRule, libraryRules } from "@/lib/prayers/library";
import {
  MY_RULE_PARTS,
  addItem,
  addItems,
  insertAt,
  itemKey,
  moveItem,
  openingPart,
  partMinutes,
  removeAt,
  withMinutes,
  type MyRule,
  type MyRuleItem,
  type MyRulePart,
} from "@/lib/prayers/myRule";
import { ruleIdForHour } from "@/lib/prayers/ruleForHour";
import { useIntentions } from "@/lib/prayers/storage";
import { readMyRule, useMyRule, writeMyRule } from "@/lib/prayers/useMyRule";

import { ItemSheet } from "./ItemSheet";
import { LibrarySheet } from "./LibrarySheet";
import { RememberedIn } from "./RememberedIn";
import { WayPlate, WayRow } from "./WayRow";
import { ReorderList, type ReorderRow } from "./ReorderList";

/** How long "Removed ... Undo" stays. */
const UNDO_MS = 5000;

/** A store that never changes: what it holds is read once, on the device. */
const never = () => () => {};

/** `make`, asked once: what a page opened with does not change under the reader because the hour or the rule did. */
function once<T>(make: () => T): () => T {
  let made: { value: T } | null = null;
  return () => (made ??= { value: make() }).value;
}

/** The part an address names (#evening), as the page's switch keeps it; null for none. */
function partInAddress(hash: string): MyRulePart | null {
  const name = hash.replace(/^#/, "").trim().toLowerCase();
  return (MY_RULE_PARTS as readonly string[]).includes(name) ? (name as MyRulePart) : null;
}

/** Names in a row, as the reader's language lists them ("Maria, Daniel, Elena"). */
function listed(names: string[], locale: string): string {
  try {
    return new Intl.ListFormat(locale, { style: "short", type: "unit" }).format(names);
  } catch {
    return names.join(", ");
  }
}

/**
 * Your rule (1.7, the owner's note 17): a morning and an evening rule of the
 * reader's own. The prayers are chosen from the prayer book (the Add sheet),
 * set in the reader's order by dragging a row's handle or from the row's
 * sheet, and prayed as one rule in the prayer reader with one button, Pray my
 * rule (/prayers/personal/<part>). Today leads its Pray row with it, and
 * praying it through keeps the day for the streak as the Morning Rule does
 * (lib/prayers/myRule.ts). The rule is kept on this device for now, and the
 * page says so.
 *
 * 1.8, the owner's pick A of round r3-27 (note 73 of build 86, "A with a
 * rule"), "the icon above, the steps below":
 *
 *   the head    the part's own icon fading in at the top under the clear
 *               bar, the page's name on it, and Pray my rule in its light
 *               with the part and its length (RuleHead)
 *   the switch  Morning and Evening on a carved track (PartSwitch); the part
 *               shown is the address's (#evening), else the hour's, else the
 *               one that has prayers, and the head's icon crosses with it
 *   the steps   the part's prayers as numbered steps on one thread, a handle
 *               on each to drag, Those I pray for lit with the praying
 *               figure, Add prayers the thread's last stop (ReorderList)
 *   empty       Nothing here yet, then the two ways in as one choice of two
 *               rows drawn alike, each saying what it brings
 *   the names   Those you pray for: In which prayers as one row that opens a
 *               sheet (RememberedIn), then the living, the reposed and the
 *               names from the prayer wall as rows of medallions, a tap
 *               opening a name (Diptychs)
 *
 * 1.9 (note 70) keeps a place here, in words only: a prayer campaign a reader
 * joins lands on this page, "in my morning prayers, in my evening prayers",
 * its prayer a step on this thread and its name among the names, each until
 * its last day. Nothing is drawn for it before then.
 */
export function MyRuleBuilder() {
  const { t, locale } = useTranslate();
  const rule = useMyRule();
  const living = useIntentions("living");
  const departed = useIntentions("departed");
  const library = useMemo(() => libraryRules(locale), [locale]);
  const lookup = useMemo(() => (id: string) => libraryRule(id, locale), [locale]);
  // The part shown: null until the device has said which (the address, the
  // hour and the rule are all the device's), and the head's icon waits for it.
  const [part, setPart] = useState<MyRulePart | null>(null);
  // The half the tile on Prayers wore to lead here: the half this page opens
  // on when the address names none, by the rule the tile reads too
  // (lib/prayers/myRule.ts, openingPart). Read once, on the device, at the
  // page's very first drawing (the idiom of lib/useMounted.ts; null on the
  // server and for a page loaded whole), and only so that the head's box
  // wears the tile's name from that first drawing: the page switch looks for
  // what takes the tile's picture as the page commits
  // (components/nav/RouteTransition.tsx, carryIn), one drawing before the
  // part below is known, and found nothing (1.9, P1). It never decides the
  // part: at a first drawing the address is still the page being left, so a
  // half named in it (#morning) is only read in the layout effect below, as
  // it always was. (Deciding the part here opened "#morning" on the evening
  // half; the export walk's section 68 caught it.)
  const [readTaking] = useState(() => once(() => openingPart(readMyRule(), ruleIdForHour(new Date().getHours()))));
  const taking = useSyncExternalStore<MyRulePart | null>(never, readTaking, () => null);
  // False until the first part has stood on the screen for a frame: until
  // then the switch is set without its cross-fade and the list arrives with
  // the page's own fade (build 89 note 9: opening on Morning and crossing to
  // Evening a moment later read as a bug). A reader's own tap still crosses.
  const [arrived, setArrived] = useState(false);
  // The sheets stay mounted with the part they were opened for, so each can
  // follow the finger away when it closes.
  const [adding, setAdding] = useState<MyRulePart>("morning");
  const [addOpen, setAddOpen] = useState(false);
  const [opened, setOpened] = useState<{ part: MyRulePart; index: number }>({ part: "morning", index: 0 });
  const [itemOpen, setItemOpen] = useState(false);
  const [undo, setUndo] = useState<{ part: MyRulePart; index: number; item: MyRuleItem; title: string } | null>(null);
  const undoTimer = useRef<number | undefined>(undefined);
  // The switch keeps its place on the screen whatever the part holds (build
  // 93 note 16). A part shorter than the one before could leave the page too
  // short for where it was scrolled, and the browser would pull the page,
  // and the switch with it, up under the finger (9px on a phone, 133px on a
  // tablet, measured on the export). So the page is always tall enough to
  // bring the switch up under the bar, and the room is kept at its foot,
  // where a short page simply ends on its own ground.
  const switchRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate: the address, the clock and the kept rule are the device's, and a
     server render of them bakes the build's into the Android export. A
     layout effect, so a page reached inside the app is first painted on the
     right part; only a page loaded whole paints before it, with neither part
     lit and no list drawn. */
  useLayoutEffect(() => {
    const kept = readMyRule();
    const hour = ruleIdForHour(new Date().getHours());
    // The rule the tile on Prayers reads too, so its picture is this head's (lib/prayers/myRule.ts, openingPart).
    setPart(openingPart(kept, hour, partInAddress(window.location.hash)));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (part === null || arrived) return;
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setArrived(true));
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [part, arrived]);

  useEffect(() => () => window.clearTimeout(undoTimer.current), []);

  useEffect(() => {
    const at = switchRef.current;
    if (!at) return;
    const measure = () => {
      const bar = document.querySelector("[data-mobile-topbar]")?.getBoundingClientRect().bottom ?? 0;
      // Scrolled this far, the switch has gone under the bar: no finger can reach it past here.
      const reach = at.getBoundingClientRect().bottom + window.scrollY - bar;
      setRoom(Math.ceil(reach + window.innerHeight));
    };
    measure();
    window.addEventListener("resize", measure);
    // The head can change its height (its words wrap once the type arrives).
    const head = at.parentElement?.querySelector("header");
    const resized = head && typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (head) resized?.observe(head);
    return () => {
      window.removeEventListener("resize", measure);
      resized?.disconnect();
    };
  }, []);

  // Each part's length, kept with the rule for Today, which does not carry
  // the prayer book. A rule kept before the count was made seconds first
  // (note 73) said 12 min for the book's 8: it is counted again here, where
  // the words are, and kept only when it changed.
  const minutes = useMemo(
    () => ({ morning: partMinutes(rule.morning, lookup), evening: partMinutes(rule.evening, lookup) }),
    [rule, lookup],
  );
  useEffect(() => {
    if (rule.minutes.morning !== minutes.morning || rule.minutes.evening !== minutes.evening) {
      writeMyRule(withMinutes(rule, minutes));
    }
  }, [rule, minutes]);

  function save(next: MyRule) {
    writeMyRule(
      withMinutes(next, {
        morning: partMinutes(next.morning, lookup),
        evening: partMinutes(next.evening, lookup),
      }),
    );
  }

  /** Show a part; kept in the address, so coming back from praying it opens it again. */
  function select(next: MyRulePart) {
    setPart(next);
    // replaceState, never push: back leaves the page, it does not walk the parts.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${next}`);
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
  // The names the step will read: the living, then the reposed.
  const groups = [living, departed].map((list) => list.map((n) => n.name.trim()).filter(Boolean)).filter((g) => g.length > 0);
  const namesLine = groups.length ? groups.map((g) => listed(g, locale)).join(locale === "ar" || locale === "ur" ? "؛ " : "; ") : t("prayers.mine.namesSub");
  const rowsOf = (p: MyRulePart): ReorderRow[] =>
    rule[p].map((item) => {
      if (item.kind === "names") {
        return { key: itemKey(item), title: t("prayers.mine.names"), meta: namesLine, lit: true };
      }
      const from = library.find((r) => r.id === item.rule);
      const prayer = from?.rule.prayers.find((x) => x.id === item.prayer);
      return {
        key: itemKey(item),
        title: prayer?.title ?? t("prayers.mine.missing"),
        meta: [t("prayers.mine.fromRule", { rule: ruleNameOf(item.rule) }), prayer ? t("today.minRead", { count: partMinutes([item], lookup) }) : null]
          .filter(Boolean)
          .join(" · "),
        lang: from?.lang,
      };
    });

  function remove(p: MyRulePart, index: number) {
    const item = rule[p][index];
    if (!item) return;
    save(removeAt(rule, p, index));
    setItemOpen(false);
    window.clearTimeout(undoTimer.current);
    setUndo({ part: p, index, item, title: titleOf(item) });
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
  }

  function toggle(p: MyRulePart, item: MyRuleItem) {
    const at = rule[p].findIndex((x) => itemKey(x) === itemKey(item));
    save(at >= 0 ? removeAt(rule, p, at) : addItem(rule, p, item));
  }

  /** What Start from Morning prayers brings: the prayer book's own rule, whole, in its order. */
  const seedOf = (p: MyRulePart): MyRuleItem[] =>
    (lookup(p)?.prayers ?? []).map((x) => ({ kind: "prayer", rule: p, prayer: x.id }) satisfies MyRuleItem);

  function openAdd(p: MyRulePart) {
    setAdding(p);
    setAddOpen(true);
  }

  const has = (p: MyRulePart) => rule[p].length > 0;
  // Nothing about a part is said before the device has said which part.
  const pray =
    part && has(part)
      ? { href: `/prayers/personal/${part}`, meta: t("prayers.mine.partMinutes", { part: t(PART_KEY[part]), min: minutes[part] }) }
      : null;
  // An empty part offers its start where Pray my rule stands (build 93 note
  // 16), so the switch under the head never moves whichever part is chosen.
  const start =
    part && !has(part)
      ? {
          label: part === "morning" ? t("prayers.mine.startFromMorning") : t("prayers.mine.startFromEvening"),
          onStart: () => {
            const chosen = part;
            save(addItems(rule, chosen, seedOf(chosen)));
          },
        }
      : null;

  const panel = (p: MyRulePart) => {
    return (
      <>
        {has(p) ? (
          <>
            <ReorderList
              rows={rowsOf(p)}
              onMove={(from, to) => save(moveItem(rule, p, from, to))}
              onOpen={(index) => {
                setOpened({ part: p, index });
                setItemOpen(true);
              }}
              foot={
                <button
                  type="button"
                  data-mine-add
                  onClick={() => openAdd(p)}
                  aria-haspopup="dialog"
                  className="rule-step rule-add tap-press flex min-h-14 w-full items-center gap-3 text-start"
                >
                  <span aria-hidden className="rule-node" data-quiet="">
                    <Plus size={14} />
                  </span>
                  <span className="font-sans text-ui font-semibold text-paper">{t("prayers.mine.add")}</span>
                </button>
              }
            />
            <p className="mt-3 font-sans text-caption leading-[1.5] text-paper/45">{t("prayers.mine.reorderHint")}</p>
          </>
        ) : (
          <div data-mine-empty>
            {/* No placeholder (build 93 note 16): the part's start stands in the
                head, and here its two ways in, said in one line. */}
            <p className="font-sans text-detail leading-[1.5] text-paper/70">{t("prayers.mine.emptyBody")}</p>
            {/* The other way in. The part's start is the head's pill, where Pray
                my rule stands (build 93 note 16): drawn here too, it stood
                twice on one screen, and the arbiter's word was to drop it. */}
            <div data-mine-ways className="set-panel mt-4">
              <WayRow
                lead={
                  <WayPlate>
                    <Book size={18} />
                  </WayPlate>
                }
                label={t("prayers.mine.addOneByOne")}
                desc={t("prayers.mine.addOneByOneWhat")}
                onClick={() => openAdd(p)}
                opensSheet
              />
            </div>
          </div>
        )}

        {undo && undo.part === p ? (
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
      </>
    );
  };

  const openedItem = rule[opened.part][opened.index];
  const openedRule = openedItem && openedItem.kind === "prayer" ? library.find((r) => r.id === openedItem.rule) : undefined;
  const openedPrayer = openedItem && openedItem.kind === "prayer" ? openedRule?.rule.prayers.find((p) => p.id === openedItem.prayer) : undefined;

  return (
    <section
      className="rule-page min-h-screen bg-night px-5 pb-16 md:px-8 md:pt-10"
      style={room ? { minHeight: room } : undefined}
      aria-labelledby="mine-title"
    >
      <div className="mx-auto w-full max-w-[640px]">
        <RuleHead part={part} takes={part ?? taking} pray={pray} start={start} />

        <div ref={switchRef} className="mt-6">
          <PartSwitch value={part} onChange={select} still={!arrived} />
        </div>
        {MY_RULE_PARTS.map((p) => {
          // Until the device has said which part, neither list is drawn: the
          // morning one holds its room unseen, so nothing moves when the
          // right one arrives, with the page's own fade.
          const holding = part === null;
          return (
            <div
              key={p}
              id={`mine-panel-${p}`}
              role="tabpanel"
              aria-labelledby={`mine-tab-${p}`}
              aria-hidden={holding || undefined}
              hidden={holding ? p !== "morning" : p !== part}
              className={holding ? "invisible mt-5" : arrived ? "rule-panel-follow mt-5" : "rule-panel-arrive mt-5"}
            >
              {panel(p)}
            </div>
          );
        })}

        <section aria-labelledby="mine-names" className="mt-14">
          <h2 id="mine-names" className="text-title-sm font-bold leading-tight text-paper">
            {t("prayers.mine.namesHeading")}
          </h2>
          <p className="mt-2 max-w-[60ch] font-sans text-detail leading-[1.55] text-paper/60">{t("prayers.commemorate.whereHint")}</p>
          {/* Which prayers carry these names: one row, opening a sheet (1.7.1, r3-27 A). */}
          <RememberedIn />
          <div className="mt-8">
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
