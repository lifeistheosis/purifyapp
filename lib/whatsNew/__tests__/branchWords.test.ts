import { beforeEach, describe, expect, it, vi } from "vitest";

import { branchWords, entryAsInput } from "@/lib/whatsNew/branchWords";
import type { Entry } from "@/lib/whatsNew/entries";
import type { PatchNoteRow } from "@/lib/whatsNew/notes";

/**
 * The release's own file can word an old note differently from the table
 * (1.9 says the old notes' keys, hovering and code in plain words). Each such
 * note reaches What's new only through the owner's Accept, with its before
 * and after, and he can accept them all at once once he has read them (the
 * arbiter, 2026-11-11). lib/whatsNew/branchWords.ts finds them; the route
 * files them and accepts them (app/api/admin/patch-notes/actions/route.ts).
 */

const entry = (over: Partial<Entry> = {}): Entry => ({
  version: "Alpha v3.3",
  kind: "Patch",
  date: "May 21, 2026",
  blurb: "Three things you've asked for land together.",
  items: ["A saint's writings now answer like the Bible.", "A new gold star keeps the section."],
  ...over,
});

const row = (over: Partial<PatchNoteRow> = {}): PatchNoteRow => ({
  id: "11111111-1111-4111-8111-111111111111",
  version: "Alpha v3.3",
  kind: "Patch",
  date: "2026-05-21",
  title: "A title only the table holds",
  blurb: "Three things you've asked for land together.",
  items: ["A saint's writings now answer like the Bible.", "A new gold star keeps the section."],
  status: "published",
  published_at: "2026-05-21T10:00:00Z",
  updated_at: "2026-05-21T10:00:00Z",
  updated_by_email: null,
  ...over,
});

describe("the notes the release's file words differently", () => {
  it("finds nothing where the two say the same, however each writes its date", () => {
    expect(branchWords([entry()], [row()], new Set())).toEqual([]);
  });

  it("proposes the file's words for a note whose line changed, with its before and after", () => {
    const changed = entry({ items: ["A saint's writings now answer like the Bible.", "Hover any paragraph: gone, now a plain line."] });
    const [found, ...rest] = branchWords([changed], [row({ items: ["A saint's writings now answer like the Bible.", "Hover any paragraph."] })], new Set());
    expect(rest).toEqual([]);
    expect(found.version).toBe("Alpha v3.3");
    expect(found.noteId).toBe("11111111-1111-4111-8111-111111111111");
    expect(found.summary).toBe("Claude changed item 2 in Alpha v3.3");
    expect(found.before?.items[1]).toBe("Hover any paragraph.");
    expect(found.after.items[1]).toBe("Hover any paragraph: gone, now a plain line.");
  });

  it("keeps what only the table holds: its title, and a name the file does not give", () => {
    const after = entryAsInput(entry(), row({ name: "Kept" }));
    expect(after?.title).toBe("A title only the table holds");
    expect(after?.name).toBe("Kept");
    expect(branchWords([entry()], [row({ name: "Kept" })], new Set())).toEqual([]);
  });

  it("leaves a note that already waits in the queue to that proposal", () => {
    expect(branchWords([entry({ blurb: "New words." })], [row()], new Set(["Alpha v3.3"]))).toEqual([]);
  });

  it("proposes a note the table lacks as a new one", () => {
    const [found] = branchWords([entry({ version: "1.9", date: "November 10, 2026" })], [row()], new Set());
    expect(found.before).toBeNull();
    expect(found.noteId).toBeNull();
    expect(found.summary).toBe("Claude proposed a new note, 1.9");
    expect(found.after.date).toBe("2026-11-10");
  });

  it("skips a note whose date the file writes wrongly, rather than propose a broken one", () => {
    expect(branchWords([entry({ date: "someday" })], [row({ blurb: "x" })], new Set())).toEqual([]);
  });
});

// ── The route: file them, then accept them all ─────────────────────────────

type Row = Record<string, unknown>;
const db = vi.hoisted(() => ({ tables: {} as Record<string, Row[]>, nextId: 1 }));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => ({ id: "u-owner", email: "owner@example.com" }) }));
vi.mock("@/lib/admin/activityLog", () => ({ logActivity: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/whatsNew/entries", () => ({
  ENTRIES: [
    { version: "Alpha v3.3", kind: "Patch", date: "May 21, 2026", blurb: "Plain words.", items: ["A plain line."] },
    { version: "Alpha v2.2", kind: "Patch", date: "May 18, 2026", blurb: "Same.", items: ["Same line."] },
    { version: "Alpha v1.3", kind: "Patch", date: "May 15, 2026", blurb: "Waits.", items: ["New words for a note that already waits."] },
  ],
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const tests: ((r: Row) => boolean)[] = [];
      let single = false;
      let write: { kind: "insert" | "update"; value: Row | Row[] } | null = null;
      const rows = () => (db.tables[table] ??= []);
      const run = () => {
        if (write?.kind === "insert") {
          const added = (Array.isArray(write.value) ? write.value : [write.value]).map((v) => ({ id: `id-${db.nextId++}`, created_at: new Date(db.nextId * 1000).toISOString(), ...v }));
          rows().push(...added);
          return { data: single ? added[0] : added, error: null };
        }
        const hit = rows().filter((r) => tests.every((t) => t(r)));
        if (write?.kind === "update") for (const r of hit) Object.assign(r, write.value);
        return { data: single ? (hit[0] ?? null) : hit, error: null };
      };
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => (tests.push((r) => r[c] === v), q),
        in: (c: string, vs: unknown[]) => (tests.push((r) => vs.includes(r[c])), q),
        order: () => q,
        maybeSingle: () => ((single = true), q),
        insert: (value: Row | Row[]) => ((write = { kind: "insert", value }), q),
        update: (value: Row) => ((write = { kind: "update", value }), q),
        then: <T>(resolve: (r: { data: unknown; error: null }) => T) => Promise.resolve(run()).then(resolve),
      };
      return q;
    },
  }),
}));

const ACT = (body: unknown) =>
  import("@/app/api/admin/patch-notes/actions/route").then(({ POST }) =>
    POST(new Request("https://purifyapp.net/api/admin/patch-notes/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) as never),
  );

const note = (version: string, blurb: string, items: string[], date: string) => ({
  id: `note-${version}`,
  version,
  name: "",
  kind: "Patch",
  date,
  title: "",
  blurb,
  items,
  status: "published",
  published_at: null,
  updated_at: "",
  updated_by_email: null,
});

beforeEach(() => {
  db.nextId = 1;
  db.tables = {
    patch_notes: [
      note("Alpha v3.3", "Hover any paragraph.", ["Right-click for a menu."], "2026-05-21"),
      note("Alpha v2.2", "Same.", ["Same line."], "2026-05-18"),
      note("Alpha v1.3", "Old.", ["Esc closes it."], "2026-05-15"),
    ],
    patch_note_revisions: [
      // The owner sent this one back: it is his to answer, not Accept all's.
      { id: "rev-suggested", note_id: "note-Alpha v1.3", version: "Alpha v1.3", author: "claude", summary: "s", before: null, after: {}, status: "suggested", created_at: "2026-11-10T00:00:00Z" },
    ],
  };
});

describe("Put them in the queue, then Accept all", () => {
  it("files one proposal for each note the file words differently, none for one that already waits, and none twice", async () => {
    const res = await ACT({ action: "branch-propose" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, filed: 1 });
    const filed = db.tables.patch_note_revisions.filter((r) => r.status === "pending");
    expect(filed.map((r) => r.version)).toEqual(["Alpha v3.3"]);
    expect((filed[0].after as { items: string[] }).items).toEqual(["A plain line."]);
    expect((filed[0].before as { items: string[] }).items).toEqual(["Right-click for a menu."]);
    // Nothing reached the table.
    expect(db.tables.patch_notes[0].blurb).toBe("Hover any paragraph.");
    // Pressed again, it files nothing: the note waits in the queue now.
    expect(await (await ACT({ action: "branch-propose" })).json()).toEqual({ ok: true, filed: 0 });
  });

  it("accepts every waiting proposal at once, and leaves the one he sent back", async () => {
    await ACT({ action: "branch-propose" });
    const res = await ACT({ action: "revision-accept-all" });
    expect(await res.json()).toEqual({ ok: true, accepted: 1, refused: [] });
    expect(db.tables.patch_notes[0]).toMatchObject({ blurb: "Plain words.", items: ["A plain line."] });
    expect(db.tables.patch_note_revisions.find((r) => r.id === "rev-suggested")?.status).toBe("suggested");
    expect(db.tables.patch_note_revisions.filter((r) => r.status === "pending")).toEqual([]);
  });

  it("refuses one with an em dash by name and still accepts the rest", async () => {
    db.tables.patch_note_revisions.push(
      { id: "rev-a", note_id: "note-Alpha v2.2", version: "Alpha v2.2", author: "claude", summary: "a", before: null, after: { version: "Alpha v2.2", kind: "Patch", date: "2026-05-18", blurb: "A dash \u2014 here.", items: [] }, status: "pending", created_at: "2026-11-11T00:00:01Z" },
      { id: "rev-b", note_id: "note-Alpha v3.3", version: "Alpha v3.3", author: "claude", summary: "b", before: null, after: { version: "Alpha v3.3", kind: "Patch", date: "2026-05-21", blurb: "Fine.", items: ["Fine."] }, status: "pending", created_at: "2026-11-11T00:00:02Z" },
    );
    const body = (await (await ACT({ action: "revision-accept-all" })).json()) as { ok: boolean; accepted: number; refused: { version: string; error: string }[] };
    expect(body.accepted).toBe(1);
    expect(body.refused).toEqual([{ version: "Alpha v2.2", error: "The proposed blurb carries an em dash. Deny it or suggest a fix." }]);
    expect(db.tables.patch_notes[0].blurb).toBe("Fine.");
    expect(db.tables.patch_notes[1].blurb).toBe("Same.");
  });
});
