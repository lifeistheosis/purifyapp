import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `node scripts/patch-notes.mjs propose --changed` (2026-11-11): every note
 * whose words in data/changelog/entries.json differ from the live table's is
 * filed for the owner's Accept, with its before and after, before the
 * release's `pull --apply` would write the table's old words back into the
 * file. Run here against the real file and a table made from it, with one
 * note changed in the table, one waiting in the queue, and the rest the same.
 */

type Row = Record<string, unknown>;
const world = vi.hoisted(() => ({ notes: [] as Row[], open: [] as Row[], inserted: [] as Row[] }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from(table: string) {
      const q = {
        select: () => q,
        in: () => q,
        insert: (rows: Row[]) => {
          world.inserted.push(...rows);
          return Promise.resolve({ error: null });
        },
        then: <T>(resolve: (r: { data: unknown; error: null }) => T) =>
          Promise.resolve({ data: table === "patch_notes" ? world.notes : world.open, error: null }).then(resolve),
      };
      return q;
    },
  }),
}));

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const iso = (d: string) => {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(d)!;
  return `${m[3]}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
};

type Entry = { version: string; name?: string; kind: string; date: string; blurb: string; items: unknown[] };
const entries = JSON.parse(readFileSync(path.join(process.cwd(), "data/changelog/entries.json"), "utf8")) as Entry[];

let logged: string[] = [];
const argv = process.argv;

async function run(...args: string[]) {
  vi.resetModules();
  process.argv = ["node", "scripts/patch-notes.mjs", "propose", "--changed", ...args];
  await import(path.join(process.cwd(), "scripts/patch-notes.mjs"));
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "a-test-key";
  logged = [];
  vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void logged.push(a.join(" ")));
  world.inserted = [];
  // The table, as the file says it: every note the same, a title only the table holds.
  world.notes = entries.map((e, i) => ({
    id: `note-${i}`,
    version: e.version,
    name: e.name ?? "",
    kind: e.kind,
    date: iso(e.date),
    title: "A title only the table holds",
    blurb: e.blurb,
    items: e.items,
    status: "published",
  }));
  // One old note whose line the table still says the old way, and one that already waits.
  const changed = world.notes.find((n) => n.version === "Alpha v1.3")!;
  changed.items = (changed.items as string[]).map((t, i) => (i === 5 ? "A line the table says another way." : t));
  world.open = [{ version: "Alpha v2.2" }];
  const waiting = world.notes.find((n) => n.version === "Alpha v2.2")!;
  waiting.blurb = "The table's words, while a revision waits.";
});

afterEach(() => {
  process.argv = argv;
  vi.restoreAllMocks();
});

describe("propose --changed", () => {
  it("lists every note the file words differently, leaves one that waits, and writes nothing on a dry run", async () => {
    await run();
    expect(logged).toContain("Would file 1:");
    expect(logged).toContain("  Claude changed item 6 in Alpha v1.3");
    expect(logged).toContain("  Alpha v2.2: already waits in the queue; left to it");
    expect(logged.at(-1)).toBe("Dry run. Add --apply to write them.");
    expect(world.inserted).toEqual([]);
  });

  it("files each with its before and after, keeping the table's title", async () => {
    await run("--apply");
    expect(world.inserted).toHaveLength(1);
    const [rev] = world.inserted as { version: string; note_id: string; status: string; before: { items: string[]; title: string }; after: { items: string[]; title: string } }[];
    expect(rev.version).toBe("Alpha v1.3");
    expect(rev.status).toBe("pending");
    expect(rev.before.items[5]).toBe("A line the table says another way.");
    expect(rev.after.items[5]).toBe(entries.find((e) => e.version === "Alpha v1.3")!.items[5]);
    expect(rev.after.title).toBe("A title only the table holds");
  });

  it("files nothing where the file and the table agree", async () => {
    world.notes = world.notes.map((n) => (n.version === "Alpha v1.3" ? { ...n, items: entries.find((e) => e.version === "Alpha v1.3")!.items } : n));
    await run("--apply");
    expect(logged).toContain("Every note in the file says what the table says. Nothing to propose.");
    expect(world.inserted).toEqual([]);
  });
});
