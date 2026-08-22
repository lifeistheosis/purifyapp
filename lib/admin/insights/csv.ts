/**
 * A CSV reader, for text an operator pasted in.
 *
 * lib/admin/csv.ts writes CSV. This one reads it, and the two are deliberately
 * separate: writing is a join, reading is a state machine, and the failure
 * modes have nothing in common.
 *
 * RFC 4180 QUOTING IS NOT OPTIONAL HERE. It would be tempting to split on
 * commas, and it would be wrong on the very first line of a real Play Console
 * export, where the date column reads "May 24, 2026" and every metric header
 * reads "Installed audience (All users, Unique users, Per interval, Daily):
 * All countries / regions". A naive split turns one 7 column file into 12
 * ragged columns and quietly reads the year as a metric.
 *
 * WHAT IT TOLERATES, because pasted text is never clean:
 *   a UTF-8 BOM, which Excel and Google Sheets both add and which otherwise
 *     becomes part of the first header name;
 *   CRLF, LF, or CR line endings, mixed;
 *   trailing newlines, including several, which is what the real exports have;
 *   blank lines anywhere;
 *   a short row, padded with nulls, rather than throwing;
 *   a long row, kept, so nothing is silently discarded;
 *   "" and whitespace as absent, distinct from "0", which is a real value.
 *
 * WHAT IT REFUSES: nothing. It never throws. A parser that throws on the tenth
 * line of a hundred line paste hands the operator no data and no idea which
 * line, so problems are collected and reported alongside whatever did parse.
 */

export type CsvCell = string | null;

export type CsvTable = {
  headers: string[];
  rows: CsvCell[][];
  /** Non-fatal things worth telling the operator about. */
  warnings: string[];
};

/** Strip a byte order mark and normalize line endings. */
function sanitize(text: string): string {
  return text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

/** "" and pure whitespace are absent. "0" is not. */
function cell(raw: string): CsvCell {
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Split one CSV document into rows of raw strings.
 *
 * A single pass, because quoting means you cannot split on lines first: a
 * quoted field is allowed to contain a newline, and the Notes column in a Play
 * Console export is exactly the kind of free text that eventually will.
 */
function splitRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        // A doubled quote inside a quoted field is a literal quote.
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      endField();
      i += 1;
      continue;
    }
    if (ch === "\n") {
      endRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  // Whatever is left after the last newline. Guarded, so a file ending in a
  // newline does not produce a phantom final row of one empty cell, which is
  // what every real export would otherwise yield.
  if (field !== "" || row.length > 0) endRow();

  return rows;
}

export function parseCsv(text: string): CsvTable {
  const warnings: string[] = [];
  const clean = sanitize(text ?? "");
  if (clean.trim() === "") {
    return { headers: [], rows: [], warnings: ["There was nothing to read."] };
  }

  const raw = splitRows(clean).filter(
    // A blank line is a row of one empty cell. Dropping them here rather than
    // in the caller means a file with a trailing newline, or three, parses to
    // exactly its data rows.
    (r) => !(r.length === 1 && r[0].trim() === ""),
  );

  if (raw.length === 0) {
    return { headers: [], rows: [], warnings: ["There was nothing to read."] };
  }

  const headers = raw[0].map((h) => h.trim());
  const width = headers.length;
  const rows: CsvCell[][] = [];

  let short = 0;
  let long = 0;

  for (const r of raw.slice(1)) {
    if (r.length < width) {
      short += 1;
      // Padded, not dropped. A row missing its trailing Notes column is still
      // a day of real data.
      rows.push([...r.map(cell), ...Array(width - r.length).fill(null)]);
    } else {
      if (r.length > width) long += 1;
      rows.push(r.map(cell));
    }
  }

  if (short > 0) {
    warnings.push(
      `${short} row${short === 1 ? "" : "s"} had fewer columns than the header. The missing values were read as blank.`,
    );
  }
  if (long > 0) {
    warnings.push(
      `${long} row${long === 1 ? "" : "s"} had more columns than the header. The extra values were kept but are not named by any column.`,
    );
  }

  return { headers, rows, warnings };
}

/**
 * Read a number out of a cell.
 *
 * Returns null rather than NaN or 0 for anything unreadable, because those two
 * are lies of different kinds: NaN poisons every sum it touches, and 0 is a
 * real measurement that means the metric was zero that day. A day with no data
 * and a day with no installs are not the same day.
 *
 * Handles the shapes a spreadsheet produces: thousands separators, a currency
 * symbol, a trailing percent, and parentheses for negatives.
 */
export function toNumber(value: CsvCell): number | null {
  if (value === null) return null;
  let s = value.trim();
  if (s === "") return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }

  s = s.replace(/[,\s]/g, "").replace(/^[$£€]/, "").replace(/%$/, "");
  if (s === "" || s === "-") return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/**
 * Read a date out of a cell, as a UTC calendar day.
 *
 * "May 24, 2026" is what Play Console exports, and `new Date("May 24, 2026")`
 * parses it in the LOCAL zone, which lands on the 23rd for anyone west of
 * Greenwich and shifts an entire series by a day. Both supported shapes are
 * therefore built from their parts and pinned to UTC.
 *
 * Returns a YYYY-MM-DD string rather than a Date, because every consumer wants
 * a stable key and a Date is a timestamp that will be re-zoned by whatever
 * formats it next.
 */
const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export function toDayKey(value: CsvCell): string | null {
  if (value === null) return null;
  const s = value.trim();

  // Already ISO, possibly with a time we do not want.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // "May 24, 2026" and "24 May 2026".
  const named = /^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
  const namedAlt = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/.exec(s);
  const m = named
    ? { mon: named[1], day: named[2], year: named[3] }
    : namedAlt
      ? { mon: namedAlt[2], day: namedAlt[1], year: namedAlt[3] }
      : null;
  if (m) {
    const idx = MONTHS[m.mon.slice(0, 3).toLowerCase()];
    if (idx === undefined) return null;
    const d = new Date(Date.UTC(Number(m.year), idx, Number(m.day)));
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  // "05/24/2026" is ambiguous with "24/05/2026" and there is no way to tell
  // them apart from one row, so it is refused rather than guessed. Guessing
  // wrong here silently relabels five months of data.
  return null;
}
