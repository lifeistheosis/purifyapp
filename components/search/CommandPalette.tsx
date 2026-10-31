"use client";

// Search: one screen, the same from anywhere (1.8, the owner's pick of r3-12,
// "C, with the mix of B", locked 2026-10-30; his note 46 of build 80).
//
// The app had fourteen searches, each drawn its own way and opening its own
// way (a full screen, a sheet, a dropdown, in place), and on Theology two on
// one screen that gave two answers to the same word. Now the places that
// search the whole library all open this screen, and the places that filter
// their own list keep filtering in place in the same field
// (components/search/SearchField.tsx). It opens from anywhere by one event,
// `openSearch(place?)` (lib/search/open.ts): Cmd+K or Ctrl+K on a computer,
// the bar's magnifier, Discover's field, a place's own field, Theology's pill.
//
// C, on a phone:
//   - the field docked at the foot, over the keyboard, in reach of the thumb
//     (the frame the keyboard leaves, lib/ui/viewport.ts), with a round plate
//     beside it to leave; Back and Escape leave too;
//   - before anything is typed, "Search", then Look in: the library's doors in
//     the app's own pictures, and the reader's recent words just over the
//     field (on this phone only, lib/search/recent.ts);
//   - while typing, the doors count what each found, the top result is drawn
//     as a band over its picture, and the words that finish the one being
//     typed sit nearest the thumb;
//   - after the Search key, the results: in Everything the top result, then
//     each group three at a time with All, the saints by their faces; behind
//     a door, its kinds; nothing found says so once and offers a near
//     spelling ("Did you mean"), then the doors to browse.
// B, mixed in: opened from inside a place the screen starts turned to that
// place's door, with the place's kinds under the doors as an underlined
// strip to narrow it, and with nothing typed a kind lists itself whole.
//
// A computer keeps a card with the field at its head, as it always had: the
// same doors, strip and rows, arrows and Enter to choose, Escape to close.
//
// NO SIGNAL. Everything it looks through is two files in the apps' export
// (app/search-corpus.json, app/theology-search.json), fetched with relative
// addresses, so it answers on a plane as anywhere. With no connection one
// quiet line over the field says it is searching what Purify keeps on this
// phone, and the shop, which needs the network, goes grey.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { cn } from "@/lib/cn";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import {
  behind,
  completions as finishing,
  doorCounts,
  doorsFound,
  groupSections,
  inDoor,
  kindCounts,
  kindIn,
  kindSections,
  mergeIndex,
  nearSpelling,
  pictureFor,
  prepare,
  results,
  vocabulary,
  withDefinitions,
  type SearchRow,
  type Section,
  type TheologyEntry,
} from "@/lib/search/engine";
import { inReadersLanguage } from "@/lib/search/match";
import { SEARCH_OPEN_EVENT, placeOf } from "@/lib/search/open";
import {
  DOORS,
  DOOR_HINT,
  DOOR_KINDS,
  EVERYTHING,
  GROUP_LABEL,
  KIND_LABEL,
  doorOf,
  placeForPath,
  turnFor,
  type DoorId,
  type KindId,
  type Turn,
} from "@/lib/search/places";
import { clearWords, readWords, rememberWords } from "@/lib/search/recent";
import type { SearchItem } from "@/lib/search/types";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { useIsPhoneWidth, useKeyboardUp, useVisibleFrame } from "@/lib/ui/viewport";

import { SearchField } from "./SearchField";
import {
  Doors,
  EmptyLine,
  Eyebrow,
  Face,
  FaceStrip,
  Handoff,
  KindStrip,
  OfflineLine,
  ResultRow,
  TopBand,
  WordRow,
} from "./SearchRows";

/* ── The lists, fetched once per app open and shared by every opening ─────
   Module scope rather than state: they are fixed for the life of the build.
   Relative addresses on purpose, NOT apiFetch: the apps serve the export from
   https://localhost, where both files are bundled, so they load with no
   network, as lib/content/bootstrap.ts loads the content package. A list that
   fails to load is an empty list: the screen still opens and still says it
   found nothing. */

function loader<T>(url: string): () => Promise<T[]> {
  let cache: T[] | null = null;
  let inFlight: Promise<T[]> | null = null;
  return () => {
    if (cache) return Promise.resolve(cache);
    if (inFlight) return inFlight;
    inFlight = fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((items: unknown) => {
        cache = Array.isArray(items) ? (items as T[]) : [];
        return cache;
      })
      .catch(() => {
        cache = [];
        return cache;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };
}

const loadCorpus = loader<SearchItem>("/search-corpus.json");
const loadTheology = loader<TheologyEntry>("/theology-search.json");

/**
 * The reference parser (lib/search/references.ts), fetched with the lists on
 * first open: it carries the Bible's book list, and a screen mounted on every
 * page must not put that on each of them.
 */
type References = typeof import("@/lib/search/references");
let referencesModule: References | null = null;
function loadReferences(): Promise<References | null> {
  if (referencesModule) return Promise.resolve(referencesModule);
  return import("@/lib/search/references")
    .then((m) => (referencesModule = m))
    // Without it the search still finds everything its lists hold.
    .catch(() => null);
}

/**
 * The dictionary's definitions, fetched only when its words are looked
 * through (opened from the dictionary, or its tab chosen): its own field
 * found a word by its definition too, and still does.
 */
type Definition = { id: string; definition: string };
let definitionsCache: Definition[] | null = null;
function loadDefinitions(): Promise<Definition[] | null> {
  if (definitionsCache) return Promise.resolve(definitionsCache);
  return import("@/lib/dictionary/terms")
    .then((m) => (definitionsCache = m.DICTIONARY.map((d) => ({ id: d.id, definition: d.definition }))))
    .catch(() => null);
}

/* ── The connection, read live ─────────────────────────────────────────── */

function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
const readOnline = () => navigator.onLine !== false;
const serverOnline = () => true;

/** Kinds a door holds a saint as, so its rows draw the larger face. */
const FACE_KINDS: ReadonlySet<KindId> = new Set(["saints", "fathers"]);

export function CommandPalette() {
  const router = useRouter();
  const { t, tn } = useTranslate();
  const [open, setOpen] = useState(false);
  const [turn, setTurn] = useState<Turn>(EVERYTHING);
  const [query, setQuery] = useState("");
  // After the Search key, a door or a kind chosen: the results in full.
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [corpus, setCorpus] = useState<SearchItem[] | null>(null);
  const [theology, setTheology] = useState<TheologyEntry[]>([]);
  const [refs, setRefs] = useState<References | null>(referencesModule);
  const [definitions, setDefinitions] = useState<Definition[] | null>(definitionsCache);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const phone = useIsPhoneWidth();
  // On a phone the screen is the part the keyboard has left.
  const frame = useVisibleFrame();
  const online = useSyncExternalStore(subscribeOnline, readOnline, serverOnline);
  // Where the browser can tell: the keyboard up over the screen's foot.
  const keyboard = useKeyboardUp();

  const show = useCallback((place?: string) => {
    setTurn(turnFor(place ?? placeForPath(window.location.pathname)));
    setQuery("");
    setSubmitted(false);
    setExpanded(new Set());
    setActive(0);
    setRecent(readWords());
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // Opened from anywhere (lib/search/open.ts). Drawn at once, inside the tap
  // that asked, so the field can take the focus in it: a phone raises its
  // keyboard only for focus given inside the reader's own tap.
  useEffect(() => {
    function onOpen(e: Event) {
      flushSync(() => show(placeOf(e)));
      inputRef.current?.focus();
    }
    window.addEventListener(SEARCH_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SEARCH_OPEN_EVENT, onOpen);
  }, [show]);

  // Cmd+K or Ctrl+K, on any screen.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          flushSync(() => show());
          inputRef.current?.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, show]);

  // The lists, the first time it opens: it is on every screen and most
  // readers never open it, so nothing is fetched until they do.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void loadCorpus().then((c) => alive && setCorpus(c));
    void loadTheology().then((list) => alive && setTheology(list));
    if (!refs) void loadReferences().then((m) => alive && m && setRefs(m));
    return () => {
      alive = false;
    };
  }, [open, refs]);

  const wantsDefinitions = turn.door === "theology" && turn.kind === "dictionary";
  useEffect(() => {
    if (!open || !wantsDefinitions || definitions) return;
    let alive = true;
    void loadDefinitions().then((d) => alive && d && setDefinitions(d));
    return () => {
      alive = false;
    };
  }, [open, wantsDefinitions, definitions]);

  // The page holds still under it, the tab bar and the floating pills step
  // aside (lib/ui/overlay.ts), and the field has the keyboard.
  useEffect(() => {
    if (!open) return;
    setOverlayOpen(true);
    lockBodyScroll();
    return () => {
      setOverlayOpen(false);
      unlockBodyScroll();
    };
  }, [open]);
  useLayoutEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Android's back button leaves the search, not the page under it.
  useAndroidBack(open, close);

  /* ── What it looks through ──────────────────────────────────────────── */

  // The list is one file in English for every language; the rows the catalog
  // can name are shown, and found, as the reader's own language says them.
  const shown = useMemo(() => inReadersLanguage(corpus ?? [], t, tn), [corpus, t, tn]);
  const rows = useMemo(() => {
    const merged = mergeIndex(shown, theology);
    return definitions ? withDefinitions(merged, definitions) : merged;
  }, [shown, theology, definitions]);
  const prepared = useMemo(() => prepare(rows), [rows]);
  const vocabAll = useMemo(() => vocabulary(rows), [rows]);
  const vocabHere = useMemo(() => (turn.door === "all" ? vocabAll : vocabulary(behind(rows, turn.door))), [rows, turn.door, vocabAll]);

  const q = query.trim();
  const typing = q.length > 0;
  // A typed Bible reference leads: it is in no list, and has one right answer.
  const lead = useMemo<SearchRow[]>(() => (refs && q ? refs.referenceItems(q, t, tn) : []), [refs, q, t, tn]);
  const boost = useMemo(() => (refs && q ? refs.bookSlugsIn(q, t).map((slug) => `book-${slug}`) : []), [refs, q, t]);
  const found = useMemo(() => (q ? results(prepared, q, { lead, boost }) : []), [prepared, q, lead, boost]);
  const counts = useMemo(() => doorCounts(found), [found]);
  const here = useMemo(() => found.filter((r) => inDoor(r, turn.door)), [found, turn.door]);
  const narrowed = useMemo(
    () => (turn.kind ? here.filter((r) => kindIn(r, turn.door) === turn.kind) : here),
    [here, turn],
  );

  // B's strip: the place's kinds, each with how many it holds (everything
  // there before anything is typed, what the words found after).
  const placeRows = useMemo(() => (typing ? here : behind(rows, turn.door)), [typing, here, rows, turn.door]);
  const kindTotals = useMemo(() => kindCounts(placeRows, turn.door), [placeRows, turn.door]);
  const stripKinds = (DOOR_KINDS[turn.door] ?? []).filter((k) => (kindTotals.get(k) ?? 0) > 0 || k === turn.kind);

  // The doors before anything is typed: every part of the library this build
  // has (the shop only where it is on).
  const hasShop = useMemo(() => rows.some((r) => inDoor(r, "shop")), [rows]);
  const restDoors = useMemo(() => DOORS.map((d) => d.id).filter((id) => id !== "shop" || hasShop), [hasShop]);
  const offDoors = useMemo<ReadonlySet<DoorId>>(() => (online ? new Set() : new Set<DoorId>(["shop"])), [online]);

  // While the reader is still typing on a phone, the keyboard up: what
  // answers before the Search key (C, 2). Once the keyboard steps away, the
  // results (C, 3). Where the browser cannot tell, the results as typed.
  const keyboardUp = phone && keyboard;
  const compose = phone && typing && !submitted && keyboardUp;

  const completions = useMemo(() => (compose ? finishing(vocabHere, query) : []), [compose, vocabHere, query]);

  // Nothing anywhere: the words as the library spells them, when near.
  const fix = useMemo(() => (typing && found.length === 0 ? nearSpelling(vocabAll, q) : null), [typing, found.length, vocabAll, q]);
  const fixFound = useMemo(() => (fix ? results(prepared, fix) : []), [fix, prepared]);
  const fixHere = turn.door === "all" ? fixFound : fixFound.filter((r) => inDoor(r, turn.door));

  const top: SearchRow | undefined = typing ? (turn.door === "all" ? found[0] : narrowed[0]) : undefined;
  const showBand = Boolean(top) && (compose || turn.door === "all");

  /* ── What a tap does ────────────────────────────────────────────────── */

  const go = (row: SearchRow | undefined) => {
    if (!row) return;
    if (q) setRecent(rememberWords(q));
    setOpen(false);
    router.push(row.href);
  };

  const searchFor = (words: string) => {
    setQuery(words);
    setActive(0);
    setExpanded(new Set());
    setSubmitted(true);
    setRecent(rememberWords(words));
    inputRef.current?.blur();
  };

  const fill = (words: string) => {
    setQuery(words);
    setSubmitted(false);
    inputRef.current?.focus();
  };

  const pickDoor = (door: DoorId) => {
    setTurn({ door, kind: null });
    setExpanded(new Set());
    setActive(0);
    if (typing) setSubmitted(true);
  };

  const browseDoor = (door: DoorId) => {
    setQuery("");
    setSubmitted(false);
    pickDoor(door);
  };

  const pickKind = (kind: KindId | null) => {
    setTurn((cur) => ({ ...cur, kind }));
    setActive(0);
    if (typing) setSubmitted(true);
  };

  /* ── The rows a keyboard moves through, in the order they are drawn ──── */

  const sections = useMemo<Section[]>(() => {
    if (!typing) return [];
    if (turn.door === "all") return groupSections(found.filter((r) => r !== top));
    if (turn.kind) return narrowed.length ? [{ key: turn.kind, kind: turn.kind, rows: narrowed }] : [];
    return kindSections(here, turn.door);
  }, [typing, turn, found, top, narrowed, here]);

  const limitOf = (key: string, group?: string) => (turn.door !== "all" || expanded.has(key) ? Infinity : group === "Saints" ? 4 : 3);
  const flat = useMemo(() => {
    const out: SearchRow[] = [];
    if (top && showBand) out.push(top);
    for (const s of sections) {
      if (turn.door === "all" && s.group === "Saints" && !expanded.has(s.key)) continue;
      out.push(...s.rows.slice(0, limitOf(s.key, s.group)));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top, showBand, sections, expanded, turn.door]);

  // Keep the chosen row in view as the arrows move it.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (!phone && e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(0, flat.length - 1)));
    } else if (!phone && e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (!phone && e.key === "Enter" && flat[active]) {
      // A computer opens the chosen row; a phone's Search key shows the results.
      e.preventDefault();
      go(flat[active]);
    }
  }

  if (!open) return null;

  /* ── Drawing ────────────────────────────────────────────────────────── */

  const idxOf = (row: SearchRow) => flat.indexOf(row);
  const rowFor = (row: SearchRow, door: DoorId, faceSize = 30) => {
    const idx = idxOf(row);
    const shop = inDoor(row, "shop");
    return (
      <ResultRow
        key={row.id}
        row={row}
        query={q}
        door={door}
        onOpen={go}
        idx={idx >= 0 ? idx : undefined}
        active={!phone && idx >= 0 && idx === active}
        face={faceSize}
        dim={shop && !online}
        sub={shop && !online ? t("ambience.needsConnection") : undefined}
      />
    );
  };

  const doorsTyped = (
    <Doors small doors={doorsFound(counts, turn.door)} current={turn.door} counts={counts} off={offDoors} onPick={pickDoor} />
  );

  const strip = stripKinds.length ? (
    <KindStrip kinds={stripKinds} counts={kindTotals} total={placeRows.length} current={turn.kind} onPick={pickKind} />
  ) : null;

  const topBlock =
    top && showBand ? (
      <div className="mt-4">
        <Eyebrow label={t("search.topResult")} className="mx-5 mb-2" />
        <div className="px-4">
          {pictureFor(top) ? (
            <TopBand row={top} query={q} eyebrow={t(GROUP_LABEL[top.group])} onOpen={go} active={!phone && active === 0} />
          ) : (
            rowFor(top, turn.door)
          )}
        </div>
      </div>
    ) : null;

  const nothing = (
    <div className="mt-10">
      <EmptyLine>{t("search.nothingFound", { query: q })}</EmptyLine>
      {fix && fixFound[0] ? (
        <>
          <Eyebrow label={t("search.didYouMean")} className="mx-5 mb-2.5 mt-[30px]" />
          <div className="mx-4 rounded-[18px] border border-paper/[0.085] bg-paper/[0.035] px-3.5 pb-1.5 pt-3.5">
            <button type="button" onClick={() => go(fixFound[0])} className="search-row -mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-3.5 rounded-[14px] px-1.5 py-1 text-start">
              {fixFound[0].group === "Saints" ? <Face src={fixFound[0].picture} name={fixFound[0].label} size={64} /> : null}
              <span className="min-w-0">
                <span className="block font-serif text-[18px] font-bold leading-[1.2] text-paper">{fixFound[0].label}</span>
                {fixFound[0].sublabel ? <span className="mt-1 block truncate font-sans text-[12.5px] text-paper/55">{fixFound[0].sublabel}</span> : null}
              </span>
            </button>
            <div className="mt-2.5 border-t border-paper/[0.06] pt-1">
              <WordRow kind="complete" typed={fix} count={fixHere.length || fixFound.length} onSearch={() => searchFor(fix)} onFill={() => fill(fix)} />
            </div>
          </div>
        </>
      ) : null}
      <Eyebrow label={t("search.lookIn")} className="mx-5 mb-3 mt-[30px]" />
      <Doors doors={restDoors.filter((d) => d !== "all")} current={null} off={offDoors} onPick={browseDoor} />
    </div>
  );

  const backToEverything = (
    <Handoff onClick={() => pickDoor("all")}>
      {t("search.backToEverything", { query: q })}
      <span className="ms-1.5 tabular-nums text-paper/55">{counts.get("all") ?? 0}</span>
    </Handoff>
  );

  let body: React.ReactNode;
  if (!typing) {
    // Before anything is typed (C, 1): the doors, the place's kinds, and the
    // recent words just over the field. A kind chosen lists itself whole.
    const hint = DOOR_HINT[turn.door];
    const whole = turn.kind ? behind(rows, turn.door, turn.kind) : [];
    body = (
      <>
        {phone ? <div className="min-h-4 flex-1" /> : null}
        <h2 className="px-5 font-serif text-[30px] font-bold leading-tight tracking-[-0.01em] text-paper">{t("search.open")}</h2>
        <Eyebrow label={t("search.lookIn")} className="mx-5 mb-3 mt-[18px]" />
        <Doors doors={restDoors} current={turn.door} off={offDoors} onPick={pickDoor} />
        {strip ? <div className="mt-3">{strip}</div> : null}
        {turn.kind ? (
          <div className="px-4 pt-3">
            <Eyebrow label={t(KIND_LABEL[turn.kind])} count={whole.length} className="mx-1.5 mb-1" />
            {whole.map((row) => rowFor(row, turn.door, FACE_KINDS.has(turn.kind as KindId) ? 46 : 30))}
          </div>
        ) : (
          <>
            {hint ? <p className="px-5 pt-4 font-sans text-detail leading-[1.55] text-paper/55">{t(hint)}</p> : null}
            {recent.length ? (
              <div className="px-5 pt-[22px]">
                <Eyebrow
                  label={t("search.recent")}
                  end={
                    <button
                      type="button"
                      onClick={() => {
                        clearWords();
                        setRecent([]);
                      }}
                      className="hit-44 font-sans text-[12.5px] font-semibold text-paper/62 hover:text-paper"
                    >
                      {t("study.clear")}
                    </button>
                  }
                />
                <div className="mt-1">
                  {recent.map((words) => (
                    <WordRow key={words} kind="recent" typed={words} onSearch={() => searchFor(words)} onFill={() => fill(words)} />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </>
    );
  } else if (compose) {
    // Typing (C, 2): the doors count what they found; nearest the thumb the
    // words that finish the one typed, and over them the top result.
    body = (
      <>
        <div className="pt-2">{doorsTyped}</div>
        {strip}
        <div className="flex-1" />
        {found.length === 0 ? nothing : here.length === 0 ? <div className="mt-8 space-y-4 px-4"><EmptyLine>{t("search.nothingFound", { query: q })}</EmptyLine>{backToEverything}</div> : topBlock}
        {completions.length ? (
          <div className="px-5 pt-1.5">
            {completions.map((c) => (
              <WordRow key={c.full} kind="complete" typed={c.typed} rest={c.rest} onSearch={() => searchFor(c.full)} onFill={() => fill(c.full)} />
            ))}
          </div>
        ) : null}
      </>
    );
  } else {
    // The results (C, 3 and 4).
    body = (
      <>
        <div className="pt-2">{doorsTyped}</div>
        {strip}
        {found.length === 0 ? (
          nothing
        ) : here.length === 0 ? (
          <div className="mt-8 space-y-4 px-4">
            <EmptyLine>{t("search.nothingFound", { query: q })}</EmptyLine>
            {backToEverything}
          </div>
        ) : narrowed.length === 0 ? (
          <div className="mt-8 px-4">
            <EmptyLine>{t("search.nothingFound", { query: q })}</EmptyLine>
          </div>
        ) : (
          <>
            {turn.door === "all" ? topBlock : null}
            <div className="px-4 pb-2">
              {sections.map((s) => {
                const whole = turn.door !== "all" || expanded.has(s.key);
                const limit = limitOf(s.key, s.group);
                const more = !whole && s.rows.length > limit;
                const label = s.kind ? t(KIND_LABEL[s.kind]) : s.group ? t(GROUP_LABEL[s.group]) : t(doorOf(turn.door).labelKey);
                const faces = turn.door === "all" && s.group === "Saints" && !whole;
                return (
                  <section key={s.key} className="mt-3.5">
                    <Eyebrow
                      label={label}
                      count={s.rows.length}
                      className="mx-1.5 mb-1"
                      end={
                        more ? (
                          <button
                            type="button"
                            onClick={() => setExpanded((cur) => new Set(cur).add(s.key))}
                            className="hit-44 font-sans text-[12.5px] font-semibold text-paper/62 hover:text-paper"
                          >
                            {t("common.all")} <span className="tabular-nums">{s.rows.length}</span>
                          </button>
                        ) : undefined
                      }
                    />
                    {faces ? (
                      <FaceStrip rows={s.rows.slice(0, limit)} onOpen={go} />
                    ) : (
                      s.rows
                        .slice(0, limit)
                        .map((row) => rowFor(row, turn.door, turn.door === "saints" || (s.kind && FACE_KINDS.has(s.kind)) ? 46 : 30))
                    )}
                  </section>
                );
              })}
              {turn.door !== "all" ? <div className="mt-4">{backToEverything}</div> : null}
            </div>
          </>
        )}
      </>
    );
  }

  const field = (
    <SearchField
      inputRef={inputRef}
      value={query}
      onChange={(value) => {
        setQuery(value);
        setActive(0);
        setSubmitted(false);
        setExpanded(new Set());
      }}
      onSubmit={() => {
        if (q) searchFor(query);
      }}
      onKeyDown={onKeyDown}
      placeholder={t("search.ariaLabel")}
      className="flex-1"
    />
  );

  return (
    <div
      data-search-screen=""
      className="fixed inset-0 z-[120] max-md:bg-night md:flex md:items-start md:justify-center md:px-4 md:pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label={t("search.ariaLabel")}
    >
      {/* A computer's backdrop: a tap outside the card closes it. Flat, no
          blur: the Android WebView bleeds pictures through one and drops frames. */}
      <button type="button" aria-hidden tabIndex={-1} onClick={close} className="absolute inset-0 bg-night/90 max-md:hidden" />
      <div
        className={cn(
          "search-ground flex flex-col",
          phone
            ? "absolute inset-x-0 top-0 h-full"
            : "relative max-h-[78vh] w-full max-w-[640px] overflow-hidden rounded-card border border-paper/12 shadow-2xl",
        )}
        style={phone && frame ? { top: frame.top, height: frame.height } : undefined}
      >
        {phone ? null : (
          <div className="flex shrink-0 items-center gap-3 border-b border-paper/10 px-3 py-3">
            {field}
            <kbd className="shrink-0 rounded-md border border-paper/15 px-1.5 py-0.5 font-sans text-caption text-paper/35">{t("search.escKey")}</kbd>
          </div>
        )}
        <div
          ref={listRef}
          data-search-body=""
          className="search-in flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-3"
          // Below the status bar and the notch: on a phone this screen starts
          // at the very top, in the apps and on the web alike.
          style={phone ? { paddingTop: "calc(var(--inset-top, env(safe-area-inset-top, 0px)) + 0.75rem)" } : { paddingTop: "0.5rem" }}
        >
          {body}
          {!online ? (
            <div className={cn("px-4 pt-3", phone && typing && !compose && "mt-auto")}>
              <OfflineLine />
            </div>
          ) : null}
        </div>
        {phone ? (
          // The field at the foot, over the keyboard. With the keyboard down
          // it stands clear of the screen's own edge (.safe-pb-edge).
          <div data-search-dock="" className={cn("search-dock shrink-0", !keyboardUp && "safe-pb-edge max-md:pb-[env(safe-area-inset-bottom,0px)]")}>
            <div className="flex items-center gap-1.5 px-2.5 py-2">
              <button
                type="button"
                onClick={close}
                aria-label={t("common.close")}
                className="search-plate grid size-[38px] shrink-0 place-items-center rounded-full text-paper"
              >
                <ChevronDown size={20} strokeWidth={1.9} />
              </button>
              {field}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
