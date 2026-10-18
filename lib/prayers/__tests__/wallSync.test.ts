import { beforeEach, describe, expect, it, vi } from "vitest";

import { WALL_DAYS, WALL_TAG, addWallName, markWallPrayed, unmarkWallPrayed, wallId, wallToRow, type WallName } from "@/lib/prayers/wallNames";

/**
 * The names from the prayer wall in the reader's own account (1.7.1), run
 * through the real /api/prayer/sync against an in-memory copy of their rows.
 * They ride in intentions_living, tagged, and must never come back out as the
 * reader's diptychs: an app from before 1.7.1 reads that list and would keep
 * a stranger's name among the reader's own for good.
 */

type Row = Record<string, unknown>;

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";

const state = vi.hoisted(() => ({ db: null as unknown }));

vi.mock("@/lib/supabase/server", () => ({ createClientFromRequest: async () => state.db }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/streak/server", () => ({ refreshStreak: async () => {} }));

import { GET, POST } from "@/app/api/prayer/sync/route";

/**
 * The reader's own rows, as row level security shows them: only theirs. The
 * filters are the ones the route uses; one it does not know throws.
 */
function fakeDb(tables: Record<string, Row[]>, userId: string) {
  const from = (table: string) => {
    const rows = (tables[table] ??= []);
    const filters: ((r: Row) => boolean)[] = [];
    let removing = false;
    let window: [number, number] = [0, Number.POSITIVE_INFINITY];
    const has = (r: Row, c: string, want: unknown[]) => Array.isArray(r[c]) && want.every((w) => (r[c] as unknown[]).includes(w));
    const q = {
      select: () => q,
      not: (c: string, op: string, v: string) => {
        if (op !== "cs") throw new Error(`not modeled: .not(${c}, ${op})`);
        const want = v.replace(/^\{|\}$/g, "").split(",");
        filters.push((r) => !has(r, c, want));
        return q;
      },
      contains: (c: string, want: unknown[]) => (filters.push((r) => has(r, c, want)), q),
      in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
      lt: (c: string, v: string) => (filters.push((r) => typeof r[c] === "string" && (r[c] as string) < v), q),
      order: () => q,
      limit: (n: number) => ((window = [0, n - 1]), q),
      range: (a: number, b: number) => ((window = [a, b]), q),
      delete: () => ((removing = true), q),
      upsert: (list: Row[], opts: { onConflict: string }) => {
        const keys = opts.onConflict.split(",");
        for (const r of list) {
          const at = rows.findIndex((x) => keys.every((k) => x[k] === r[k]));
          if (at >= 0) rows[at] = { ...rows[at], ...r };
          else rows.push({ ...r });
        }
        return Promise.resolve({ data: null, error: null });
      },
      then: <A, B>(ok: (v: { data: Row[] | null; error: null }) => A, bad?: (e: unknown) => B) =>
        Promise.resolve()
          .then(() => {
            const hit = rows.filter((r) => r.user_id === userId && filters.every((f) => f(r)));
            if (removing) {
              for (const r of hit) rows.splice(rows.indexOf(r), 1);
              return { data: null, error: null };
            }
            return { data: hit.slice(window[0], window[1] + 1), error: null };
          })
          .then(ok, bad),
    };
    return q;
  };
  return { from, auth: { getUser: async () => ({ data: { user: { id: userId } } }) } };
}

const T0 = new Date();
const later = (h: number) => new Date(T0.getTime() + h * 3_600_000);
const MARIA = { id: wallId("maria", "2026-10-17T20:00:00.000Z"), name: "Maria", intention: "For my mother's surgery" };

let living: Row[];

/** A name as the account keeps it: the reader's own row of their list of the living. */
const stored = (n: WallName, user = ANNA): Row => {
  const r = wallToRow(n);
  return { user_id: user, id: r.id, name: r.name, relationship: null, note: r.note, nameday: null, tags: r.tags, added_at: r.addedAt };
};

const ELENI: Row = {
  user_id: ANNA,
  id: "33333333-3333-4333-8333-333333333333",
  name: "Eleni",
  relationship: "grandmother",
  note: null,
  nameday: null,
  tags: ["family"],
  added_at: "2025-01-01T00:00:00.000Z",
};

beforeEach(() => {
  living = [];
  state.db = fakeDb({ intentions_living: living, intentions_departed: [], prayer_completions: [], rope_sessions: [] }, ANNA);
});

async function pull() {
  const res = await GET(new Request("https://purifyapp.net/api/prayer/sync") as never);
  return (await res.json()) as { intentions: { living: Row[] }; wall: WallName[] };
}

async function push(wall?: WallName[]) {
  const body = { completions: [], intentions: { living: [], departed: [] }, rope: { sessions: [] }, ...(wall ? { wall } : {}) };
  const res = await POST(
    new Request("https://purifyapp.net/api/prayer/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) as never,
  );
  expect(res.status).toBe(200);
}

describe("the names from the prayer wall in the reader's account", () => {
  it("never come back out as the reader's own names, and travel on their own", async () => {
    const maria = addWallName([], MARIA, "evening", T0)[0];
    living.push({ ...ELENI }, stored(maria), stored(addWallName([], { ...MARIA, name: "Someone else's" }, "today", T0)[0], BEN));
    const j = await pull();
    expect(j.intentions.living.map((r) => r.name)).toEqual(["Eleni"]);
    expect(j.wall).toEqual([maria]);
  });

  it("are kept as tagged rows of that list, and the reader's own names are untouched", async () => {
    living.push({ ...ELENI });
    const maria = addWallName([], MARIA, "evening", T0)[0];
    await push([maria]);
    const row = living.find((r) => r.id === MARIA.id)!;
    expect(row).toMatchObject({ user_id: ANNA, name: "Maria", note: MARIA.intention });
    expect(row.tags).toContain(WALL_TAG);
    expect(living.find((r) => r.id === ELENI.id)).toEqual(ELENI);
  });

  it("an older change never overwrites a newer one, and a newer one does", async () => {
    const added = addWallName([], MARIA, "evening", T0);
    const prayed = markWallPrayed(added, [MARIA.id], later(2));
    living.push(stored(prayed[0]));
    // A device that had not heard: its older copy leaves the account's alone.
    await push(added);
    expect((await pull()).wall[0].doneAt).toBe(later(2).toISOString());
    // The mark taken back later, on any device, wins.
    await push(unmarkWallPrayed(prayed, [MARIA.id], later(3)));
    expect((await pull()).wall[0].doneAt).toBeNull();
  });

  it("let go once their days are long past; the reader's own names stay whatever their age", async () => {
    const old = addWallName([], MARIA, "today", new Date(T0.getTime() - (WALL_DAYS + 2) * 86_400_000))[0];
    living.push({ ...ELENI }, stored(old));
    await push([]);
    expect(living.map((r) => r.id)).toEqual([ELENI.id]);
  });

  it("are left as they are by an app from before 1.7.1, which sends none", async () => {
    const old = addWallName([], MARIA, "today", new Date(T0.getTime() - (WALL_DAYS + 2) * 86_400_000))[0];
    living.push(stored(old));
    await push();
    expect(living).toHaveLength(1);
  });

  it("never write over a row of the reader's own names", async () => {
    living.push({ ...ELENI, id: MARIA.id });
    await push(addWallName([], MARIA, "evening", T0));
    expect(living).toEqual([{ ...ELENI, id: MARIA.id }]);
  });
});
