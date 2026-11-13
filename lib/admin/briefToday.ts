import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { draftCampaign } from "@/lib/email/campaignDrafts";
import { findCampaign, type CampaignKind } from "@/lib/email/campaigns";
import { jobForMailing } from "@/lib/email/jobs";
import { READER_EMAIL_LOOK } from "@/lib/email/look";

import { firstLookKey } from "./autoSends";
import { readBoard } from "./boardRead";
import { boardDraft, type BoardDraft } from "./boardDraft";
import {
  AUTO_PIECES,
  clockLabel,
  clockOf,
  localClock,
  lookWaits,
  parseClock,
  sendTimeAfter,
  type AnnouncedPiece,
  type DeskSettings,
} from "./ownerDesk";
import { briefSent, type DeskState } from "./ownerDeskStore";
import { morningMail, ruleFamily, type BoardTask } from "./planner";

/**
 * Today, as the owner's brief and the desk's panel say it: what needs his hand
 * or his word, the emails due today and whether each goes out by itself, and
 * the board message's draft when the board message is due.
 *
 * One read for both, so the panel and the email cannot disagree about a
 * piece. The figures of yesterday are lib/admin/briefFigures.ts.
 */

export type PieceState =
  /** Goes out by itself at `at` unless he holds it. */
  | "goes"
  /** He held it: it waits for him, on the Email page. */
  | "held"
  /** It is his to send by hand today (`why` says why it does not go by itself). */
  | "by hand"
  /** Nothing honest to send today (`reason`, the draft's own words). */
  | "nothing"
  /** It already went, or is going out. */
  | "gone"
  /** The first-send guard (lib/email/look.ts): at `at` it goes to him alone, in the reader emails' new look, and not to readers. */
  | "first look"
  /** The first-send guard, after his copy went: readers wait until he clears the look on the desk. */
  | "waits for your look";

export type PieceView = {
  ruleKey: string;
  name: string;
  kind: CampaignKind;
  /** The draft's period, the key its send goes out under; null when the draft could not be built. */
  periodKey: string | null;
  /** The draft's subject line, when there is one. */
  subject: string | null;
  state: PieceState;
  /** "12 noon": when a piece that goes by itself goes. */
  at: string | null;
  /** For "by hand" and "nothing": why, in his words. */
  why: string | null;
};

export type TodayPart = {
  /** His date. */
  day: string;
  /** What needs his hand or his word (lib/admin/planner.ts morningMail): a run said once. */
  needs: { text: string; when: string | null }[];
  pieces: PieceView[];
  /** The board message, when it is due today: the draft from the week, waiting for his tap. */
  board: BoardDraft | null;
  /** Set when the board's stored rows could not be read: then nothing goes by itself. */
  boardError: string | null;
};

/**
 * When a piece due today goes by itself, said before the brief has gone:
 * the sends' hour, or two hours after the brief's hour if that is later.
 */
function plannedSend(s: DeskSettings): number {
  return Math.max(parseClock(s.sendAt) as number, (parseClock(s.briefAt) as number) + 120);
}

/**
 * `mode` says who asks. "brief": the brief being made now, so a piece goes
 * HOLD_WINDOW after this moment at the earliest, and the pieces it names are
 * the announcement. "panel": the desk's view at any hour, so a piece the
 * brief has not named yet is said as going after it, and one it did not name
 * is his to send by hand.
 */
export async function readToday(
  admin: SupabaseClient,
  now: Date,
  desk: DeskState,
  mode: "brief" | "panel",
): Promise<TodayPart & { announce: AnnouncedPiece[] }> {
  const clock = localClock(now);
  const board = await readBoard(admin, clock.day);
  const tasks = board.tasks;
  const mail = morningMail(tasks, clock.day);
  const due = (t: BoardTask) => t.status === "open" && t.dueOn === clock.day;

  const announce: AnnouncedPiece[] = [];
  const pieces: PieceView[] = [];
  const briefNamed = desk.announcement && desk.announcement.day === clock.day ? desk.announcement : null;
  // What "goes by itself" means today: to readers, or, while the reader emails
  // wear a look he has not cleared, to him alone first (lib/email/look.ts).
  const going: PieceState = lookWaits(READER_EMAIL_LOOK, desk.look)
    ? (await briefSent(admin, firstLookKey()))?.sent
      ? "waits for your look"
      : "first look"
    : "goes";

  for (const t of tasks) {
    const family = ruleFamily(t.ruleKey);
    const auto = family ? AUTO_PIECES[family] : undefined;
    if (!auto || !t.ruleKey || !due(t)) continue;
    const base = { ruleKey: t.ruleKey, name: auto.name, kind: auto.kind };

    const draft = await draftCampaign(admin, auto.kind, now).catch((e: Error) => e);
    if (draft instanceof Error) {
      pieces.push({ ...base, periodKey: null, subject: null, state: "by hand", at: null, why: `its draft could not be built (${draft.message})` });
      continue;
    }
    const view = { ...base, periodKey: draft.periodKey, subject: draft.body?.subject ?? null };
    const mailing = `${auto.kind}:${draft.periodKey}`;
    const gone = await Promise.all([
      jobForMailing(admin, mailing).catch(() => null),
      findCampaign(admin, auto.kind, draft.periodKey).catch(() => null),
    ]);
    if (gone[0] || gone[1]) {
      pieces.push({ ...view, state: "gone", at: null, why: null });
      continue;
    }
    if (!draft.body) {
      pieces.push({ ...view, state: "nothing", at: null, why: draft.reason ?? "There is nothing to send." });
      continue;
    }
    if (desk.holds[t.ruleKey]) {
      pieces.push({ ...view, state: "held", at: null, why: null });
      continue;
    }
    const byHand = (why: string) => pieces.push({ ...view, state: "by hand", at: null, why });
    if (!desk.ok) {
      byHand("the desk's settings could not be read, so nothing goes by itself today");
      continue;
    }
    if (!desk.settings.autoSend) {
      byHand("sending by itself is off");
      continue;
    }
    if (board.error) {
      byHand("the board could not be read, so nothing goes by itself today");
      continue;
    }

    if (mode === "brief") {
      const at = sendTimeAfter(now, desk.settings);
      if (at === null) {
        byHand("it is too late in the day for it to go by itself");
        continue;
      }
      announce.push({ ruleKey: t.ruleKey, kind: auto.kind, periodKey: draft.periodKey });
      pieces.push({ ...view, state: going, at: clockLabel(clockOf(at)), why: null });
      continue;
    }

    // The panel.
    const named = briefNamed?.pieces.find((p) => p.ruleKey === t.ruleKey);
    if (named && briefNamed) {
      const at = sendTimeAfter(new Date(briefNamed.at), desk.settings);
      if (at === null) byHand("the brief came too late in the day for it to go by itself");
      else pieces.push({ ...view, state: going, at: clockLabel(clockOf(at)), why: null });
      continue;
    }
    if (briefNamed) {
      byHand("this morning's brief did not name it, so it waits for you");
      continue;
    }
    const at = plannedSend(desk.settings);
    if (clock.minutes >= at) byHand("this morning's brief has not gone, so it waits for you");
    else pieces.push({ ...view, state: going, at: clockLabel(clockOf(at)), why: null });
  }

  const boardTask = tasks.find((t) => ruleFamily(t.ruleKey) === "board" && due(t));
  const draft = boardTask ? await boardDraft(admin, now).catch(() => null) : null;

  return {
    day: clock.day,
    needs: mail ? mail.lines.map((l) => ({ text: l.text, when: l.when })) : [],
    pieces,
    board: boardTask ? (draft ?? { text: null, week: null, sources: [] }) : null,
    boardError: board.error,
    announce,
  };
}
