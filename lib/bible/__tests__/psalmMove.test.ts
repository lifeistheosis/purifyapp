// The one-time move of a reader's things on Psalms 113 to 115 (lib/bible/psalmMove.ts),
// Fable's release check 1, M1, switched on by his yes of 2026-11-09: held to
// the renumbering script's own mapping, run on each device as the app's code
// loads, and on the server by its migration.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { moved } from "../../../scripts/bibles/psalms-113-115.mjs";
import { moveDevicePsalms, movedSpan, movedVerse, moveVerseCards, PSALMS_MOVED_KEY, type MoveStore } from "../psalmMove";
import { localMoveStore, SERVER_MOVE, settleWith } from "../psalmMoveBoot";

function device(seed: Record<string, unknown>) {
  const data = new Map<string, string>(Object.entries(seed).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  const store: MoveStore = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    keys: () => [...data.keys()],
  };
  const json = (k: string) => JSON.parse(data.get(k) ?? "null");
  return { data, store, json };
}

describe("where each old verse of Psalms 113 to 115 stands now", () => {
  it("is where the renumbering script put it, for every verse", () => {
    for (const [chapter, verses] of [[113, 8], [114, 18], [115, 19]] as const) {
      for (let v = 1; v <= verses; v++) expect(movedVerse(chapter, v), `${chapter}:${v}`).toEqual(moved(chapter, v));
    }
  });

  it("splits a span across the new line between 114 and 115 in two", () => {
    expect(movedSpan(114, 1, 18)).toEqual([{ chapter: 113, from: 9, to: 26 }]);
    expect(movedSpan(115, 9, 11)).toEqual([{ chapter: 114, from: 9, to: 9 }, { chapter: 115, from: 1, to: 2 }]);
  });

  it("moves a journal page's verse cards line by line, so none moves twice", () => {
    const body = "# Psalms\n\n[[verse psalms 115:1]]\n\n[[verse psalms 114:1-2]]\n\n[[verse psalms 115:9-11]]\n\nMy words on 114:4.";
    expect(moveVerseCards(body)).toBe(
      "# Psalms\n\n[[verse psalms 114:1]]\n\n[[verse psalms 113:9-10]]\n\n[[verse psalms 114:9]]\n\n[[verse psalms 115:1-2]]\n\nMy words on 114:4.",
    );
  });
});

describe("the move on a device", () => {
  it("moves notes, highlights, saved verses, Remember, journal cards, gathered verses and the last place, as they were", () => {
    const d = device({
      "purify:bible:psalms:114:1": { note: "Not unto us", noteAt: "2026-10-01T00:00:00Z", at: "2026-10-01T00:00:00Z" },
      "purify:bible:psalms:115:1": { highlighted: true, color: "gold", hlAt: "2026-10-02T00:00:00Z", at: "2026-10-02T00:00:00Z" },
      "purify:bible:psalms:115:10": { note: "I believed", at: "2026-10-03T00:00:00Z" },
      "purify:bible:psalms:113:1": { note: "stays", at: "2026-10-04T00:00:00Z" },
      "purify:bookmarks": [
        { kind: "bible-verse", book: "psalms", bookName: "Psalms", chapter: 115, verse: 10, label: "Psalms 115:10", addedAt: 1 },
        { kind: "bible-chapter", book: "psalms", bookName: "Psalms", chapter: 114, label: "Psalms 114", addedAt: 2 },
        { kind: "bible-verse", book: "john", bookName: "John", chapter: 3, verse: 16, label: "John 3:16", addedAt: 3 },
      ],
      "purify:remember": { entries: { "psalms/115/10": { box: 1, due: "2026-12-02", at: 5 } }, texts: { "psalms/115/10": "I believed" }, answeredKey: "psalms/115/10" },
      "purify:journal": [{ id: "a", body: "[[verse psalms 115:10]]", updatedAt: "2026-10-05T00:00:00Z" }],
      "purify:bible:last": { book: "psalms", bookName: "Psalms", chapter: 115, verse: 12, ts: 9 },
      "purify:florilegia": [{ id: "f", updatedAt: 1, items: [{ id: "i", kind: "scripture", text: "I believed, wherefore I have spoken", reference: "Psalms 115:10", book: "psalms", chapter: 115, verse: 10 }] }],
    });
    const report = moveDevicePsalms(d.store);
    expect(report).toEqual({ annotations: 3, bookmarks: 2, remember: 1, journal: 1, florilegium: 1, lastRead: true });
    expect(d.json("purify:florilegia")[0]).toMatchObject({
      updatedAt: 1,
      items: [{ text: "I believed, wherefore I have spoken", reference: "Psalms 115:1", chapter: 115, verse: 1 }],
    });
    // Old 114:1 and old 115:1 both moved, neither over the other.
    // Each as it was, its times too: a device sends nothing it did not change.
    expect(d.json("purify:bible:psalms:113:9")).toEqual({ note: "Not unto us", noteAt: "2026-10-01T00:00:00Z", at: "2026-10-01T00:00:00Z" });
    expect(d.json("purify:bible:psalms:114:1")).toEqual({ highlighted: true, color: "gold", hlAt: "2026-10-02T00:00:00Z", at: "2026-10-02T00:00:00Z" });
    expect(d.json("purify:bible:psalms:115:1")).toMatchObject({ note: "I believed" });
    expect(d.json("purify:bible:psalms:113:1")).toMatchObject({ note: "stays", at: "2026-10-04T00:00:00Z" });
    expect(d.data.has("purify:bible:psalms:115:10")).toBe(false);
    expect(d.json("purify:bookmarks").slice(0, 2)).toEqual([
      { kind: "bible-verse", book: "psalms", bookName: "Psalms", chapter: 115, verse: 1, label: "Psalms 115:1", addedAt: 1 },
      { kind: "bible-chapter", book: "psalms", bookName: "Psalms", chapter: 113, label: "Psalms 113", addedAt: 2 },
    ]);
    expect(d.json("purify:remember")).toMatchObject({ entries: { "psalms/115/1": { box: 1, at: 5 } }, texts: { "psalms/115/1": "I believed" }, answeredKey: "psalms/115/1" });
    expect(d.json("purify:journal")[0]).toEqual({ id: "a", body: "[[verse psalms 115:1]]", updatedAt: "2026-10-05T00:00:00Z" });
    expect(d.json("purify:bible:last")).toMatchObject({ chapter: 115, verse: 3 });
  });

  it("runs once, and leaves a newer copy already at the new place as it is", () => {
    const d = device({
      "purify:bible:psalms:114:4": { note: "old", at: "2026-10-01T00:00:00Z" },
      "purify:bible:psalms:113:12": { note: "from the tablet, newer", at: "2026-11-30T00:00:00Z" },
    });
    expect(moveDevicePsalms(d.store)?.annotations).toBe(0);
    expect(d.json("purify:bible:psalms:113:12")).toEqual({ note: "from the tablet, newer", at: "2026-11-30T00:00:00Z" });
    expect(d.data.get(PSALMS_MOVED_KEY)).toBe("1");
    d.data.set("purify:bible:psalms:114:4", JSON.stringify({ note: "pulled later, already new" }));
    expect(moveDevicePsalms(d.store)).toBeNull();
    expect(d.json("purify:bible:psalms:114:4")).toEqual({ note: "pulled later, already new" });
  });

  it("tombstones nothing: once the server has moved, an old place is another verse's new place", () => {
    const src = fs.readFileSync("lib/bible/psalmMove.ts", "utf8");
    expect(src).not.toMatch(/addTombstone|tombstones"/);
  });

  it("waits for the server's move: the app asks as its code loads, and every sync of verse-numbered things waits for the answer", () => {
    const users = (name: string) => {
      const hits: string[] = [];
      const walk = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) {
            if (e.name !== "__tests__" && e.name !== "node_modules") walk(p);
          } else if (/\.(ts|tsx)$/.test(e.name) && fs.readFileSync(p, "utf8").includes(`/${name}"`)) hits.push(p);
        }
      };
      for (const dir of ["app", "components", "lib"]) walk(dir);
      return hits.sort();
    };
    expect(users("psalmMove")).toEqual([path.join("lib", "bible", "psalmMoveBoot.ts")]);
    expect(users("psalmMoveBoot")).toEqual([path.join("components", "layout", "RootFrame.tsx"), path.join("lib", "sync", "gate.ts")].sort());
    // Asked at the module's top level, as the app's code loads, for a reader not signed in too.
    const frame = fs.readFileSync("components/layout/RootFrame.tsx", "utf8");
    const ask = frame.indexOf("\nvoid settlePsalmsMove();\n");
    expect(ask).toBeGreaterThan(-1);
    expect(ask).toBeLessThan(frame.indexOf("export function RootFrame("));
    // Every sync of what carries a verse's number waits for it.
    for (const mod of ["annotations", "bookmarks", "florilegium", "journal", "kept"]) {
      const code = fs.readFileSync(`lib/sync/${mod}.ts`, "utf8");
      expect(code, mod).toContain('import { canSyncPlaces } from "@/lib/sync/gate";');
      expect(code, mod).not.toMatch(/\bcanSync\(\)/);
    }
    expect(fs.readFileSync("lib/sync/gate.ts", "utf8")).toMatch(/if \(!\(await settlePsalmsMove\(\)\)\) return false;\s*return canSync\(\);/);
  });
});

describe("settling a device with the server", () => {
  const old = () =>
    device({ "purify:bible:psalms:114:1": { note: "I am well pleased", at: "2026-10-01T00:00:00Z" } });

  it("moves its copies once the server has moved, and then never asks again", async () => {
    const d = old();
    let asked = 0;
    const ask = async () => {
      asked += 1;
      return "moved" as const;
    };
    expect(await settleWith(d.store, ask)).toBe(true);
    expect(d.json("purify:bible:psalms:113:9")).toMatchObject({ note: "I am well pleased" });
    expect(d.data.get(PSALMS_MOVED_KEY)).toBe("1");
    expect(await settleWith(d.store, ask)).toBe(true);
    expect(asked).toBe(1);
  });

  it("keeps the old numbering while the server has not moved (a test build before release day), and syncs in it", async () => {
    const d = old();
    expect(await settleWith(d.store, async () => "not-moved")).toBe(true);
    expect(d.json("purify:bible:psalms:114:1")).toMatchObject({ note: "I am well pleased" });
    expect(d.data.has("purify:bible:psalms:113:9")).toBe(false);
    // No mark: the next visit asks again.
    expect(d.data.has(PSALMS_MOVED_KEY)).toBe(false);
  });

  it("holds back the sync, and moves nothing, while it cannot tell", async () => {
    const d = old();
    expect(await settleWith(d.store, async () => "unknown")).toBe(false);
    expect(d.json("purify:bible:psalms:114:1")).toMatchObject({ note: "I am well pleased" });
    expect(d.data.has(PSALMS_MOVED_KEY)).toBe(false);
  });

  it("reads the browser's own storage", () => {
    const data = new Map<string, string>([["a", "1"], ["b", "2"]]);
    const storage = {
      get length() {
        return data.size;
      },
      key: (i: number) => [...data.keys()][i] ?? null,
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear(),
    } as Storage;
    expect(localMoveStore(storage).keys()).toEqual(["a", "b"]);
  });

  it("asks the server's own row, with the public key, and knows a missing table for a move not made", () => {
    const boot = fs.readFileSync("lib/bible/psalmMoveBoot.ts", "utf8");
    expect(boot).toContain('createClient().from("data_moves").select("name").eq("name", SERVER_MOVE).maybeSingle()');
    expect(boot).toContain('error.code === "PGRST205" || error.code === "42P01" ? "not-moved" : "unknown"');
    expect(SERVER_MOVE).toBe("psalms-113-115");
  });
});

describe("the move on the server", () => {
  const migration = fs.readFileSync("supabase/migrations/20261110001550_psalms_113_115_move.sql", "utf8");

  it("is the migration, word for word the record's copy", () => {
    expect(fs.readFileSync("docs/1.9-build/sql/psalms-113-115-move.sql", "utf8")).toBe(migration);
  });

  it("lets anyone read whether it has run, and nobody write it from an app", () => {
    expect(migration).toContain("grant select on public.data_moves to anon, authenticated;");
    expect(migration).toContain('drop policy if exists "data moves are public" on public.data_moves;');
    expect(migration).toContain('create policy "data moves are public" on public.data_moves for select to anon, authenticated using (true);');
    expect(migration).not.toMatch(/for (insert|update|delete|all)\b/);
  });

  it("runs twice safely, and moves each table only where it exists", () => {
    expect(migration).toContain("create table if not exists public.data_moves");
    expect(migration).toMatch(/if exists \(select 1 from public\.data_moves where name = 'psalms-113-115'\) then[\s\S]*?return;/);
    expect(migration).toContain("insert into public.data_moves (name) values ('psalms-113-115');");
    for (const table of ["annotations", "bookmarks", "florilegium_items", "journal_entries", "shared_pages"]) {
      const guard = migration.indexOf(`if to_regclass('public.${table}') is not null then`);
      expect(guard, table).toBeGreaterThan(-1);
      // Every statement on the table is inside its own guard.
      const firstUse = migration.search(new RegExp(`(update|delete from) public\\.${table}\\b`));
      expect(firstUse, table).toBeGreaterThan(guard);
    }
  });

  it("says the release day's step: by hand, just before the push", () => {
    expect(migration).toContain("RELEASE DAY: the owner runs this file by hand in the SQL editor just before\n-- the push to main.");
  });
});
