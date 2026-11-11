import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, world, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * The care note as it ships: its switch (lib/campaigns/careOn.ts), read here
 * as it is committed. What the writer does once it is on is careSend.test.ts.
 *
 * The inbox's table checks the kind of every row, and "care" is not one of
 * them until the owner's SQL has run (docs/1.9-build/sql/care-note.sql; it
 * moves into supabase/migrations on his sign-off and runs with the merge).
 * So the switch is off until that file is among the migrations, and the
 * commit that moves the file turns it on.
 *
 * What would go wrong if this broke: a moderator offered a button the
 * database refuses; or, the other way, the note switched on in a build whose
 * database cannot take it, and every send failing on the day it is needed.
 */

import { CARE_NOTE_SEND } from "@/lib/campaigns/careOn";
import { sendCareNote } from "@/lib/campaigns/careSend";
import { runCampaignModAction } from "@/lib/campaigns/moderation";
import { DANGER_HOLD_DETAIL } from "@/lib/campaigns/safety";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const MIGRATIONS = "supabase/migrations";
/** The care note's SQL once it is among the migrations: a file named for it, that adds the kind. */
const careMigration = () => readdirSync(join(process.cwd(), MIGRATIONS)).filter((name) => /^\d{14}_care_note\.sql$/.test(name) && /'care'/.test(read(`${MIGRATIONS}/${name}`)));

const ANNA = "11111111-1111-4111-8111-111111111111";
const MOD = { id: "55555555-5555-4555-8555-555555555555", name: "A moderator", email: "team@example.com", admin: true };
const CAMPAIGN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const HOLD = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const REPLY = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";

let w: World;
const db = () => client(w) as never;

beforeEach(() => {
  w = world();
  w.tables.community_notifications = [];
  w.tables.community_mod_log = [];
  w.tables.prayer_campaigns = [{ id: CAMPAIGN, creator_id: ANNA, title: "A sample", status: "held", held_reason: "new; crisis", creator_name: "Anna" }];
  w.tables.community_post_replies = [{ id: REPLY, post_id: null, user_id: ANNA, body: "A sample", status: "held" }];
  w.tables.community_text_holds = [{ id: HOLD, post_id: null, reply_id: REPLY, reason: "spam", detail: DANGER_HOLD_DETAIL, hits: 1, status: "pending" }];
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("the care note's switch", () => {
  const on = /export const CARE_NOTE_SEND: boolean = (true|false);/.exec(read("lib/campaigns/careOn.ts"))?.[1];

  it("is one constant, read before anything is asked of the database", () => {
    expect(on === "true" || on === "false").toBe(true);
    expect(String(CARE_NOTE_SEND)).toBe(on);
    const body = /export async function sendCareNote\([\s\S]*?\n\}/.exec(read("lib/campaigns/careSend.ts"))?.[0] ?? "";
    expect(body).toMatch(/\{\n  if \(!CARE_NOTE_SEND\) return refuse\(404, "Not found\."\);/);
  });

  it("is on only with the note's SQL among the migrations, and off without it", () => {
    // The two move together, in one commit: the file that lets the database take the note, and the switch.
    const there = careMigration();
    expect(there.length).toBeLessThanOrEqual(1);
    expect(on, there.length ? `the migration ${there[0]} is in, so the switch is turned on with it` : "no care note migration yet, so the switch stays off").toBe(there.length === 1 ? "true" : "false");
  });

  it("and the SQL is in one place at a time: waiting for his sign-off, or among the migrations", () => {
    const waiting = existsSync(join(process.cwd(), "docs/1.9-build/sql/care-note.sql"));
    // Before his yes it waits in docs; once moved, the migration is the record and the switch is on.
    expect(waiting || careMigration().length === 1).toBe(true);
  });

  it("is said to the screens by the server, in the queue, and by nothing else", () => {
    const route = read("app/api/community/moderation/route.ts");
    expect(route).toContain("...(CARE_NOTE_SEND ? { care: true } : {})");
    expect(route.match(/CARE_NOTE_SEND/g)).toHaveLength(2);
  });
});

describe.runIf(!CARE_NOTE_SEND)("while it is off", () => {
  it("sending is not an action at all: nothing is read, nothing is written, whoever asks and whatever the words", async () => {
    const before = structuredClone(w.tables);
    expect(await sendCareNote(db(), MOD, { kind: "campaign", id: CAMPAIGN })).toEqual({ ok: false, status: 404, error: "Not found." });
    expect(await sendCareNote(db(), MOD, { kind: "hold", id: HOLD })).toEqual({ ok: false, status: 404, error: "Not found." });
    expect(await runCampaignModAction(db(), MOD, "care_note_for_campaign", CAMPAIGN)).toEqual({ ok: false, status: 404, error: "Not found." });
    expect(await runCampaignModAction(db(), MOD, "care_note_for_hold", HOLD)).toEqual({ ok: false, status: 404, error: "Not found." });
    expect(w.tables).toEqual(before);
    expect(w.calls.writes).toBe(0);
  });
});
