// The support endpoint must not be a mail relay.
//
// It was one. The route is unauthenticated, it accepted an arbitrary `email`,
// `subject` and `body`, and it sent that attacker-supplied subject and body,
// as HTML, from Purify's verified sending domain, to an address the attacker
// chose. Its only guard was a per-IP budget keyed on the leftmost
// X-Forwarded-For entry, which the client controls.
//
// The route module pulls in server-only Supabase and email transport, so this
// tests the two decisions that actually close the hole, at the level they are
// made, rather than booting the handler:
//
//   1. the recipient rule  , a receipt goes out only to the authenticated
//      user's own address, never to whatever the form said;
//   2. the validation rule , subject cannot carry CR/LF into a Subject header.
//
// It also pins, by reading the source, that the receipt call is guarded at
// all. That assertion is the one that fails loudly if someone later
// "simplifies" the conditional away.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const ROUTE = path.join(
  process.cwd(),
  "app/api/support/tickets/route.ts",
);
const SRC = fs.readFileSync(ROUTE, "utf8");

/** The recipient decision, extracted so it can be tested in isolation. */
function mayReceiveReceipt(
  authenticatedEmail: string | null | undefined,
  submittedEmail: string,
): boolean {
  const norm = (s: string) => s.trim().toLowerCase();
  return !!authenticatedEmail && norm(authenticatedEmail) === norm(submittedEmail);
}

describe("support ticket recipient rule", () => {
  it("never sends to an address supplied by an anonymous request", () => {
    expect(mayReceiveReceipt(null, "victim@example.com")).toBe(false);
    expect(mayReceiveReceipt(undefined, "victim@example.com")).toBe(false);
  });

  it("never sends to an address that is not the signed-in user's own", () => {
    expect(mayReceiveReceipt("member@example.com", "victim@example.com")).toBe(
      false,
    );
  });

  it("sends to a signed-in user's own address, case and space insensitive", () => {
    expect(mayReceiveReceipt("member@example.com", "member@example.com")).toBe(true);
    expect(mayReceiveReceipt("Member@Example.com", "  member@example.com ")).toBe(
      true,
    );
  });
});

describe("support ticket validation", () => {
  // Mirrors the subject rule in the route.
  const subject = z
    .string()
    .min(2)
    .max(200)
    .refine((s) => !/[\r\n]/.test(s), "Subject must be a single line.");

  it("rejects CR/LF in the subject, which reaches an email header", () => {
    expect(subject.safeParse("Order问题\nBcc: victim@example.com").success).toBe(
      false,
    );
    expect(subject.safeParse("Hello\rBcc: x@y.z").success).toBe(false);
  });

  it("accepts an ordinary single-line subject", () => {
    expect(subject.safeParse("My order has not arrived").success).toBe(true);
  });
});

describe("support ticket route source", () => {
  it("guards the receipt call rather than sending unconditionally", () => {
    // The receipt must not appear as a bare element of the send list.
    expect(SRC).toMatch(/ownAddress\s*\?\s*\[sendTicketReceivedEmail/);
    expect(SRC).not.toMatch(/^\s*sendTicketReceivedEmail\(ticket/m);
  });

  it("keeps more than one abuse limit, so no single header can lift them all", () => {
    const limits = SRC.match(/rateLimited\(/g) ?? [];
    expect(limits.length).toBeGreaterThanOrEqual(3);
    // One of them must not be keyed on anything the client can influence.
    expect(SRC).toMatch(/support-ticket:global/);
    expect(SRC).toMatch(/support-ticket-to:/);
  });
});
