"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  OTHER,
  TYPED_MAX,
  churchKey,
  churchOrder,
  countryNamer,
  countryOrder,
  deviceRegion,
  findCountries,
  parishGiven,
  usJurisdiction,
  usJurisdictionGroups,
  type ParishAnswer,
} from "@/lib/onboarding/clergy";
import { US_PARISH_LIST_ON } from "@/lib/parishes/listSwitch";
import { placeLine, searchParishes } from "@/lib/parishes/search";
import type { UsParish, UsParishList } from "@/lib/parishes/usParishes";

import { PrimaryButton } from "./PrimaryButton";

/**
 * A priest's or deacon's screens in the welcome questions (1.8.x, the
 * owner's note 54 of 2026-10-31), after "Are you a priest, a deacon, or a
 * layman?":
 *
 *   ClergyWhere         where they serve: every country, in the reader's
 *                       language, the United States first
 *   ClergyJurisdiction  in the United States the Assembly of Canonical
 *                       Orthodox Bishops' jurisdictions under their Mother
 *                       Churches; elsewhere the local Churches, the country's
 *                       own first; and "Another jurisdiction", named
 *   ClergyParish        in the United States only: a short form that asks
 *                       them to write their parish, its name and its city
 *                       and state. Until a list of parishes is permitted
 *                       (lib/parishes/listSwitch.ts, off) that is all it is;
 *                       with a permitted list switched on it becomes a search
 *                       of that list by name, city or state, the form kept
 *                       for a parish the list lacks
 *
 * No design sheet was drawn for these. They are the level question's own
 * parts, its heading and its lit card with the tick that draws itself, made
 * into rows for lists too long for cards; the search field is the account
 * step's field. None of them draws a seal or any mark: answering asks, and
 * the team verifies before anything shows (lib/onboarding/clergyRequest.ts).
 * Lit is the white of every chosen answer here (app/globals.css, .ob-choice),
 * and every motion is the onboarding's own, with its reduced-motion escapes.
 */

/** Rows past this many come in without their rise: a list of every country is long. */
const RISING_ROWS = 8;

function deviceLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

function Heading({ id, title, body }: { id: string; title: string; body?: string }) {
  const { t } = useTranslate();
  return (
    <>
      <p className="onboard-step-in mb-3 font-sans text-caption text-premium-ink/85" style={{ animationDelay: "70ms" }}>
        {t("onboard.level.eyebrow")}
      </p>
      <h2 id={id} className="onboard-step-in text-title font-bold leading-tight text-paper" style={{ animationDelay: "130ms" }}>
        {title}
      </h2>
      {body ? (
        <p className="onboard-step-in mt-3 font-sans text-ui leading-[1.6] text-paper/70" style={{ animationDelay: "190ms" }}>
          {body}
        </p>
      ) : null}
    </>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors ${
        on ? "bg-premium text-night ring-premium" : "ring-paper/25"
      }`}
    >
      {on ? (
        <svg viewBox="0 0 16 16" width="12" height="12" className="ob-tick">
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
        </svg>
      ) : null}
    </span>
  );
}

/** One answer in a list: the level question's card, as a row. Chosen, it is lit white and its tick draws itself. */
function Row({
  selected,
  onClick,
  title,
  sub,
  index,
  lang,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  sub?: ReactNode;
  /** Its place in the list, for the staggered entrance. */
  index: number;
  /** A proper name in English (a US jurisdiction, a parish), so a screen reader says it as English. */
  lang?: string;
}) {
  const rises = index < RISING_ROWS;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`ob-choice ${rises ? "ob-rise" : ""} flex min-h-11 w-full items-center gap-3.5 rounded-2xl border px-3.5 py-3 text-start ${
        selected ? "border-premium/60 bg-premium/[0.10]" : "border-paper/15 bg-paper/[0.03] hover:border-paper/30 hover:bg-paper/[0.05]"
      }`}
      style={rises ? { animationDelay: `${300 + index * 40}ms` } : undefined}
    >
      <span className="min-w-0 flex-1">
        <span lang={lang} className="block font-sans text-ui font-semibold text-paper">
          {title}
        </span>
        {sub ? <span className="mt-0.5 block font-sans text-caption leading-[1.45] text-paper/60">{sub}</span> : null}
      </span>
      <Tick on={selected} />
    </button>
  );
}

const FIELD =
  "w-full rounded-pill border border-paper/20 bg-paper/[0.04] px-4 py-3 font-sans text-ui text-paper transition-colors placeholder:text-paper/55 focus:border-paper/55 focus:outline-none";

function SearchField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={label}
      aria-label={label}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="search"
      className={FIELD}
    />
  );
}

/** The way on, held at the foot of a phone over a fade of the page's ground, as "What are you looking for?" holds it. */
function Foot({ children }: { children: ReactNode }) {
  return (
    <div className="ob-foot pointer-events-none sticky z-10 -mx-6 mt-auto bg-gradient-to-b from-transparent to-night to-45% px-6 pt-10 md:static md:mx-0 md:mt-8 md:bg-none md:p-0">
      <div className="pointer-events-auto">{children}</div>
    </div>
  );
}

/** "Where do you serve?": a tap chooses and moves on, as the level question does. */
export function ClergyWhere({ country, onChoose }: { country: string | null; onChoose: (code: string) => void }) {
  const { t, locale } = useTranslate();
  const id = useId();
  const [query, setQuery] = useState("");
  const nameOf = useMemo(() => countryNamer(locale), [locale]);
  // The United States, the device's own country, and the one already chosen
  // when the reader comes back to this screen; then every country by name.
  const order = useMemo(() => {
    const base = countryOrder(locale, deviceRegion(deviceLanguages()));
    if (!country || base.suggested.includes(country)) return base;
    return { suggested: [...base.suggested, country], rest: base.rest.filter((c) => c !== country) };
  }, [locale, country]);
  const found = query.trim() ? findCountries([...order.suggested, ...order.rest], query, locale) : null;

  return (
    <div data-ob-clergy="where" className="flex flex-col">
      <Heading id={`${id}q`} title={t("onboard.clergy.whereTitle")} />
      <div className="onboard-step-in mt-6" style={{ animationDelay: "220ms" }}>
        <SearchField value={query} onChange={setQuery} label={t("onboard.clergy.countrySearch")} />
      </div>
      <div role="group" aria-labelledby={`${id}q`} className="mt-4 flex flex-col gap-2">
        {found ? (
          found.length ? (
            found.map((c, i) => <Row key={c} selected={country === c} onClick={() => onChoose(c)} title={nameOf(c)} index={i} />)
          ) : (
            <p className="py-3 text-center font-sans text-detail text-paper/55">{t("bible.noMatches")}</p>
          )
        ) : (
          <>
            {order.suggested.map((c, i) => (
              <Row key={c} selected={country === c} onClick={() => onChoose(c)} title={nameOf(c)} index={i} />
            ))}
            <hr aria-hidden className="my-2 border-paper/10" />
            {order.rest.map((c, i) => (
              <Row key={c} selected={country === c} onClick={() => onChoose(c)} title={nameOf(c)} index={order.suggested.length + i} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

type RowSpec = { id: string; title: string; sub?: string; lang?: string };
type RowGroup = { heading: string | null; key: string; rows: (RowSpec & { index: number })[] };

/** Each row's place across every group, for the staggered entrance. */
function numbered(groups: { heading: string | null; key: string; rows: RowSpec[] }[]): RowGroup[] {
  let n = 0;
  return groups.map((g) => ({ ...g, rows: g.rows.map((r) => ({ ...r, index: n++ })) }));
}

/**
 * "Which jurisdiction do you serve in?". A listed one chooses and moves on;
 * "Another jurisdiction" opens a field for its name and waits for Continue.
 */
export function ClergyJurisdiction({
  country,
  jurisdiction,
  otherName,
  onChoose,
  onOtherName,
  onContinue,
}: {
  country: string;
  jurisdiction: string | null;
  otherName: string;
  onChoose: (jurisdiction: string) => void;
  onOtherName: (name: string) => void;
  onContinue: () => void;
}) {
  const { t, locale } = useTranslate();
  const id = useId();
  const us = country === "US";
  const other = jurisdiction === OTHER;
  const field = useRef<HTMLInputElement>(null);
  const churches = useMemo(() => churchOrder(country, (c) => t(churchKey(c)), locale), [country, t, locale]);
  // The rows in the order drawn, under their headings in the United States,
  // each with its place for the entrance. The country's own Church says so
  // without naming the country, which most languages would have to inflect.
  const groups = useMemo<RowGroup[]>(() => {
    if (us) {
      return numbered(
        usJurisdictionGroups().map((g) => ({
          heading: t(churchKey(g.mother)),
          key: g.mother,
          rows: g.jurisdictions.map((j) => ({ id: j.id, title: j.name, lang: "en" })),
        })),
      );
    }
    const local = churches.local ? [{ id: churches.local, title: t(churchKey(churches.local)), sub: t("onboard.clergy.localChurch") }] : [];
    return numbered([{ heading: null, key: "churches", rows: [...local, ...churches.rest.map((c) => ({ id: c, title: t(churchKey(c)) }))] }]);
  }, [us, churches, t]);
  const otherIndex = groups.reduce((sum, g) => sum + g.rows.length, 0);

  // The field takes the keyboard as soon as it opens.
  useEffect(() => {
    if (other) field.current?.focus();
  }, [other]);

  return (
    <div data-ob-clergy="jurisdiction" className="flex flex-1 flex-col md:flex-none">
      <Heading id={`${id}q`} title={t("onboard.clergy.jurisdictionTitle")} body={us ? t("onboard.clergy.usBody") : undefined} />
      <div role="group" aria-labelledby={`${id}q`} className="mt-6 flex flex-col gap-5">
        {groups.map((g) => (
          <div key={g.key} className="flex flex-col gap-2">
            {g.heading ? <p className="font-sans text-caption font-semibold text-paper/55">{g.heading}</p> : null}
            {g.rows.map((r) => (
              <Row key={r.id} selected={jurisdiction === r.id} onClick={() => onChoose(r.id)} title={r.title} sub={r.sub} lang={r.lang} index={r.index} />
            ))}
          </div>
        ))}
        <Row selected={other} onClick={() => onChoose(OTHER)} title={t("onboard.clergy.other")} index={otherIndex} />
      </div>
      {other ? (
        <>
          <input
            ref={field}
            value={otherName}
            onChange={(e) => onOtherName(e.target.value)}
            maxLength={TYPED_MAX}
            placeholder={t("onboard.clergy.otherName")}
            aria-label={t("onboard.clergy.otherName")}
            className={`${FIELD} mt-3`}
          />
          <Foot>
            <PrimaryButton onClick={onContinue} disabled={otherName.trim().length < 2}>
              {t("onboard.continue")}
            </PrimaryButton>
          </Foot>
        </>
      ) : null}
    </div>
  );
}

/** "Chicago, IL" and the jurisdiction it belongs to. */
function parishSub(p: UsParish): ReactNode {
  const j = usJurisdiction(p.jurisdiction);
  return (
    <>
      <span lang="en" className="block">
        {placeLine(p)}
      </span>
      {j ? (
        <span lang="en" className="block text-paper/45">
          {j.name}
        </span>
      ) : null}
    </>
  );
}

type ParishProps = {
  /** The reader's jurisdiction: with a list on, its parishes lead among equals. */
  jurisdiction: string | null;
  parish: ParishAnswer | null;
  onPick: (parish: ParishAnswer | null) => void;
  onContinue: () => void;
};

type WrittenParish = Extract<ParishAnswer, { kind: "typed" }>;

/** The two fields a parish is written in: its name, and its city and state. */
function ParishFields({ typed, onPick, nameRef }: { typed: WrittenParish; onPick: (parish: ParishAnswer) => void; nameRef?: Ref<HTMLInputElement> }) {
  const { t } = useTranslate();
  return (
    <>
      <input
        ref={nameRef}
        value={typed.name}
        onChange={(e) => onPick({ ...typed, name: e.target.value })}
        maxLength={TYPED_MAX}
        placeholder={t("clergy.parish")}
        aria-label={t("clergy.parish")}
        autoComplete="off"
        className={FIELD}
      />
      <input
        value={typed.place}
        onChange={(e) => onPick({ ...typed, place: e.target.value })}
        maxLength={TYPED_MAX}
        placeholder={t("onboard.clergy.parishPlace")}
        aria-label={t("onboard.clergy.parishPlace")}
        autoComplete="off"
        className={FIELD}
      />
    </>
  );
}

/**
 * "Which parish do you serve?", in the United States. Until a list of the
 * parishes there is permitted, the screen asks the reader to write theirs,
 * and the list (still the SAMPLE) is never loaded or shown. One switch,
 * lib/parishes/listSwitch.ts, turns a permitted list's search on.
 */
export function ClergyParish({ list, ...props }: ParishProps & { list?: UsParishList }) {
  return US_PARISH_LIST_ON ? <ParishSearch {...props} list={list} /> : <ParishWritten {...props} />;
}

/**
 * Their parish, written: its name, and its city and state, and Continue once
 * there is a name. What they write is what the team reads in the request.
 */
function ParishWritten({ parish, onPick, onContinue }: ParishProps) {
  const { t } = useTranslate();
  const id = useId();
  // A parish picked from a list (a build with one on) is offered back as written.
  const typed: WrittenParish =
    parish?.kind === "typed" ? parish : parish ? { kind: "typed", name: parish.name, place: placeLine(parish) } : { kind: "typed", name: "", place: "" };

  return (
    <div data-ob-clergy="parish" className="flex flex-1 flex-col md:flex-none">
      <Heading id={`${id}q`} title={t("onboard.clergy.parishTitle")} body={t("onboard.clergy.parishWrite")} />
      <div role="group" aria-labelledby={`${id}q`} className="onboard-step-in mt-6 flex flex-col gap-2.5" style={{ animationDelay: "260ms" }}>
        <ParishFields typed={typed} onPick={onPick} />
      </div>
      <Foot>
        <PrimaryButton onClick={onContinue} disabled={!parishGiven(parish)}>
          {t("onboard.continue")}
        </PrimaryButton>
      </Foot>
    </div>
  );
}

/**
 * With a permitted list switched on: search it, pick, and Continue; "My
 * parish is not listed" opens the written form for a parish the list lacks.
 */
function ParishSearch({ jurisdiction, parish, onPick, onContinue, list: given }: ParishProps & { list?: UsParishList }) {
  const { t } = useTranslate();
  const id = useId();
  const [loaded, setLoaded] = useState<UsParishList | null>(null);
  const list = given ?? loaded;
  const [query, setQuery] = useState("");
  const typing = parish?.kind === "typed";
  const nameField = useRef<HTMLInputElement>(null);

  // Its own chunk, fetched when this screen opens, so the list rides in no
  // other page. It is part of the app either way, so it loads offline.
  useEffect(() => {
    if (given) return;
    let alive = true;
    void import("@/lib/parishes/usParishes").then(
      (m) => {
        if (alive) setLoaded(m.US_PARISH_LIST);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [given]);

  useEffect(() => {
    if (typing) nameField.current?.focus();
  }, [typing]);

  const hits = useMemo(() => (list ? searchParishes(list.parishes, query, { prefer: jurisdiction }) : []), [list, query, jurisdiction]);
  // The parish chosen stays in sight while the reader searches on.
  const chosen = parish?.kind === "listed" ? (list?.parishes.find((p) => p.id === parish.id) ?? null) : null;
  const rows = chosen && !hits.some((p) => p.id === chosen.id) ? [chosen, ...hits] : hits;

  function pick(p: UsParish) {
    onPick({ kind: "listed", id: p.id, name: p.name, city: p.city, state: p.state, sample: list?.sample ?? true });
  }

  return (
    <div data-ob-clergy="parish" className="flex flex-1 flex-col md:flex-none">
      <Heading id={`${id}q`} title={t("onboard.clergy.parishTitle")} body={t("onboard.clergy.parishBody")} />

      {list?.sample ? (
        <div
          data-ob-sample
          className="onboard-step-in mt-4 flex items-start gap-2.5 rounded-xl border border-paper/15 bg-paper/[0.03] px-3.5 py-2.5"
          style={{ animationDelay: "220ms" }}
        >
          <span className="mt-px shrink-0 rounded-[4px] border border-paper/45 px-1.5 py-0.5 font-sans text-[10.5px] font-bold tracking-[0.08em] text-paper">
            {t("onboard.clergy.sample")}
          </span>
          <p className="font-sans text-caption leading-[1.5] text-paper/70">{t("onboard.clergy.sampleNote")}</p>
        </div>
      ) : null}

      <div className="onboard-step-in mt-4" style={{ animationDelay: "260ms" }}>
        <SearchField value={query} onChange={setQuery} label={t("onboard.clergy.parishSearch")} />
      </div>

      <div role="group" aria-labelledby={`${id}q`} className="mt-4 flex flex-col gap-2">
        {!list ? (
          <p className="py-3 text-center font-sans text-detail text-paper/55">{t("common.loading")}</p>
        ) : rows.length ? (
          rows.map((p, i) => (
            <Row
              key={p.id}
              selected={parish?.kind === "listed" && parish.id === p.id}
              onClick={() => pick(p)}
              title={p.name}
              sub={parishSub(p)}
              lang="en"
              index={i}
            />
          ))
        ) : query.trim() ? (
          <p className="py-3 text-center font-sans text-detail text-paper/55">{t("bible.noMatches")}</p>
        ) : null}
      </div>

      <button
        type="button"
        aria-pressed={typing}
        onClick={() => onPick(typing ? null : { kind: "typed", name: "", place: "" })}
        className={`mt-3 inline-flex min-h-11 items-center self-start rounded-pill px-1 font-sans text-detail underline decoration-paper/30 underline-offset-[3px] transition-colors hover:text-paper ${
          typing ? "text-paper" : "text-paper/70"
        }`}
      >
        {t("onboard.clergy.notListed")}
      </button>
      {parish?.kind === "typed" ? (
        <div className="mt-1 flex flex-col gap-2.5">
          <ParishFields typed={parish} onPick={onPick} nameRef={nameField} />
        </div>
      ) : null}

      <Foot>
        <PrimaryButton onClick={onContinue} disabled={!parishGiven(parish)}>
          {t("onboard.continue")}
        </PrimaryButton>
      </Foot>
    </div>
  );
}
