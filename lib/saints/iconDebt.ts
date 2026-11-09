/**
 * The saint icons still to clear, as a list the admin can work through.
 *
 * Admin item A9 (the arbiter's list of 2026-11-09). lib/saints/iconRights.ts
 * is the one record of each icon's rights: a settled row (verified public
 * domain, or used with permission) or a row of the debt (UNVERIFIED_ICONS,
 * no source, licence or attribution yet; audit F-22). The Updates chat clears
 * the debt (its item U12, the sources) by moving a file from the debt into
 * the settled rows; this list only reads that file, so it shrinks by itself
 * with every icon cleared, and holds no copy of anything.
 *
 * Each row: the file, its picture's address, which saints show it (the
 * saints registry, lib/saints/saints.ts), whether the Fathers' notes use it
 * (AUTHOR_ICONS, lib/saints/icons.ts), its state, and what the record says.
 * The ones waiting on the owner's decision first (ICON_QUESTIONS, added on
 * the Updates chat's word), then the ones to clear, A to Z; then the
 * permissions that name no iconographer; then the settled ones.
 *
 * Pure: the registries come in (the defaults are the real ones), the list
 * goes out. Tested in lib/saints/__tests__/iconDebt.test.ts.
 */

import {
  ICON_QUESTIONS,
  ICON_RIGHTS,
  ICONS_URL_PREFIX,
  MISSING_ATTRIBUTION,
  UNVERIFIED_ICONS,
  type IconQuestion,
  type IconRights,
} from "./iconRights";
import { AUTHOR_ICONS } from "./icons";
import { SAINTS } from "./saints";

export type IconState = "needs-you" | "to-clear" | "unnamed" | "verified" | "permission";

export type IconListRow = {
  file: string;
  /** Where the picture is served, for the thumbnail. */
  url: string;
  state: IconState;
  /** The saints whose page shows it, by name. */
  saints: string[];
  /** Whether the Fathers' notes show it beside an author's name. */
  inNotes: boolean;
  /** What the record says: the debt's note (what the bytes prove), or the settled row's source and licence. */
  note: string;
  /** "321x420 JPG, 22 KB", from a debt row's note, when it says so. */
  size: string | null;
  /** When someone opened the file and looked at it; null for the debt. */
  inspectedOn: string | null;
  /** The owner's decision this icon waits on (ICON_QUESTIONS), when it waits on one. */
  question: IconQuestion | null;
};

export type IconList = {
  /** Waiting on the owner's decision (ICON_QUESTIONS). */
  needsYou: number;
  /** No source, licence or credit yet, and no question open. */
  toClear: number;
  /** Used with permission, with no iconographer named (MISSING_ATTRIBUTION). */
  unnamed: number;
  settled: number;
  rows: IconListRow[];
};

type Registries = {
  rights: Readonly<Record<string, IconRights>>;
  unverified: Readonly<Record<string, string>>;
  unnamed: readonly string[];
  questions?: Readonly<Record<string, IconQuestion>>;
  saints: readonly { name: string; iconUrl?: string }[];
  authors: Readonly<Record<string, string>>;
};

const REAL: Registries = {
  rights: ICON_RIGHTS,
  unverified: UNVERIFIED_ICONS,
  unnamed: MISSING_ATTRIBUTION,
  questions: ICON_QUESTIONS,
  saints: SAINTS,
  authors: AUTHOR_ICONS,
};

const ORDER: Record<IconState, number> = { "needs-you": 0, "to-clear": 1, unnamed: 2, verified: 3, permission: 3 };

const keyOf = (url: string) => (url.startsWith(ICONS_URL_PREFIX) ? url.slice(ICONS_URL_PREFIX.length) : url);

export function iconList(reg: Registries = REAL): IconList {
  const saintsByFile = new Map<string, string[]>();
  for (const s of reg.saints) {
    if (!s.iconUrl) continue;
    const k = keyOf(s.iconUrl);
    const names = saintsByFile.get(k) ?? [];
    if (!names.includes(s.name)) names.push(s.name);
    saintsByFile.set(k, names);
  }
  const inNotes = new Set(Object.values(reg.authors).map(keyOf));
  const unnamed = new Set(reg.unnamed);
  const questions = reg.questions ?? {};
  const asked = (file: string) => (Object.prototype.hasOwnProperty.call(questions, file) ? questions[file] : null);

  const rows: IconListRow[] = [];
  for (const [file, note] of Object.entries(reg.unverified)) {
    const question = asked(file);
    rows.push({
      file,
      url: ICONS_URL_PREFIX + file,
      state: question ? "needs-you" : "to-clear",
      saints: saintsByFile.get(file) ?? [],
      inNotes: inNotes.has(file),
      note,
      size: note.match(/\b\d+x\d+ [A-Za-z]+, [\d.]+ [KM]B\b/)?.[0] ?? null,
      inspectedOn: null,
      question,
    });
  }
  for (const [file, r] of Object.entries(reg.rights)) {
    if (file in reg.unverified) continue;
    const question = asked(file);
    const state: IconState = question
      ? "needs-you"
      : unnamed.has(file)
        ? "unnamed"
        : r.status === "verified"
          ? "verified"
          : "permission";
    rows.push({
      file,
      url: ICONS_URL_PREFIX + file,
      state,
      saints: saintsByFile.get(file) ?? [],
      inNotes: inNotes.has(file),
      note: r.status === "verified" ? `${r.source}; ${r.license}` : `${r.source}; used with permission (${r.grantedBy})`,
      size: null,
      inspectedOn: r.inspectedOn,
      question,
    });
  }
  rows.sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.file.localeCompare(b.file));

  const count = (state: IconState) => rows.filter((r) => r.state === state).length;
  const needsYou = count("needs-you");
  const toClear = count("to-clear");
  const unnamedCount = count("unnamed");
  return { needsYou, toClear, unnamed: unnamedCount, settled: rows.length - needsYou - toClear - unnamedCount, rows };
}
