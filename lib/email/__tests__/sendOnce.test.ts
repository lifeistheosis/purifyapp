import { describe, expect, it } from "vitest";

import type { SendResult } from "../send";
import {
  sendOnce,
  type ClaimResult,
  type EmailLedger,
  type LedgerOutcome,
  type OnceMessage,
  type Sender,
} from "../sendOnce";

/**
 * The promise the whole funnel stands on: one email per key, however many
 * times the trigger fires. An in-memory ledger that follows the same rules as
 * email_sends: a key that is sent or pending is a duplicate; a key that failed
 * or was skipped may be taken again.
 */

type Row = { status: "pending" | LedgerOutcome["status"]; error?: string };

function memoryLedger(opts: { unavailable?: boolean; finishThrows?: boolean } = {}) {
  const rows = new Map<string, Row>();
  const ledger: EmailLedger = {
    async claim(row): Promise<ClaimResult> {
      if (opts.unavailable) throw new Error("email_sends unavailable (42P01): relation does not exist");
      const existing = rows.get(row.dedupeKey);
      if (!existing) {
        rows.set(row.dedupeKey, { status: "pending" });
        return "claimed";
      }
      if (existing.status === "failed" || existing.status === "skipped") {
        rows.set(row.dedupeKey, { status: "pending" });
        return "claimed";
      }
      return "duplicate";
    },
    async finish(key, outcome) {
      if (opts.finishThrows) throw new Error("update failed");
      rows.set(key, { status: outcome.status, error: outcome.error });
    },
  };
  return { ledger, rows };
}

function countingSender(results: SendResult[]) {
  const calls: Parameters<Sender>[0][] = [];
  const send: Sender = async (msg) => {
    calls.push(msg);
    return results[Math.min(calls.length - 1, results.length - 1)];
  };
  return { send, calls };
}

const MSG: OnceMessage = {
  dedupeKey: "payment_failed:user-1:2026-09",
  kind: "payment_failed",
  userId: "user-1",
  to: "reader@example.com",
  subject: "Your Plus renewal did not go through",
  html: "<p>...</p>",
};

describe("sendOnce", () => {
  it("sends the first time and records it", async () => {
    const { ledger, rows } = memoryLedger();
    const { send, calls } = countingSender([{ ok: true }]);
    expect(await sendOnce({ ledger, send }, MSG)).toEqual({ status: "sent" });
    expect(calls).toHaveLength(1);
    expect(rows.get(MSG.dedupeKey)?.status).toBe("sent");
  });

  it("never sends a second copy, however many times the webhook retries", async () => {
    const { ledger } = memoryLedger();
    const { send, calls } = countingSender([{ ok: true }]);
    await sendOnce({ ledger, send }, MSG);
    const retries = await Promise.all([1, 2, 3].map(() => sendOnce({ ledger, send }, MSG)));
    expect(retries.every((r) => r.status === "duplicate")).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it("treats two runs racing on one key as one send", async () => {
    const { ledger } = memoryLedger();
    const { send, calls } = countingSender([{ ok: true }]);
    const [a, b] = await Promise.all([sendOnce({ ledger, send }, MSG), sendOnce({ ledger, send }, MSG)]);
    expect([a.status, b.status].sort()).toEqual(["duplicate", "sent"]);
    expect(calls).toHaveLength(1);
  });

  it("lets a failed send be tried again, and then stops", async () => {
    const { ledger } = memoryLedger();
    const { send, calls } = countingSender([{ ok: false, error: "rate limited" }, { ok: true }]);
    expect(await sendOnce({ ledger, send }, MSG)).toEqual({ status: "failed", error: "rate limited" });
    expect(await sendOnce({ ledger, send }, MSG)).toEqual({ status: "sent" });
    expect(await sendOnce({ ledger, send }, MSG)).toEqual({ status: "duplicate" });
    expect(calls).toHaveLength(2);
  });

  it("does not lose an email that was skipped because email was switched off", async () => {
    // RESEND_API_KEY unset locally, then set: the skipped send must still go.
    const { ledger } = memoryLedger();
    const { send, calls } = countingSender([{ ok: false, skipped: true }, { ok: true }]);
    expect(await sendOnce({ ledger, send }, MSG)).toEqual({ status: "skipped" });
    expect(await sendOnce({ ledger, send }, MSG)).toEqual({ status: "sent" });
    expect(calls).toHaveLength(2);
  });

  it("refuses to send at all when there is no ledger to hold the lock", async () => {
    const { ledger } = memoryLedger({ unavailable: true });
    const { send, calls } = countingSender([{ ok: true }]);
    const r = await sendOnce({ ledger, send }, MSG);
    expect(r.status).toBe("unavailable");
    expect(calls).toHaveLength(0);
  });

  it("reports the send even when recording it fails, and the row still blocks a copy", async () => {
    const { ledger, rows } = memoryLedger({ finishThrows: true });
    const { send, calls } = countingSender([{ ok: true }]);
    expect(await sendOnce({ ledger, send }, MSG)).toEqual({ status: "sent" });
    expect(rows.get(MSG.dedupeKey)?.status).toBe("pending");
    expect(await sendOnce({ ledger, send }, MSG)).toEqual({ status: "duplicate" });
    expect(calls).toHaveLength(1);
  });

  it("passes headers and the text part through to the sender", async () => {
    const { ledger } = memoryLedger();
    const { send, calls } = countingSender([{ ok: true }]);
    await sendOnce(
      { ledger, send },
      { ...MSG, dedupeKey: "k2", text: "plain", headers: { "List-Unsubscribe": "<https://x>" } },
    );
    expect(calls[0].text).toBe("plain");
    expect(calls[0].headers).toEqual({ "List-Unsubscribe": "<https://x>" });
  });
});
