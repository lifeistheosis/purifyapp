import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { emailsByUserId } from "@/lib/admin/users";

import {
  LIST_LABEL,
  marketingFooter,
  marketingRefusal,
  unsubscribeHeaders,
  unsubscribePageUrl,
  type MarketingList,
  type MarketingRefusal,
} from "./consent";
import { drain, quotaStopMessage } from "./drain";
import { sendEmailOnce } from "./ledger";
import { subscribersOf, type Subscriber } from "./preferences";
import type { SendOnceResult } from "./sendOnce";
import { buildEmail } from "./templates/build";
import type { MarketingBody } from "./templates/marketingBodies";

export type { MarketingBody } from "./templates/marketingBodies";

/**
 * Sending marketing email, the only way it is sent.
 *
 * Every Phase 1 and Phase 2 send, and the winback, goes through
 * sendMarketingTo(). It resolves the list's subscribers itself rather than
 * taking recipients from a caller, so there is no way to hand it someone who
 * did not opt in; it refuses the whole send without EMAIL_POSTAL_ADDRESS; it
 * gives every message its own unsubscribe link and one-click headers; and each
 * send goes through the send-once ledger like everything else.
 */

export function postalAddress(): string | null {
  const v = process.env.EMAIL_POSTAL_ADDRESS?.trim();
  return v ? v : null;
}

export type MarketingReport = {
  list: MarketingList;
  refused: MarketingRefusal | null;
  subscribers: number;
  /** Subscribers left out by `exclude`, such as the cadence rule. */
  excluded: number;
  /** deferred: left for a later send because Resend's quota ran out (lib/email/drain.ts). */
  counts: Record<SendOnceResult["status"] | "no_address" | "deferred", number>;
  errors: string[];
};

function emptyCounts(): MarketingReport["counts"] {
  return { sent: 0, skipped: 0, failed: 0, duplicate: 0, unavailable: 0, no_address: 0, deferred: 0 };
}

/** One reader's copy: the footer and headers are theirs, the words are shared. */
export function renderMarketing(body: MarketingBody, list: MarketingList, token: string, address: string) {
  const content = buildEmail({
    ...body,
    footer: marketingFooter({ list, postalAddress: address }),
    footerLinks: [
      { label: `Unsubscribe from ${LIST_LABEL[list]}`, href: unsubscribePageUrl(token, list) },
    ],
  });
  return { ...content, headers: unsubscribeHeaders(token, list) };
}

/**
 * Send one body to a list, once per reader per dedupe key.
 *
 * `keyFor` makes each reader's dedupe key, e.g. (id) => `weekly:2026-W38:${id}`.
 * `only` narrows to a subset the caller has already chosen from within the list,
 * such as the lapsed members for a winback; anyone in it who is not subscribed
 * is still dropped here.
 */
export async function sendMarketingTo(
  admin: SupabaseClient,
  opts: {
    list: MarketingList;
    kind: string;
    body: MarketingBody | ((s: Subscriber) => MarketingBody);
    keyFor: (userId: string) => string;
    only?: ReadonlySet<string>;
    /** Subscribers to leave out this time, e.g. the cadence rule's recent readers. */
    exclude?: ReadonlySet<string>;
  },
): Promise<MarketingReport> {
  const report: MarketingReport = {
    list: opts.list,
    refused: null,
    subscribers: 0,
    excluded: 0,
    counts: emptyCounts(),
    errors: [],
  };

  const address = postalAddress();
  if (!address) {
    report.refused = "no_postal_address";
    return report;
  }

  const { subscribers, error } = await subscribersOf(admin, opts.list);
  if (error) {
    report.errors.push(`email_preferences: ${error}`);
    return report;
  }
  const inScope = opts.only ? subscribers.filter((s) => opts.only!.has(s.userId)) : subscribers;
  const chosen = opts.exclude ? inScope.filter((s) => !opts.exclude!.has(s.userId)) : inScope;
  report.subscribers = inScope.length;
  report.excluded = inScope.length - chosen.length;
  if (chosen.length === 0) return report;

  let addresses = new Map<string, string>();
  try {
    addresses = await emailsByUserId(admin, chosen.map((s) => s.userId));
  } catch (e) {
    report.errors.push(`auth users: ${(e as Error).message}`);
    return report;
  }

  const sendable: { s: Subscriber; to: string }[] = [];
  for (const s of chosen) {
    const to = addresses.get(s.userId);
    if (!to) {
      report.counts.no_address += 1;
      continue;
    }
    const refusal = marketingRefusal({ postalAddress: address, consented: true, unsubscribeToken: s.unsubscribeToken });
    if (refusal) {
      report.counts.failed += 1;
      continue;
    }
    sendable.push({ s, to });
  }

  const drained = await drain(sendable, {
    concurrency: 4,
    send: ({ s, to }) => {
      const body = typeof opts.body === "function" ? opts.body(s) : opts.body;
      const email = renderMarketing(body, opts.list, s.unsubscribeToken, address);
      return sendEmailOnce(admin, {
        dedupeKey: opts.keyFor(s.userId),
        kind: opts.kind,
        userId: s.userId,
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: email.headers,
      });
    },
    record: (_, outcome) => {
      report.counts[outcome] += 1;
    },
  });
  const quota = quotaStopMessage(drained);
  if (quota) report.errors.push(quota);
  return report;
}
