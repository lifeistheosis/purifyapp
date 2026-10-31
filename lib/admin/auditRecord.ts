/**
 * The record: the Audit log's second view, A's timeline, kept by his pick B
 * on r3-17 (2026-10-30). "One record of who did what, the admin's and
 * Community's moderation together, by day, newest first. Search any name,
 * email, order or word; a switch narrows to Money, Shop, Readers, Community
 * or Releases. A row opens to its detail in words, not only in the CSV."
 *
 * Two logs go in: admin_activity_log (lib/admin/activityLog.ts, every
 * privileged write with who made it) and community_mod_log (the moderators'
 * own, lib/community/moderation.ts). One list comes out, each line said as a
 * sentence and filed under one of the switch's kinds.
 *
 * Pure: rows in, rows out. app/api/admin/activity-log/route.ts reads both.
 */

export type ActivityEntry = {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export type ModLine = {
  id: string;
  actor_name: string;
  actor_email?: string | null;
  action: string;
  target_kind: string | null;
  target_id?: string | null;
  summary: string | null;
  created_at: string;
};

export const KINDS = ["Money", "Shop", "Readers", "Community", "Releases"] as const;
export type Kind = (typeof KINDS)[number] | "Admin";

export type RecordRow = {
  id: string;
  at: string;
  /** "You", another admin's address, a moderator's name, or the system that acted. */
  who: string;
  /** The address behind `who`, when there is one: masked on a stream. */
  email: string | null;
  you: boolean;
  what: string;
  kind: Kind;
  /** The detail in words, one pair a line. */
  detail: [string, string][];
};

/** Which part of the switch an action belongs to, by the start of its name. */
export function kindOf(action: string): Kind {
  const a = action.toLowerCase();
  // A name's first word ends at a dot or an underscore: patch_note_revision
  // is a patch note's, not a patch's.
  const starts = (words: string) => new RegExp(`^(${words})(?=[._]|$)`).test(a);
  if (starts("refund|comp|subscription|entitlement|payout|gift") || /^ambassador\.(pay|auto_payouts)$/.test(a)) return "Money";
  if (starts("shop|order|product|store|seller|eikon|box|sourcing|catalogue")) return "Shop";
  if (starts("user|verification|badge|account|profile")) return "Readers";
  if (starts("community|ambassador|kitchen|recipe|campaign|moderation")) return "Community";
  if (starts("patch_note_revision|patch_note|board_message|drop|push|email|release")) return "Releases";
  return "Admin";
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);

const money = (v: unknown): string | null => {
  const n = typeof v === "number" ? v : Number.NaN;
  return Number.isFinite(n) ? `$${(n / 100).toFixed(2)}` : null;
};

/** One readable line for an admin action. Known actions in words; the rest by their own name. */
export function sentenceOf(e: Pick<ActivityEntry, "action" | "entity_type" | "entity_id" | "detail">): string {
  const d = e.detail ?? {};
  const id = e.entity_id ?? "";
  switch (e.action) {
    case "comp.grant":
      return `Gave Plus${str(d.months) ? ` for ${str(d.months)} months` : ""}${str(d.email) ? ` to ${str(d.email)}` : ""}`;
    case "refund.approve":
      return `Refunded ${id ? `order ${id}` : "an order"}${money(d.amountCents ?? d.amount_cents) ? `, ${money(d.amountCents ?? d.amount_cents)}` : ""}`;
    case "refund.release":
      return `Released a refund${id ? ` on ${id}` : ""}`;
    case "saint.complete":
      return `Marked ${id} complete`;
    case "saint.reopen":
      return `Reopened ${id}`;
    case "saint.registry":
      return `Put ${id} back on the registry's word`;
    case "ambassador.pay":
      return "Paid an ambassador";
    case "ambassador.invite":
      return `Invited an ambassador${id ? `, ${id}` : ""}`;
    case "ambassador.auto_payouts":
      return d.on === true ? "Turned monthly ambassador payouts on" : "Turned monthly ambassador payouts off";
    case "patch_note_revision.accept":
      return "Accepted a change to a release note";
    case "patch_note_revision.deny":
      return "Denied a change to a release note";
    case "patch_note_revision.suggest":
      return "Sent a release note back to Claude with a rewrite";
    case "patch_note_revision.propose":
      return "A change to a release note was proposed";
    case "patch_note.delete":
      return `Deleted the ${id || "a"} release note`;
    case "board_message.delete":
      return "Deleted a board message";
    case "email.campaign_send":
      return "Sent an email to readers";
    case "email.terms_notice":
      return "Sent the terms notice";
    case "email.lifecycle_run":
      return "Ran the daily account email";
    case "user.verification":
      return `Decided a blue check request${id ? ` (${id})` : ""}`;
    case "shop.reconcile":
      return "Reconciled the shop's orders with Stripe";
    case "shop.webhook":
      return `Stripe: ${str(d.event) ?? "an event"}${id ? ` on ${id}` : ""}`;
    default: {
      const verb = e.action.replace(/[._]/g, " ");
      return `${verb.charAt(0).toUpperCase()}${verb.slice(1)}${id ? `, ${e.entity_type} ${id}` : ""}`;
    }
  }
}

/** A moderation log line as a sentence: "Removed a reply: Reader A: the words". */
export function modSentence(l: Pick<ModLine, "action" | "summary">): string {
  const verb = l.action.replace(/_/g, " ");
  const said = `${verb.charAt(0).toUpperCase()}${verb.slice(1)}`;
  return l.summary ? `${said}: ${l.summary}` : said;
}

function detailWords(e: ActivityEntry): [string, string][] {
  const out: [string, string][] = [];
  if (e.entity_id) out.push([e.entity_type.replace(/_/g, " "), e.entity_id]);
  for (const [k, v] of Object.entries(e.detail ?? {})) {
    if (v === null || v === undefined || v === "") continue;
    out.push([k.replace(/_/g, " "), typeof v === "object" ? JSON.stringify(v) : String(v)]);
  }
  return out;
}

/** The two logs as one record, newest first. `me` is the signed-in admin's address. */
export function buildRecord(entries: readonly ActivityEntry[], mod: readonly ModLine[], me: string | null): RecordRow[] {
  const mine = (email: string | null | undefined) => Boolean(me && email && email.toLowerCase() === me.toLowerCase());
  const rows: RecordRow[] = [
    ...entries.map((e) => {
      const system = !e.actor_email && /webhook/.test(e.action) ? (e.action.startsWith("shop.") || e.action.startsWith("gift.") ? "Stripe" : "The server") : null;
      return {
        id: `a:${e.id}`,
        at: e.created_at,
        who: mine(e.actor_email) ? "You" : (e.actor_email ?? system ?? "Unknown"),
        email: e.actor_email,
        you: mine(e.actor_email),
        what: sentenceOf(e),
        kind: kindOf(e.action),
        detail: detailWords(e),
      };
    }),
    ...mod.map((l) => ({
      id: `m:${l.id}`,
      at: l.created_at,
      who: mine(l.actor_email) ? "You" : l.actor_name,
      email: l.actor_email ?? null,
      you: mine(l.actor_email),
      what: modSentence(l),
      kind: "Community" as const,
      detail: [
        ["action", l.action.replace(/_/g, " ")],
        ...(l.target_kind ? ([["on", l.target_kind]] as [string, string][]) : []),
        ...(l.summary ? ([["what", l.summary]] as [string, string][]) : []),
        ...(l.actor_email ? ([["by", `${l.actor_name}, ${l.actor_email}`]] as [string, string][]) : []),
      ] as [string, string][],
    })),
  ];
  return rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id.localeCompare(b.id)));
}

/** Any name, email, order or word, and one kind or all. */
export function filterRecord(rows: readonly RecordRow[], query: string, kind: Kind | "All"): RecordRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (kind !== "All" && r.kind !== kind) return false;
    if (!q) return true;
    const hay = [r.who, r.email ?? "", r.what, r.kind, ...r.detail.flat()].join(" ").toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  });
}

/** The day a row belongs to, said the way a person says it. */
export function dayLabel(iso: string, now: Date): string {
  const at = new Date(iso);
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (key(at) === key(now)) return "Today";
  if (key(at) === key(yesterday)) return "Yesterday";
  return at.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** The rows by day, newest day first, in their order. */
export function byDay(rows: readonly RecordRow[], now: Date): { day: string; rows: RecordRow[] }[] {
  const out: { day: string; rows: RecordRow[] }[] = [];
  for (const r of rows) {
    const day = dayLabel(r.at, now);
    const last = out[out.length - 1];
    if (last && last.day === day) last.rows.push(r);
    else out.push({ day, rows: [r] });
  }
  return out;
}
