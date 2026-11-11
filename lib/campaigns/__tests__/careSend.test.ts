import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, world, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * The care note's one writer (lib/campaigns/careSend.ts), with the note
 * switched ON, as it will run once the database takes its kind
 * (lib/campaigns/careOn.ts; that it ships off is careShips.test.ts).
 *
 * His yes to call 26 (2026-11-11): "the short private safety note, sent only
 * after a moderator has read the words". What this file holds:
 *
 *   the row              exactly what the inbox reads: care, from Purify,
 *                        and not one word the writer wrote;
 *   who it goes to       the writer of what the moderator read, found from
 *                        that row. No account is ever named by a screen;
 *   only marked words    refused for anything the safety line did not mark,
 *                        and for a campaign that no longer waits;
 *   one a day            however many moderators tap, and whichever of the
 *                        writer's words they read;
 *   in the app only      straight into the inbox's table, never through the
 *                        writer that also sends a push;
 *   said plainly         the moderators' log says a note was sent, and
 *                        nothing of what was written.
 *
 * What would go wrong if this broke: a person in distress sent the same note
 * three times; a note "from Purify" aimed at any account a request names;
 * their own hard words quoted back to them, or kept in a log; a lock screen
 * lit with it.
 */

vi.mock("@/lib/campaigns/careOn", () => ({ CARE_NOTE_SEND: true }));

import {
  CARE_ALREADY,
  CARE_FAILED,
  CARE_GONE,
  CARE_LOGGED,
  CARE_NOT_MARKED,
  CARE_WINDOW_MS,
  careNoteRow,
  sendCareNote,
} from "@/lib/campaigns/careSend";
import { __setCampaignsOpening, CAMPAIGNS_OPENING } from "@/lib/campaigns/flags";
import { CAMPAIGN_MOD_ACTIONS } from "@/lib/campaigns/model";
import { runCampaignModAction } from "@/lib/campaigns/moderation";
import { queueInThisBuild } from "@/lib/campaigns/partsHere";
import { DANGER_HOLD_DETAIL } from "@/lib/campaigns/safety";
import { CARE_KIND } from "@/lib/community/careNote";
import en from "@/lib/i18n/messages/en.json";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const TEAM = "55555555-5555-4555-8555-555555555555";
const MOD = { id: TEAM, name: "A moderator", email: "team@example.com", admin: true };
const BADGE = { id: BEN, name: "Ben", email: null, admin: false };
const CAMPAIGN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const HOLD = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const REPLY = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const THREAD = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
// The moment a case runs: a note is stamped by the database when it is written, so "a day" is counted from the real clock.
const NOW = Date.now();
const HOUR = 3_600_000;

// Sample words, written for this file: nobody's.
const TITLE = "Please pray, I do not want to live";
const WORDS = "I cannot see a way through this week.";
const COMMENT = "Some nights I want to die. Pray for me.";

let w: World;
const db = () => client(w) as never;
const notices = () => (w.tables.community_notifications ?? []).map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "id" && key !== "created_at")));
const log = () => w.tables.community_mod_log ?? [];
const campaign = () => w.tables.prayer_campaigns!.find((row) => row.id === CAMPAIGN)!;
const hold = () => w.tables.community_text_holds!.find((row) => row.id === HOLD)!;
const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const THE_ROW = { user_id: ANNA, kind: "care", actor_name: "Purify", excerpt: null, post_id: null, reply_id: null, target_kind: null };

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, BEN, TEAM]);
  w.tables.community_notifications = [];
  w.tables.community_mod_log = [];
  w.tables.prayer_campaigns = [
    {
      id: CAMPAIGN,
      creator_id: ANNA,
      title: TITLE,
      details: WORDS,
      intention: "other",
      for_whom: "living",
      status: "held",
      held_reason: "new; crisis",
      days: 7,
      ends_at: new Date(NOW + 5 * 24 * HOUR).toISOString(),
      creator_name: "Anna",
      mod_cleared_at: null,
    },
  ];
  w.tables.community_post_replies = [{ id: REPLY, post_id: THREAD, user_id: BEN, body: COMMENT, author_name: "Ben", status: "held" }];
  w.tables.community_text_holds = [{ id: HOLD, post_id: null, reply_id: REPLY, reason: "spam", detail: DANGER_HOLD_DETAIL, hits: 1, status: "pending" }];
  __setCampaignsOpening("open");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  __setCampaignsOpening(CAMPAIGNS_OPENING);
  vi.restoreAllMocks();
});

const toCampaign = (now = NOW) => sendCareNote(db(), MOD, { kind: "campaign", id: CAMPAIGN }, now);
const toHold = (now = NOW) => sendCareNote(db(), MOD, { kind: "hold", id: HOLD }, now);

describe("the row", () => {
  it("is exactly what the inbox reads: care, from Purify, and not one word the writer wrote", async () => {
    expect(await toCampaign()).toEqual({ ok: true });
    expect(notices()).toEqual([THE_ROW]);
    expect(CARE_KIND).toBe("care");
  });

  it("is the same for any writer, and carries nothing a caller could set but who it is for", () => {
    expect(careNoteRow(BEN)).toEqual({ ...THE_ROW, user_id: BEN });
    expect(Object.keys(careNoteRow(BEN)).sort()).toEqual(["actor_name", "excerpt", "kind", "post_id", "reply_id", "target_kind", "user_id"]);
    // One argument: the writer. There is no way to hand it words.
    expect(careNoteRow.length).toBe(1);
  });
});

describe("who it goes to", () => {
  it("a waiting campaign's creator, found from the campaign", async () => {
    expect(await toCampaign()).toEqual({ ok: true });
    expect(notices().map((n) => n.user_id)).toEqual([ANNA]);
  });

  it("a held note's writer, found from the hold and then the note", async () => {
    expect(await toHold()).toEqual({ ok: true });
    expect(notices()).toEqual([{ ...THE_ROW, user_id: BEN }]);
  });

  it("never an account a request names: what is asked for is a campaign or a hold, by its own id, and nothing else is read", () => {
    const code = read("lib/campaigns/careSend.ts");
    expect(code).toContain('export type CareTarget = { kind: "campaign" | "hold"; id: string };');
    expect(code).toContain("export async function sendCareNote(admin: SupabaseClient, actor: ModActor, target: CareTarget, now: number = Date.now()): Promise<ModResult> {");
    // The row's writer comes from one place: what writerOf found.
    expect(code.match(/careNoteRow\(/g)).toHaveLength(2);
    expect(code).toContain("insert(careNoteRow(who.writerId))");
  });

  it("nobody, when what was read is gone", async () => {
    expect(await sendCareNote(db(), MOD, { kind: "campaign", id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9" }, NOW)).toEqual({ ok: false, status: 404, error: CARE_GONE });
    expect(await sendCareNote(db(), MOD, { kind: "hold", id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9" }, NOW)).toEqual({ ok: false, status: 404, error: CARE_GONE });
    // A hold whose note was deleted since.
    w.tables.community_post_replies = [];
    expect(await toHold()).toEqual({ ok: false, status: 404, error: CARE_GONE });
    expect(notices()).toEqual([]);
    expect(log()).toEqual([]);
  });
});

describe("only for words the safety line marked", () => {
  it("not a waiting campaign the line did not mark", async () => {
    for (const reason of ["new", "new; words (2 masked)", "new; money, phone", "reports (3)", null]) {
      Object.assign(campaign(), { held_reason: reason });
      expect(await toCampaign(), String(reason)).toEqual({ ok: false, status: 409, error: CARE_NOT_MARKED });
    }
    expect(notices()).toEqual([]);
  });

  it("not a campaign that no longer waits, even one that still carried the mark", async () => {
    for (const status of ["active", "ended", "removed", "answered"]) {
      Object.assign(campaign(), { status, held_reason: "new; crisis" });
      expect(await toCampaign(), status).toEqual({ ok: false, status: 409, error: CARE_NOT_MARKED });
    }
    expect(notices()).toEqual([]);
  });

  it("not a hold the line did not mark, and not one that holds no note", async () => {
    for (const detail of ["money", "words (1 masked)", "a crisis of faith, in their words", null]) {
      Object.assign(hold(), { detail });
      expect(await toHold(), String(detail)).toEqual({ ok: false, status: 409, error: CARE_NOT_MARKED });
    }
    Object.assign(hold(), { detail: DANGER_HOLD_DETAIL, reply_id: null });
    expect(await toHold()).toEqual({ ok: false, status: 409, error: CARE_NOT_MARKED });
    expect(notices()).toEqual([]);
  });

  it("a hold that carries the mark beside whatever else held it, waiting or decided", async () => {
    Object.assign(hold(), { detail: "crisis; money", status: "resolved" });
    expect(await toHold()).toEqual({ ok: true });
    expect(notices()).toHaveLength(1);
  });
});

describe("one a day for a writer", () => {
  it("a second tap sends nothing more, and says one was sent", async () => {
    expect(await toCampaign()).toEqual({ ok: true });
    const written = w.calls.writes;
    expect(await toCampaign(NOW + HOUR)).toEqual({ ok: false, status: 409, error: CARE_ALREADY });
    expect(await sendCareNote(db(), BADGE, { kind: "campaign", id: CAMPAIGN }, NOW + 2 * HOUR)).toEqual({ ok: false, status: 409, error: CARE_ALREADY });
    expect(notices()).toHaveLength(1);
    expect(log()).toHaveLength(1);
    // And nothing was written and taken back to find that out: a second row, even for a moment, is one the writer's app could show.
    expect(w.calls.writes).toBe(written);
  });

  it("whichever of their words was read: a campaign and a comment by one writer are one writer", async () => {
    w.tables.community_post_replies![0].user_id = ANNA;
    expect(await toCampaign()).toEqual({ ok: true });
    expect(await toHold(NOW + HOUR)).toEqual({ ok: false, status: 409, error: CARE_ALREADY });
    expect(notices()).toHaveLength(1);
  });

  it("another writer the same day is sent theirs", async () => {
    expect(await toCampaign()).toEqual({ ok: true });
    expect(await toHold(NOW + HOUR)).toEqual({ ok: true });
    expect(notices().map((n) => n.user_id).sort()).toEqual([ANNA, BEN]);
  });

  it("and once a day has passed, a moderator may send one again", async () => {
    w.tables.community_notifications = [{ id: "n1", ...THE_ROW, created_at: new Date(NOW - CARE_WINDOW_MS - HOUR).toISOString() }];
    expect(await toCampaign()).toEqual({ ok: true });
    expect(notices()).toHaveLength(2);
    expect(CARE_WINDOW_MS).toBe(24 * HOUR);
  });

  it("one sent within the day counts, to the hour", async () => {
    w.tables.community_notifications = [{ id: "n1", ...THE_ROW, created_at: new Date(NOW - CARE_WINDOW_MS + HOUR).toISOString() }];
    expect(await toCampaign()).toEqual({ ok: false, status: 409, error: CARE_ALREADY });
    expect(notices()).toHaveLength(1);
  });

  it("other notices to that writer are not care notes, and do not stand in its way", async () => {
    w.tables.community_notifications = [
      { id: "n1", user_id: ANNA, kind: "approved", target_kind: "campaign", actor_name: "Purify", excerpt: "x", post_id: null, reply_id: null, created_at: new Date(NOW - HOUR).toISOString() },
    ];
    expect(await toCampaign()).toEqual({ ok: true });
    expect(notices().filter((n) => n.kind === "care")).toHaveLength(1);
  });

  /** A database in which another moderator's note lands between this one's look and its write. */
  function racing(rivalAt: number) {
    const real = client(w);
    let asks = 0;
    return {
      from(table: string) {
        if (table === "community_notifications" && ++asks === 2) {
          w.tables.community_notifications!.push({ id: "00000000-rival", ...THE_ROW, created_at: new Date(rivalAt).toISOString() });
        }
        return real.from(table);
      },
    } as never;
  }

  it("two moderators in the same moment: the note that was not first goes, so the writer has one", async () => {
    // The other's row is stamped before ours (ours is stamped when it is written, which is now).
    const res = await sendCareNote(racing(NOW - 1000), MOD, { kind: "campaign", id: CAMPAIGN }, NOW);
    expect(res).toEqual({ ok: false, status: 409, error: CARE_ALREADY });
    expect(w.tables.community_notifications!.map((n) => n.id)).toEqual(["00000000-rival"]);
    // Ours was not sent, so the log does not say it was.
    expect(log()).toEqual([]);
  });

  it("and the one that was first stays: it is the other's to take back", async () => {
    const res = await sendCareNote(racing(NOW + 60_000), MOD, { kind: "campaign", id: CAMPAIGN }, NOW);
    expect(res).toEqual({ ok: true });
    expect(w.tables.community_notifications).toHaveLength(2);
    expect(log()).toHaveLength(1);
  });

  it("if what was sent cannot be read, nothing is sent", async () => {
    // A database whose first look at the inbox fails, and nothing else of it does: a write would go through.
    const real = client(w);
    let asks = 0;
    const failing: unknown = new Proxy(
      {},
      { get: (_target, key) => (key === "then" ? (resolve: (value: unknown) => void) => resolve({ data: null, error: { message: "boom" } }) : () => failing) },
    );
    const blind = { from: (table: string) => (table === "community_notifications" && ++asks === 1 ? failing : real.from(table)) } as never;
    expect(await sendCareNote(blind, MOD, { kind: "campaign", id: CAMPAIGN }, NOW)).toEqual({ ok: false, status: 503, error: CARE_FAILED });
    // Not sent blind: a second note in a day is worse than a tap that has to be made again.
    expect(notices()).toEqual([]);
    expect(log()).toEqual([]);
    expect(w.calls.writes).toBe(0);
  });
});

describe("never their words, and never loud", () => {
  it("the moderators' log says a note was sent, to what, by whom, and nothing that was written", async () => {
    expect(await toCampaign()).toEqual({ ok: true });
    expect(await toHold()).toEqual({ ok: true });
    expect(log().map((l) => [l.action, l.target_kind, l.target_id, l.actor_name, l.summary])).toEqual([
      ["care_note", "campaign", CAMPAIGN, "A moderator", CARE_LOGGED],
      ["care_note", "hold", HOLD, "A moderator", CARE_LOGGED],
    ]);
    const everything = JSON.stringify([log(), w.tables.community_notifications]);
    for (const theirs of [TITLE, WORDS, COMMENT, "want to die", "not want to live"]) expect(everything, theirs).not.toContain(theirs);
    expect(CARE_LOGGED).not.toMatch(/"|\u201c/);
  });

  it("goes straight into the inbox's table: never through the writer that also sends a push", () => {
    const code = read("lib/campaigns/careSend.ts");
    const imports = code.split("\n").filter((line) => /^import /.test(line)).join("\n");
    expect(imports).not.toMatch(/community\/notify|community\/push|lib\/push|notices/);
    expect(code).not.toMatch(/insertNotifications\(|broadcast\(|sendPush|notifyOf/);
    expect(code.match(/\.from\("community_notifications"\)\.insert\(/g)).toHaveLength(1);
  });

  it("is never sent by anything but a moderator's own action: the two names, and nothing else calls it", () => {
    const callers: string[] = [];
    for (const rel of ["lib/campaigns/moderation.ts", "lib/campaigns/thread.ts", "lib/campaigns/server.ts", "lib/campaigns/safety.ts", "lib/campaigns/upkeep.ts", "lib/community/moderation.ts", "lib/community/autoHide.ts"]) {
      if (/sendCareNote\(/.test(read(rel))) callers.push(rel);
    }
    expect(callers).toEqual(["lib/campaigns/moderation.ts"]);
    const run = read("lib/campaigns/moderation.ts");
    expect(run.match(/sendCareNote\(/g)).toHaveLength(2);
    expect(run).toMatch(/case "care_note_for_campaign":\s*return sendCareNote\(admin, actor, \{ kind: "campaign", id \}\);/);
    expect(run).toMatch(/case "care_note_for_hold":\s*return sendCareNote\(admin, actor, \{ kind: "hold", id \}\);/);
  });

  it("a note that cannot be written fails quietly, says so, and is not logged as sent", async () => {
    w.fail.insert = "community_notifications";
    expect(await toCampaign()).toEqual({ ok: false, status: 503, error: CARE_FAILED });
    expect(notices()).toEqual([]);
    expect(log()).toEqual([]);
  });
});

describe("through the moderators' actions", () => {
  it("both names are a moderator's actions, and each reaches its own kind of thing", async () => {
    expect(CAMPAIGN_MOD_ACTIONS).toContain("care_note_for_campaign");
    expect(CAMPAIGN_MOD_ACTIONS).toContain("care_note_for_hold");
    expect(await runCampaignModAction(db(), MOD, "care_note_for_campaign", CAMPAIGN)).toEqual({ ok: true });
    expect(await runCampaignModAction(db(), MOD, "care_note_for_hold", HOLD)).toEqual({ ok: true });
    expect(notices().map((n) => n.user_id).sort()).toEqual([ANNA, BEN]);
    // A campaign's id is not a hold's, and the other way round.
    expect((await runCampaignModAction(db(), MOD, "care_note_for_hold", CAMPAIGN)).ok).toBe(false);
    expect((await runCampaignModAction(db(), MOD, "care_note_for_campaign", HOLD)).ok).toBe(false);
  });

  it("a reader who holds the Moderator badge may send it, as the team may", async () => {
    expect(await sendCareNote(db(), BADGE, { kind: "hold", id: HOLD }, NOW)).toEqual({ ok: true });
    expect(log().map((l) => l.actor_name)).toEqual(["Ben"]);
  });
});

describe("the screens", () => {
  const button = read("components/campaigns/CareNoteButton.tsx");
  const cards = read("components/campaigns/CampaignModeration.tsx");
  const page = read("components/community/moderation/ModerationClient.tsx");

  it("draw the button only where the server says the note can be sent, and only on words the line marked", () => {
    expect(cards).toContain('{care && why.includes("crisis") ? <CareNoteButton target="campaign" id={c.id} onNotice={onNotice} /> : null}');
    expect(cards).toContain("care={queue.care === true}");
    expect(page).toContain('{care && danger ? <CareNoteButton target="hold" id={hold.id} onNotice={onNotice} /> : null}');
    expect(page).toContain("care={queue.campaigns?.care === true}");
    // No screen decides for itself whether the note is on: none reads the switch.
    for (const screen of [button, cards, page]) expect(screen).not.toMatch(/from "@\/lib\/campaigns\/careOn"|CARE_NOTE_SEND/);
    expect(cards.match(/<CareNoteButton/g)).toHaveLength(1);
    expect(page.match(/<CareNoteButton/g)).toHaveLength(1);
  });

  it("ask first, and send only on the answer", () => {
    expect(button).toContain("onClick={() => setAsking(true)}");
    expect(button).toMatch(/<ConfirmDialog\s+open=\{asking\}\s+title=\{t\("mod\.care\.send"\)\}\s+description=\{t\("mod\.care\.ask"\)\}/);
    expect(button).toContain("onConfirm={() => void send()}");
    // The one place the action is sent from, by the card's own kind and id.
    expect(button.match(/moderateCampaign\(/g)).toHaveLength(1);
    expect(button).toContain('await moderateCampaign(target === "campaign" ? "care_note_for_campaign" : "care_note_for_hold", id);');
  });

  it("say it was sent in place of the button, and what the server said when it was not", () => {
    expect(button).toMatch(/if \(!res\.ok\) \{\s*onNotice\(res\.error \?\? t\("mod\.failed"\)\);\s*return;\s*\}\s*setSent\(true\);/);
    expect(button).toMatch(/\{sent \? \(\s*<p role="status"[^>]*>\s*\{t\("mod\.care\.sent"\)\}/);
    expect(button).toContain("min-h-11");
  });

  it("keep the server's answer when a build's queue is cut down, and never make one up", () => {
    const base = { waiting: [], reports: [], live: true };
    expect(queueInThisBuild({ ...base, care: true }).care).toBe(true);
    expect("care" in queueInThisBuild(base)).toBe(false);
    // The cut-down queue names what it keeps: the answer is among them.
    expect(read("lib/campaigns/partsHere.ts")).toContain("...(queue.care === true ? { care: true } : {})");
  });

  it("have their words in the catalog, plain and with no em dash", () => {
    const words = en as Record<string, string>;
    for (const key of ["mod.care.send", "mod.care.ask", "mod.care.sent"]) {
      expect(words[key], key).toBeTruthy();
      expect(words[key], key).not.toMatch(/[\u2013\u2014]/);
    }
    // The moderator is told what will be sent, and that it quotes nothing.
    expect(words["mod.care.ask"]).toMatch(/quotes nothing they wrote/);
  });
});
