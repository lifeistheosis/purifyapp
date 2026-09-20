/**
 * Turning the send log (email_sends) into mailings: "the terms notice for
 * 2026-08-14", "the welcome", "order receipts", each with who got it and who
 * did not.
 *
 * A row's dedupe key names its mailing. Bulk and account mail is keyed
 * `<mailing>:<user id>`, so everything before the reader's own id is the
 * mailing: `terms:2026-08-14:<id>` belongs to `terms:2026-08-14`,
 * `welcome:<id>` to `welcome`, `claim_closing:<drop>:<id>` to that drop's
 * reminder. Anything else (a receipt keyed by order, a logged send keyed by a
 * random id) groups under its kind.
 *
 * Pure and import-free, so the admin screen can label rows the same way.
 */

export type LedgerRow = {
  dedupe_key: string;
  kind: string;
  user_id: string | null;
  email: string;
  subject: string;
  status: "pending" | "sent" | "skipped" | "failed";
  error?: string | null;
  created_at: string;
  sent_at: string | null;
};

export function mailingKeyOf(row: Pick<LedgerRow, "dedupe_key" | "user_id" | "kind">): string {
  if (row.user_id && row.dedupe_key.endsWith(`:${row.user_id}`)) {
    return row.dedupe_key.slice(0, -(row.user_id.length + 1));
  }
  return row.kind;
}

const KIND_LABEL: Record<string, string> = {
  welcome: "Welcome",
  terms: "Terms change notice",
  terms_changed: "Terms change notice",
  weekly: "Weekly calendar",
  monthly: "Monthly note",
  release: "Release note",
  shop_new: "New in the shop",
  shop_feast: "Feast shop email",
  winback: "A month on (winback)",
  name_day: "Name day",
  plus_ending: "Plus ends in three days",
  plus_ended: "Plus has ended",
  claim_closing: "EIKON claims close soon",
  order_address: "Order needs an address",
  care_guide: "Care guide",
  order_confirmation: "Order receipt",
  order_shipped: "Order shipped",
  back_in_stock: "Back in stock",
  "billing-issue": "Billing problem",
  payment_failed: "Payment failed",
  eikon_drop_open: "EIKON Box is open",
  eikon_claim_confirmed: "EIKON Box claimed",
  eikon_claim_shipped: "EIKON Box shipped",
  ticket_received: "Support ticket received",
  ticket_reply: "Support reply",
  ticket_admin_notice: "New ticket (to admins)",
  seller_application_received: "Seller application received",
  seller_application_declined: "Seller application declined",
  seller_provisioned: "Seller store ready",
  seller_refund_released: "Seller refund released",
  seller_store_review: "Seller store review",
  planner_digest: "Planner reminder (to you)",
};

/** "Terms change notice · 2026-08-14", "Weekly calendar · 2026-W38", "Welcome". */
export function mailingLabel(key: string, kind: string): string {
  const [head, ...rest] = key.split(":");
  const base = KIND_LABEL[head] ?? KIND_LABEL[kind] ?? kind.replace(/[_-]+/g, " ");
  const detail = rest.join(":");
  // A drop id is a uuid: say "this drop" rather than print it.
  if (!detail) return base;
  return /^[0-9a-f-]{36}$/i.test(detail) ? `${base} · one drop` : `${base} · ${detail}`;
}

export type MailingSummary = {
  key: string;
  kind: string;
  label: string;
  subject: string;
  firstAt: string;
  lastAt: string;
  /** Distinct people with a sent copy. */
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
  /** Distinct addresses the mailing was ever attempted for. */
  people: number;
};

/** Group rows into mailings, newest activity first. */
export function summarizeMailings(rows: readonly LedgerRow[]): MailingSummary[] {
  type Acc = MailingSummary & { sentTo: Set<string>; tried: Set<string> };
  const by = new Map<string, Acc>();
  for (const r of rows) {
    const key = mailingKeyOf(r);
    let m = by.get(key);
    if (!m) {
      m = {
        key,
        kind: r.kind,
        label: mailingLabel(key, r.kind),
        subject: r.subject,
        firstAt: r.created_at,
        lastAt: r.created_at,
        sent: 0,
        failed: 0,
        skipped: 0,
        pending: 0,
        people: 0,
        sentTo: new Set(),
        tried: new Set(),
      };
      by.set(key, m);
    }
    if (r.created_at < m.firstAt) m.firstAt = r.created_at;
    if (r.created_at >= m.lastAt) {
      m.lastAt = r.created_at;
      m.subject = r.subject;
    }
    const who = (r.user_id ?? r.email).toLowerCase();
    m.tried.add(who);
    if (r.status === "sent") m.sentTo.add(who);
    else if (r.status === "failed") m.failed += 1;
    else if (r.status === "skipped") m.skipped += 1;
    else m.pending += 1;
  }
  return [...by.values()]
    .map(({ sentTo, tried, ...m }) => ({ ...m, sent: sentTo.size, people: tried.size }))
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0));
}

export type PersonMail = {
  received: number;
  failed: number;
  lastAt: string | null;
  lastSubject: string | null;
};

/**
 * Per person: how many emails reached them, how many failed, and the last one.
 * Keyed by user id, and by lower-cased address for rows logged without one
 * (receipts, support replies), so those still land on the right person.
 */
export function mailByPerson(rows: readonly LedgerRow[]): {
  byUser: Map<string, PersonMail>;
  byEmail: Map<string, PersonMail>;
} {
  const byUser = new Map<string, PersonMail>();
  const byEmail = new Map<string, PersonMail>();
  const bump = (map: Map<string, PersonMail>, key: string, r: LedgerRow) => {
    const p = map.get(key) ?? { received: 0, failed: 0, lastAt: null, lastSubject: null };
    if (r.status === "sent") {
      p.received += 1;
      const at = r.sent_at ?? r.created_at;
      if (!p.lastAt || at > p.lastAt) {
        p.lastAt = at;
        p.lastSubject = r.subject;
      }
    } else if (r.status === "failed") p.failed += 1;
    map.set(key, p);
  };
  for (const r of rows) {
    if (r.user_id) bump(byUser, r.user_id, r);
    else for (const addr of r.email.split(",")) bump(byEmail, addr.trim().toLowerCase(), r);
  }
  return { byUser, byEmail };
}

/** Add two tallies, for a person with rows under both their id and their address. */
export function mergeMail(a: PersonMail | undefined, b: PersonMail | undefined): PersonMail {
  const x = a ?? { received: 0, failed: 0, lastAt: null, lastSubject: null };
  const y = b ?? { received: 0, failed: 0, lastAt: null, lastSubject: null };
  const newer = (x.lastAt ?? "") >= (y.lastAt ?? "") ? x : y;
  return {
    received: x.received + y.received,
    failed: x.failed + y.failed,
    lastAt: newer.lastAt,
    lastSubject: newer.lastSubject,
  };
}
