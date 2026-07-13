"use client";

// Export everything a reader has gathered on this device: florilegia, notes and
// highlights, bookmarks, and the diptychs. Pure local data, no account needed.
// gatherLibrary() reads localStorage; toJson / toMarkdown / librarySummary are
// pure over the gathered shape so they can be unit-tested.

import type { Florilegium, FlorilegiumItem } from "@/lib/florilegium/florilegium";
import { listFlorilegia } from "@/lib/florilegium/florilegium";
import { readIntentions, type Intention } from "@/lib/prayers/storage";

export type ExportedAnnotation = {
  ref: string;
  note?: string;
  color?: string;
  highlighted?: boolean;
};

export type LibraryData = {
  exportedAt: string;
  florilegia: Florilegium[];
  bookmarks: { label?: string }[];
  diptychs: { living: Intention[]; departed: Intention[] };
  annotations: ExportedAnnotation[];
};

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Turn an annotation storage key into a human reference. */
export function humanRefFromKey(key: string): string {
  const parts = key.split(":");
  // purify:bible:john:1:1 -> John 1:1
  if (parts[1] === "bible" && parts.length >= 5) {
    const book = parts[2].replace(/-/g, " ");
    return `${titleCase(book)} ${parts[3]}:${parts[4]}`;
  }
  // purify:saint:athanasius:on-the-incarnation:2:3 -> Athanasius · On The Incarnation §2.3
  if (parts[1] === "saint" && parts.length >= 6) {
    const saint = titleCase(parts[2].replace(/-/g, " "));
    const work = titleCase(parts[3].replace(/-/g, " "));
    return `${saint} · ${work} §${parts[4]}.${parts[5]}`;
  }
  return key;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function gatherLibrary(): LibraryData {
  const florilegia = listFlorilegia();
  const bookmarks = readLocal<{ label?: string }[]>("purify:bookmarks", []);
  const diptychs = {
    living: readIntentions("living"),
    departed: readIntentions("departed"),
  };

  const annotations: ExportedAnnotation[] = [];
  if (typeof window !== "undefined") {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (!k.startsWith("purify:bible:") && !k.startsWith("purify:saint:")) continue;
      try {
        const v = JSON.parse(window.localStorage.getItem(k) ?? "{}") as {
          note?: string;
          color?: string;
          highlighted?: boolean;
        };
        if (v.note || v.highlighted || v.color) {
          annotations.push({
            ref: humanRefFromKey(k),
            note: v.note,
            color: v.color,
            highlighted: v.highlighted,
          });
        }
      } catch {
        /* skip an unparseable key */
      }
    }
  }
  annotations.sort((a, b) => a.ref.localeCompare(b.ref));

  return {
    exportedAt: new Date().toISOString(),
    florilegia,
    bookmarks,
    diptychs,
    annotations,
  };
}

export function librarySummary(data: LibraryData): {
  florilegia: number;
  gatheredLines: number;
  bookmarks: number;
  names: number;
  notes: number;
} {
  return {
    florilegia: data.florilegia.length,
    gatheredLines: data.florilegia.reduce((n, f) => n + (f.items?.length ?? 0), 0),
    bookmarks: data.bookmarks.length,
    names: data.diptychs.living.length + data.diptychs.departed.length,
    notes: data.annotations.length,
  };
}

export function toJson(data: LibraryData): string {
  return JSON.stringify(data, null, 2);
}

function itemLine(item: FlorilegiumItem): string {
  const text = (item.text ?? "").trim();
  let attribution = "";
  if (item.kind === "scripture") attribution = item.reference;
  else if (item.kind === "father")
    attribution = [item.author, item.work].filter(Boolean).join(", ");
  const note = item.note ? `\n>\n> ${item.note.trim()}` : "";
  return `> ${text}\n> — ${attribution}${note}`;
}

export function toMarkdown(data: LibraryData): string {
  const out: string[] = [];
  out.push("# My Purify library");
  out.push(`Exported ${new Date(data.exportedAt).toISOString().slice(0, 10)}.`);

  if (data.florilegia.length) {
    out.push("\n## Florilegia\n");
    for (const f of data.florilegia) {
      out.push(`### ${f.title}`);
      if (f.description) out.push(`_${f.description}_`);
      for (const item of f.items ?? []) out.push(itemLine(item));
      out.push("");
    }
  }

  const { living, departed } = data.diptychs;
  if (living.length || departed.length) {
    out.push("\n## Diptychs\n");
    if (living.length) {
      out.push("**For the living**");
      for (const p of living) out.push(`- ${nameLine(p)}`);
    }
    if (departed.length) {
      out.push("\n**For the departed** — memory eternal");
      for (const p of departed) out.push(`- ${nameLine(p, true)}`);
    }
    out.push("");
  }

  if (data.annotations.length) {
    out.push("\n## Notes and highlights\n");
    for (const a of data.annotations) {
      out.push(a.note ? `- **${a.ref}**: ${a.note}` : `- **${a.ref}** (highlighted)`);
    }
    out.push("");
  }

  if (data.bookmarks.length) {
    out.push("\n## Bookmarks\n");
    for (const b of data.bookmarks) if (b.label) out.push(`- ${b.label}`);
    out.push("");
  }

  return out.join("\n");
}

function nameLine(p: Intention, departed = false): string {
  const bits = [p.name];
  if (p.relationship) bits.push(`(${p.relationship})`);
  if (p.nameday) bits.push(`· name day ${p.nameday}`);
  if (departed && p.repose) bits.push(`· reposed ${p.repose}`);
  return bits.join(" ");
}
