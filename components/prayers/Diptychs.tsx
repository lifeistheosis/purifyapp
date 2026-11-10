"use client";

// Diptychs: the two lists every Orthodox Christian eventually keeps: the
// living, prayed for by name; and the reposed, commemorated on the
// anniversary of their falling-asleep. They stand under a reader's own rule
// on /prayers/personal (1.7), and the rule can take them in as one of its
// steps, "Those I pray for".
//
// Local-first: writes go straight to localStorage. The opt-in sync bridge
// (lib/prayers/sync.ts, installPrayerSyncBridge) pushes the lists up to
// Supabase whenever a signed-in user changes them.
//
// 1.8 (note 73): Remove takes a name out at once, with an Undo for a few
// seconds, as the rule's own rows do; it asked in the browser's own confirm
// box, the only one in the prayer pages. And the names the reader brought
// from the prayer wall stand after the two lists, each with the day it
// leaves: they were read in Those I pray for for a week, and this page,
// where the names are kept, never showed them.
//
// 1.8, the owner's pick A of r3-27: the living, the reposed and the prayer
// wall's names as rows of medallions, each a name's first letter in a disc
// with the name under it and one line of what it is (a relationship, a
// nameday, a repose, the day it leaves); "Add" is the last medallion of
// each list. A tap opens the name in a sheet, to change it or remove it
// (NameSheet, WallNameSheet). 1.9 (note 70) at first kept a place in words
// only: a campaign's name joins the reposed until its last day. The rework
// of prayer campaigns, in 1.9 too, draws it: the campaigns a reader carries
// stand after the wall's names, each with the day it leaves
// (components/campaigns/CampaignNames.tsx).

import { useEffect, useRef, useState } from "react";
import { CampaignNames } from "@/components/campaigns/CampaignNames";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { formatMmDd, NameForm } from "@/components/prayers/NameForm";
import { PlaceChips } from "@/components/prayers/PlaceChips";
import { SearchField } from "@/components/search/SearchField";
import { Sheet } from "@/components/ui/Sheet";
import { Plus } from "@/components/ui/icons/Plus";
import type { PrayPlace } from "@/lib/prayers/commemoration";
import {
  deleteIntention,
  reposeDateText,
  restoreIntention,
  upsertIntention,
  useIntentions,
  type Intention,
  type IntentionKind,
} from "@/lib/prayers/storage";
import { updateWallNames, useWallNames } from "@/lib/prayers/useWallNames";
import { markWallPrayed, setWallPlaces, unmarkWallPrayed, waitingWallNames, wallLeavesText, type WallName } from "@/lib/prayers/wallNames";


/** How long "Removed ... Undo" stays, as under the rule's own rows (MyRuleBuilder). */
const UNDO_MS = 5000;

/**
 * The catalog's "Removed {title}." with a name set in once, exactly as
 * written: the catalogs' own interpolation reads a "$&" inside a value as a
 * pattern (lib/prayers/commemoration.ts, wallLine).
 */
function removedLine(template: string, name: string): string {
  return template.replace("{title}", () => name);
}

/** A name's first letter, as its language writes a capital: the medallion's face. */
function initialOf(name: string, locale: string): string {
  const first = Array.from(name.trim())[0] ?? "";
  try {
    return first.toLocaleUpperCase(locale);
  } catch {
    return first.toUpperCase();
  }
}

/** What is open in the sheet: a name of a list (null to add one), or one from the wall. */
type Opened = { kind: IntentionKind; entry: Intention | null } | { kind: "wall"; entry: WallName };
/** What was just removed, for Undo. */
type Removed = { kind: IntentionKind; entry: Intention; index: number } | { kind: "wall"; entry: WallName };

export function Diptychs() {
  const { t } = useTranslate();
  const [opened, setOpened] = useState<Opened | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Each opening is a fresh sheet: what was typed and not saved is not kept.
  const [openings, setOpenings] = useState(0);
  const [undo, setUndo] = useState<Removed | null>(null);
  const undoTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(undoTimer.current), []);

  function open(next: Opened) {
    setOpened(next);
    setOpenings((n) => n + 1);
    setSheetOpen(true);
  }

  function removed(r: Removed) {
    setSheetOpen(false);
    window.clearTimeout(undoTimer.current);
    setUndo(r);
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
  }

  function removeName(kind: IntentionKind, entry: Intention, index: number) {
    deleteIntention(kind, entry.id);
    removed({ kind, entry, index });
  }

  function takeOut(entry: WallName) {
    updateWallNames((list) => markWallPrayed(list, [entry.id]));
    removed({ kind: "wall", entry });
  }

  function putBack() {
    if (!undo) return;
    if (undo.kind === "wall") {
      const id = undo.entry.id;
      updateWallNames((list) => unmarkWallPrayed(list, [id]));
    } else {
      restoreIntention(undo.kind, undo.entry, undo.index);
    }
    window.clearTimeout(undoTimer.current);
    setUndo(null);
  }

  return (
    <div className="space-y-7">
      <NameList kind="living" heading={t("prayers.diptychs.livingHeading")} onOpen={(entry) => open({ kind: "living", entry })} />
      <NameList kind="departed" heading={t("prayers.diptychs.reposedHeading")} onOpen={(entry) => open({ kind: "departed", entry })} />
      <WallList onOpen={(entry) => open({ kind: "wall", entry })} />
      {/* The campaigns the reader carries (1.9), and "Keep this name?" for
          one that has ended. Nothing while there are none, and none in a
          build where campaigns are closed. */}
      <CampaignNames Medallion={Medallion} />

      {undo ? (
        <p role="status" className="flex min-h-11 items-center gap-3 font-sans text-detail text-paper/75">
          <span className="min-w-0 truncate">{removedLine(t("prayers.mine.removed"), undo.entry.name)}</span>
          <button
            type="button"
            onClick={putBack}
            className="tap-press inline-flex min-h-11 shrink-0 items-center px-2 font-semibold text-paper underline underline-offset-4"
          >
            {t("prayers.mine.undo")}
          </button>
        </p>
      ) : null}

      {opened && opened.kind === "wall" ? (
        <WallNameSheet key={`${opened.entry.id}:${openings}`} open={sheetOpen} onClose={() => setSheetOpen(false)} entry={opened.entry} onTakeOut={takeOut} />
      ) : opened ? (
        <NameSheet
          key={`${opened.kind}:${opened.entry?.id ?? "new"}:${openings}`}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          kind={opened.kind}
          entry={opened.entry}
          onRemove={removeName}
        />
      ) : null}
    </div>
  );
}

/** One name as a medallion: its first letter in a disc, the name, and one line of what it is. */
function Medallion({ name, sub, onOpen }: { name: string; sub?: string | null; onOpen: () => void }) {
  const { locale } = useTranslate();
  return (
    <button type="button" data-medallion onClick={onOpen} aria-haspopup="dialog" className="rule-med tap-press">
      <span aria-hidden className="rule-med-disc">
        {initialOf(name, locale)}
      </span>
      <span dir="auto" className="rule-med-name">{name}</span>
      {sub ? <span className="rule-med-sub">{sub}</span> : null}
    </button>
  );
}

/** One of the two lists as a row of medallions, Add the last of them. */
function NameList({ kind, heading, onOpen }: { kind: IntentionKind; heading: string; onOpen: (entry: Intention | null) => void }) {
  const { t, locale } = useTranslate();
  const items = useIntentions(kind);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((i) => [i.name, i.relationship ?? "", i.note ?? ""].some((s) => s.toLowerCase().includes(q))) : items;
  // One line under a name: what the reader calls them, else the day the list keeps.
  const subOf = (entry: Intention): string | null => {
    if (entry.relationship) return entry.relationship;
    if (kind === "living" && entry.nameday) return `${t("prayers.diptychs.namedayLabel")} ${formatMmDd(entry.nameday, t)}`;
    // Written as the reader's language writes a date, not as typed (note 73).
    if (kind === "departed" && entry.repose) return `${t("prayers.diptychs.reposedLabel")} ${reposeDateText(entry.repose, locale)}`;
    return null;
  };

  return (
    <section aria-labelledby={`diptych-${kind}`} data-names={kind}>
      <h3 id={`diptych-${kind}`} className="rule-names-label">
        {heading}
      </h3>
      {items.length > 5 && (
        // The names filter in place, in the app's one field (1.8, r3-12).
        <SearchField value={query} onChange={setQuery} placeholder={t("common.search")} className="mt-3" />
      )}
      <ul className="rule-meds">
        {shown.map((entry) => (
          <li key={entry.id}>
            <Medallion name={entry.name} sub={subOf(entry)} onOpen={() => onOpen(entry)} />
          </li>
        ))}
        {q && shown.length === 0 ? <li className="rule-meds-none">{t("bible.noMatches")}</li> : null}
        <li>
          <button
            type="button"
            data-medallion-add
            onClick={() => onOpen(null)}
            aria-haspopup="dialog"
            aria-label={`${t("prayers.diptychs.add")}: ${heading}`}
            className="rule-med tap-press"
          >
            <span aria-hidden className="rule-med-disc" data-add="">
              <Plus size={18} />
            </span>
            <span className="rule-med-name">{t("prayers.diptychs.add")}</span>
          </button>
        </li>
      </ul>
    </section>
  );
}

/**
 * The names from the prayer wall that wait in the reader's prayers (lib/
 * prayers/wallNames.ts), each with the day it leaves. Nothing is drawn while
 * there are none: they come from the wall, not from here.
 */
function WallList({ onOpen }: { onOpen: (entry: WallName) => void }) {
  const { t, locale } = useTranslate();
  const names = waitingWallNames(useWallNames());
  if (names.length === 0) return null;
  return (
    <section aria-labelledby="diptych-wall" data-names="wall">
      <h3 id="diptych-wall" className="rule-names-label">
        {t("prayers.diptychs.wallHeading")}
      </h3>
      <ul className="rule-meds">
        {names.map((name) => (
          <li key={name.id} data-wall-name>
            <Medallion name={name.name} sub={t("prayers.diptychs.wallUntil", { date: wallLeavesText(name.until, locale) })} onOpen={() => onOpen(name)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A name of the reader's own lists, opened: to change it or remove it, or a new one to add. */
function NameSheet({
  open,
  onClose,
  kind,
  entry,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  kind: IntentionKind;
  entry: Intention | null;
  onRemove: (kind: IntentionKind, entry: Intention, index: number) => void;
}) {
  const { t } = useTranslate();
  const items = useIntentions(kind);
  const heading = kind === "living" ? t("prayers.diptychs.livingHeading") : t("prayers.diptychs.reposedHeading");
  return (
    <Sheet open={open} onClose={onClose} title={entry ? entry.name : heading} desktop keyboard>
      {entry ? null : (
        // What the list keeps, said where a name is added to it.
        <p className="font-sans text-caption leading-[1.6] text-paper/60">
          {kind === "living" ? t("prayers.diptychs.livingIntro") : t("prayers.diptychs.reposedIntro")}
        </p>
      )}
      <NameForm
        kind={kind}
        initial={entry ?? undefined}
        focusFirst={!entry}
        onCancel={onClose}
        onSave={(next) => {
          upsertIntention(kind, next);
          onClose();
        }}
      />
      {entry ? (
        <button
          type="button"
          data-name-remove
          onClick={() => onRemove(kind, entry, items.findIndex((i) => i.id === entry.id))}
          className="tap-press mt-1 inline-flex min-h-11 w-full items-center justify-center rounded-pill font-sans text-detail font-semibold text-paper/70 hover:text-paper"
        >
          {t("prayers.diptychs.remove")}
        </button>
      ) : null}
    </Sheet>
  );
}

/**
 * A name from the prayer wall, opened: the words it asked with, the day it
 * leaves, the prayers it waits in (to change), and Take out of my prayers,
 * as on the wall's own sheet (components/community/AddToPrayersSheet.tsx).
 */
function WallNameSheet({
  open,
  onClose,
  entry,
  onTakeOut,
}: {
  open: boolean;
  onClose: () => void;
  entry: WallName;
  onTakeOut: (entry: WallName) => void;
}) {
  const { t, locale } = useTranslate();
  const [choice, setChoice] = useState<PrayPlace[] | null>(null);
  const chosen = choice ?? entry.places;
  return (
    <Sheet open={open} onClose={onClose} title={entry.name} desktop openFull>
      {entry.intention ? <p dir="auto" className="break-words font-serif text-ui italic leading-[1.5] text-paper/75">{entry.intention}</p> : null}
      <p data-wall-leaves className="mt-1 font-sans text-caption text-paper/55">
        {t("prayers.diptychs.wallUntil", { date: wallLeavesText(entry.until, locale) })}
      </p>
      <p id="wall-name-when" className="mt-5 font-sans text-detail font-semibold text-paper/80">
        {t("community.wallAddWhen")}
      </p>
      <div className="mt-3">
        <PlaceChips value={chosen} onChange={setChoice} labelledBy="wall-name-when" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={chosen.length === 0}
          onClick={() => {
            updateWallNames((list) => setWallPlaces(list, entry.id, chosen));
            onClose();
          }}
          className="tap-press inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night disabled:opacity-40"
        >
          {t("common.save")}
        </button>
        <button
          type="button"
          data-wall-take-out
          onClick={() => onTakeOut(entry)}
          className="tap-press inline-flex min-h-11 items-center rounded-pill px-5 font-sans text-detail font-semibold text-paper/85 ring-1 ring-inset ring-paper/25"
        >
          {t("community.wallTakeOut")}
        </button>
      </div>
    </Sheet>
  );
}
