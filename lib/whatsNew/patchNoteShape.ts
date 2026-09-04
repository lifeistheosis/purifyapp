import { z } from "zod";

/**
 * The shape of one patch note as the admin editor, the actions route, the
 * propose script and the revision queue all pass it around. One schema, so a
 * note that the editor accepts is a note the route accepts is a note the
 * script can propose.
 *
 * No `server-only`: the client tab imports the type and the em-dash check.
 */

/** The one character the release notes may never carry. */
export const EM_DASH = /—/;

export const PatchNoteInput = z.object({
  version: z.string().trim().min(1).max(40),
  kind: z.string().trim().max(200).default(""),
  /** ISO date, YYYY-MM-DD. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  title: z.string().trim().max(200).default(""),
  blurb: z.string().max(8000).default(""),
  items: z.array(z.string().max(8000)).max(100).default([]),
});

export type PatchNoteInput = z.infer<typeof PatchNoteInput>;

/**
 * The first field carrying an em dash, or null. Named so the editor can point
 * at the field and the route can say which one it refused.
 */
export function emDashField(n: PatchNoteInput): string | null {
  if (EM_DASH.test(n.kind)) return "kind";
  if (EM_DASH.test(n.title)) return "title";
  if (EM_DASH.test(n.blurb)) return "blurb";
  const i = n.items.findIndex((it) => EM_DASH.test(it));
  if (i >= 0) return `item ${i + 1}`;
  return null;
}

/** The fields of a note, in the order the queue and the editor show them. */
export const NOTE_FIELDS = ["version", "kind", "date", "title", "blurb"] as const;

/**
 * "Claude changed the blurb and item 3": which fields differ between two
 * notes, as the sentence the queue leads with. Null when nothing differs.
 */
export function describeChange(
  before: PatchNoteInput | null,
  after: PatchNoteInput,
  who = "Claude",
): string | null {
  if (!before) return `${who} proposed a new note, ${after.version}`;
  const parts: string[] = [];
  for (const f of NOTE_FIELDS) {
    if ((before[f] ?? "") !== (after[f] ?? "")) parts.push(`the ${f}`);
  }
  const max = Math.max(before.items.length, after.items.length);
  const items: number[] = [];
  for (let i = 0; i < max; i++) {
    if ((before.items[i] ?? "") !== (after.items[i] ?? "")) items.push(i + 1);
  }
  if (items.length === 1) parts.push(`item ${items[0]}`);
  else if (items.length > 1) parts.push(`items ${items.join(", ")}`);
  if (parts.length === 0) return null;
  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${who} changed ${list} in ${after.version}`;
}
