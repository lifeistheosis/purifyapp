"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { WayPlate, WayRow } from "@/components/prayers/mine/WayRow";
import { Track } from "@/components/settings/LitPanel";
import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/icons/Calendar";
import { uuid, type Intention, type IntentionKind } from "@/lib/prayers/storage";
import type { SaintFeast } from "@/lib/saints/feastIndex";

/**
 * A name to pray for, written or changed (build 89 note 11, his words: "I
 * want you to revamp this system. It just doesn't really look good").
 *
 * The name first. The relationship as a few common words to tap, in the
 * carved track Settings chooses with, or written. The nameday chosen from a
 * month and a day, or by the saint whose feast it is, never typed as
 * "MM-DD". The note's limit said only as it nears. Tags are gone from the
 * sheet: nothing read them (a name's own tags are kept as they were). Save is
 * the house's own button.
 *
 * Every field shows it is active the house's quiet way (globals.css, "A field
 * a finger has reached"): its own fill lights, with a fine edge and the caret.
 */

/** A field: its own fill, which lights when it is active. */
export const NAME_FIELD =
  "min-h-12 w-full rounded-[12px] bg-paper/[0.06] px-3.5 py-2.5 font-sans text-ui text-paper placeholder:text-paper/55 transition-colors focus:bg-paper/[0.08]";

/** The words a relationship is most often, in the reader's language. */
const RELATIONSHIPS = ["mother", "father", "spouse", "child", "godparent", "friend"] as const;
type Relationship = (typeof RELATIONSHIPS)[number];

/** A note is kept to this many characters; the count shows from NOTE_NEAR on. */
const NOTE_MAX = 500;
const NOTE_NEAR = 440;

const MONTH_ABBR_KEYS = [
  "common.monthAbbr.jan", "common.monthAbbr.feb", "common.monthAbbr.mar",
  "common.monthAbbr.apr", "common.monthAbbr.may", "common.monthAbbr.jun",
  "common.monthAbbr.jul", "common.monthAbbr.aug", "common.monthAbbr.sep",
  "common.monthAbbr.oct", "common.monthAbbr.nov", "common.monthAbbr.dec",
];

/** The days a month can hold: February keeps the 29th, which a nameday may be. */
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

type T = (key: string, replacements?: Record<string, string | number>) => string;

/** "08-09" in the reader's words, as "Aug 9"; anything else as it is. */
export function formatMmDd(mmdd: string, t: T): string {
  const [m, d] = mmdd.split("-").map((s) => parseInt(s, 10));
  if (Number.isNaN(m) || Number.isNaN(d)) return mmdd;
  const monthKey = MONTH_ABBR_KEYS[m - 1];
  if (!monthKey) return mmdd;
  return t("common.monthDay", { month: t(monthKey), day: d });
}

const two = (n: number) => String(n).padStart(2, "0");

export function NameForm({
  kind,
  initial,
  focusFirst = true,
  onCancel,
  onSave,
}: {
  kind: IntentionKind;
  initial?: Intention;
  /** The name's field takes the focus: for a new name, not one opened to read. */
  focusFirst?: boolean;
  onCancel: () => void;
  onSave: (entry: Intention) => void;
}) {
  const { t } = useTranslate();
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [relationship, setRelationship] = useState(initial?.relationship ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [nameday, setNameday] = useState(initial?.nameday ?? "");
  const [repose, setRepose] = useState(initial?.repose ?? "");

  const words = RELATIONSHIPS.map((r) => ({ value: r, label: t(`prayers.diptychs.rel.${r}`) }));
  const chosen = (words.find((w) => w.label === relationship.trim())?.value ?? null) as Relationship | null;

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? uuid(),
      name: name.trim(),
      relationship: relationship.trim() || undefined,
      note: note.trim() || undefined,
      // No longer asked for: a name's own tags are kept as they were.
      tags: initial?.tags ?? [],
      addedAt: initial?.addedAt ?? new Date().toISOString(),
      ...(kind === "living"
        ? { nameday: /^\d{2}-\d{2}$/.test(nameday) ? nameday : undefined }
        : { repose: /^\d{4}-\d{2}-\d{2}$/.test(repose) ? repose : undefined }),
    });
  }

  return (
    <div data-name-form="" className="mt-3 pb-1">
      <label htmlFor={`${id}-name`} className="block font-sans text-caption font-semibold text-paper/70">
        {t("prayers.diptychs.name")}
      </label>
      <input dir="auto"
        id={`${id}-name`}
        /* eslint-disable-next-line jsx-a11y/no-autofocus -- the sheet is
           opened by an explicit user action (Add), so moving focus into
           its first field is expected, not a steal. */
        autoFocus={focusFirst}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="off"
        className={`${NAME_FIELD} mt-1.5`}
      />

      <p id={`${id}-rel`} className="mt-5 font-sans text-caption font-semibold text-paper/70">
        {t("prayers.diptychs.relationshipLabel")}
      </p>
      <Track<Relationship>
        value={chosen}
        options={words}
        onChange={(r) => setRelationship(t(`prayers.diptychs.rel.${r}`))}
        label={t("prayers.diptychs.relationshipLabel")}
        cols={3}
      />
      <input dir="auto"
        aria-labelledby={`${id}-rel`}
        placeholder={t("prayers.diptychs.relationshipOther")}
        value={chosen ? "" : relationship}
        onChange={(e) => setRelationship(e.target.value)}
        className={`${NAME_FIELD} mt-2.5`}
      />

      {kind === "living" ? (
        <NamedayChoice value={nameday} onChange={setNameday} />
      ) : (
        <>
          <label htmlFor={`${id}-repose`} className="mt-5 block font-sans text-caption font-semibold text-paper/70">
            {t("prayers.diptychs.reposedLabel")}
          </label>
          <input id={`${id}-repose`} type="date" value={repose} onChange={(e) => setRepose(e.target.value)} className={`${NAME_FIELD} mt-1.5`} />
        </>
      )}

      <label htmlFor={`${id}-note`} className="mt-5 block font-sans text-caption font-semibold text-paper/70">
        {t("prayers.diptychs.noteLabel")}
      </label>
      <textarea dir="auto"
        id={`${id}-note`}
        maxLength={NOTE_MAX}
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={`${NAME_FIELD} mt-1.5 resize-none`}
      />
      {note.length >= NOTE_NEAR ? (
        <p aria-live="polite" className="mt-1.5 text-end font-sans text-caption tabular-nums text-paper/60">
          {t("prayers.diptychs.noteLeft", { n: NOTE_MAX - note.length })}
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="tap-press inline-flex min-h-11 items-center px-3 font-sans text-detail font-semibold text-paper/70 hover:text-paper">
          {t("common.cancel")}
        </button>
        <Button variant="inverse" type="button" onClick={handleSave} disabled={!name.trim()} className="min-h-11 px-7 py-3">
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

/**
 * The nameday: one row saying the day chosen, opening in place to a month,
 * then its days, or the saint whose feast it is.
 */
function NamedayChoice({ value, onChange }: { value: string; onChange: (mmdd: string) => void }) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<string | null>(/^\d{2}-\d{2}$/.test(value) ? value.slice(0, 2) : null);
  const day = /^\d{2}-\d{2}$/.test(value) && value.slice(0, 2) === month ? value.slice(3) : null;
  const months = MONTH_ABBR_KEYS.map((k, i) => ({ value: two(i + 1), label: t(k) }));
  const days = month ? Array.from({ length: MONTH_DAYS[Number(month) - 1] }, (_, i) => ({ value: two(i + 1), label: String(i + 1) })) : [];

  return (
    <div className="mt-5">
      <div className="set-panel">
        <WayRow
          lead={
            <WayPlate>
              <Calendar size={17} />
            </WayPlate>
          }
          label={t("prayers.diptychs.namedayLabel")}
          desc={/^\d{2}-\d{2}$/.test(value) ? formatMmDd(value, t) : t("prayers.diptychs.namedayNotSet")}
          onClick={() => setOpen((o) => !o)}
          expanded={open}
          data={{ "data-nameday-row": "" }}
        />
      </div>
      {open ? (
        <div data-nameday-choice="" className="mt-1">
          <Track value={month} options={months} onChange={setMonth} label={t("prayers.diptychs.namedayMonth")} cols={4} />
          {month ? (
            <Track value={day} options={days} onChange={(d) => onChange(`${month}-${d}`)} label={t("prayers.diptychs.namedayDay")} cols={7} />
          ) : null}
          <SaintFeastSearch
            onPick={(mmdd) => {
              setMonth(mmdd.slice(0, 2));
              onChange(mmdd);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** The saint whose feast the nameday is, found by name; their day is chosen with them. */
function SaintFeastSearch({ onPick }: { onPick: (mmdd: string) => void }) {
  const { t } = useTranslate();
  const id = useId();
  const [q, setQ] = useState("");
  const [feasts, setFeasts] = useState<SaintFeast[] | null>(null);

  useEffect(() => {
    if (!q.trim() || feasts) return;
    let alive = true;
    fetch("/saint-feasts.json")
      .then((r) => (r.ok ? (r.json() as Promise<SaintFeast[]>) : []))
      .then((list) => alive && setFeasts(list))
      .catch(() => alive && setFeasts([]));
    return () => {
      alive = false;
    };
  }, [q, feasts]);

  const found = useMemo(() => {
    const words = q.trim().toLowerCase();
    if (!words || !feasts) return [];
    return feasts.filter((f) => f.name.toLowerCase().includes(words)).slice(0, 5);
  }, [q, feasts]);

  return (
    <div className="mt-4">
      <label htmlFor={`${id}-saint`} className="block font-sans text-caption font-semibold text-paper/70">
        {t("prayers.diptychs.namedaySaint")}
      </label>
      <input dir="auto" id={`${id}-saint`} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" className={`${NAME_FIELD} mt-1.5`} />
      {found.length ? (
        <ul className="mt-1.5">
          {found.map((f) => (
            <li key={f.slug}>
              <button
                type="button"
                onClick={() => {
                  onPick(f.days[0]);
                  setQ("");
                }}
                className="set-link flex min-h-11 w-full items-center justify-between gap-3 rounded-[10px] px-2 text-start"
              >
                <span lang="en" dir="ltr" className="min-w-0 truncate font-sans text-ui text-paper">{f.name}</span>
                <span className="shrink-0 font-sans text-caption tabular-nums text-paper/60">{formatMmDd(f.days[0], t)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
