import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { JobOrder } from "./audienceOrder";
import { readBudget } from "./budget";
import { draftCampaign } from "./campaignDrafts";
import { findCampaign, type CampaignKind } from "./campaigns";
import { checkEmailCopy } from "./doctrine";
import { campaignExpiry, createJob, jobForMailing, runEmailJob, shareOf, storedAudience } from "./jobs";
import { postalAddress } from "./marketing";
import { bodyLines, type MarketingBody } from "./templates/marketingBodies";
import { explainViolations } from "@/lib/push/doctrine";

/**
 * Starting a list email, in one place: the panel's Send
 * (app/api/admin/email/campaign/route.ts) and the owner's desk, which sends
 * the Sunday email, the monthly note and the feast shop email by themselves
 * (lib/admin/autoSends.ts, his word of 2026-11-13). Both go through every
 * check below, so a send nobody pressed cannot skip one a press would meet.
 *
 * It rebuilds the draft here rather than trusting a preview, and needs the
 * period key the preview (or the morning brief) showed, so a draft that
 * changed underneath (a new week began, a note was edited) cannot go out
 * unseen. A send held for the postal address is NOT recorded, so it can go
 * once the address is set.
 *
 * A send is an email job (lib/email/jobs.ts): the first share goes at once
 * inside the month's bulk budget, in the order asked for, and the heartbeat
 * sends the rest on the hour until the list has it or the email's window
 * closes. Only the release email may reach every account; every other kind
 * reaches the list its readers turned on.
 */

export function campaignBodyText(body: MarketingBody): string {
  return [body.subject, ...bodyLines(body)].join("\n\n");
}

/**
 * The copy rules for one kind. A release email is the published note, and a
 * note names what was built, so the pressure list is not run over it
 * (lib/email/doctrine.ts). Every other kind is held to all of it.
 */
export function campaignCopyViolations(kind: string, body: MarketingBody) {
  return checkEmailCopy({ subject: body.subject, body: campaignBodyText(body) }, { naming: kind === "release" });
}

/** The earlier of two ISO times; `maybe` only counts when it is one. */
function earlier(iso: string, maybe: unknown): string {
  return typeof maybe === "string" && !Number.isNaN(Date.parse(maybe)) && maybe < iso ? maybe : iso;
}

export type StartRun = Awaited<ReturnType<typeof runEmailJob>>;

export type StartResult =
  | { ok: true; periodKey: string; mailingKey: string; jobId: string; run: StartRun }
  | {
      ok: false;
      status: 409 | 422 | 503;
      /** Why, in the panel's words. */
      error: string;
      /** What stopped it: "exists" means it already went or is going, which a repeat should treat as done. */
      code: "draft" | "changed" | "empty" | "words" | "exists" | "address" | "job";
    };

export async function startCampaign(
  admin: SupabaseClient,
  opts: {
    kind: CampaignKind;
    /** The period the preview or the brief showed. */
    periodKey: string;
    order: JobOrder;
    perDay: number | null;
    createdByEmail: string | null;
    now?: Date;
  },
): Promise<StartResult> {
  const { kind } = opts;
  const now = opts.now ?? new Date();

  const draft = await draftCampaign(admin, kind, now).catch((e: Error) => e);
  if (draft instanceof Error) return { ok: false, status: 503, error: draft.message, code: "draft" };
  if (draft.periodKey !== opts.periodKey) {
    return {
      ok: false,
      status: 409,
      error: `This is now the draft for ${draft.periodKey}, not ${opts.periodKey}. Reload and check it again.`,
      code: "changed",
    };
  }
  if (!draft.body) return { ok: false, status: 409, error: draft.reason ?? "Nothing to send.", code: "empty" };

  const violations = campaignCopyViolations(kind, draft.body);
  if (violations.length) {
    return { ok: false, status: 422, error: `The words do not pass: ${explainViolations(violations)}`, code: "words" };
  }

  const mailingKey = `${kind}:${draft.periodKey}`;
  const existing = await jobForMailing(admin, mailingKey).catch(() => null);
  if (existing || (await findCampaign(admin, kind, draft.periodKey).catch(() => null))) {
    return {
      ok: false,
      status: 409,
      error: existing
        ? `The ${kind} email for ${draft.periodKey} is already ${existing.status === "running" ? "going out" : existing.status}.`
        : `The ${kind} email for ${draft.periodKey} already went out.`,
      code: "exists",
    };
  }

  if (!postalAddress()) {
    return {
      ok: false,
      status: 409,
      error: "Held: marketing email needs EMAIL_POSTAL_ADDRESS set on the server first. Nothing was sent.",
      code: "address",
    };
  }

  const body = draft.body;
  let started: Awaited<ReturnType<typeof createJob>>;
  try {
    started = await createJob(admin, {
      kind,
      mailingKey,
      subject: body.subject,
      // Only the release email may go to every account. Everything else is a list.
      audience: storedAudience(draft.list),
      order: opts.order,
      perDay: opts.perDay,
      payload: {
        type: "campaign",
        periodKey: draft.periodKey,
        body,
        bodyText: campaignBodyText(body),
        details: draft.details,
      },
      // A feast email ends on the feast (details.until, lib/email/campaignDrafts.ts)
      // if that comes before the campaign's usual life: told of a feast that
      // has passed, a new subscriber is told something wrong, not late.
      expiresAt: earlier(campaignExpiry(kind, now), draft.details.until),
      createdByEmail: opts.createdByEmail,
    });
  } catch (e) {
    return {
      ok: false,
      status: 503,
      error: `Could not start the send: ${(e as Error).message}. Is supabase/migrations/20260919000000_ops_board.sql applied?`,
      code: "job",
    };
  }

  const budget = await readBudget(admin, now);
  const run = await runEmailJob(admin, started.job, { allowance: shareOf(budget.bulkLeft), now });
  return { ok: true, periodKey: draft.periodKey, mailingKey, jobId: started.job.id, run };
}
