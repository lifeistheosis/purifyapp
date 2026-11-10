import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { requestKind } from "@/lib/admin/support";
import { LEGAL_EMAIL, SUPPORT_EMAIL } from "@/lib/legal/entity";

import { inboxOf, isLegalSubject, LEGAL_MARK, legalSubject } from "../inbox";

/**
 * Mail to legal@ reaches Messages, marked Legal (his word of 2026-11-10:
 * support@ for technical help, legal@ for legal matters).
 *
 * What would go wrong if this broke: a copyright notice or an arbitration
 * opt-out received by Resend and dropped, since the webhook used to keep only
 * mail to support@; or one filed among the orders because it named one, and
 * its 30 days running out unread.
 */

describe("Purify's two inboxes", () => {
  it("know a message by the address it was sent to, in any form or case", () => {
    expect(inboxOf([SUPPORT_EMAIL])).toBe("support");
    expect(inboxOf([`Purify Support <${SUPPORT_EMAIL.toUpperCase()}>`])).toBe("support");
    expect(inboxOf([` ${LEGAL_EMAIL} `])).toBe("legal");
    expect(inboxOf(["hello@purifyapp.net", "someone@example.com"])).toBeNull();
    expect(inboxOf([])).toBeNull();
  });

  it("call a message sent to both a legal one", () => {
    expect(inboxOf([SUPPORT_EMAIL, LEGAL_EMAIL])).toBe("legal");
  });
});

describe("a legal request", () => {
  it("is marked once at the head of its subject, and kept to the same length as any other", () => {
    expect(legalSubject("DMCA notice")).toBe(`${LEGAL_MARK}DMCA notice`);
    expect(legalSubject(`${LEGAL_MARK}DMCA notice`)).toBe(`${LEGAL_MARK}DMCA notice`);
    expect(legalSubject("legal: opt out")).toBe("legal: opt out");
    expect(legalSubject("   ")).toBe(`${LEGAL_MARK}(no subject)`);
    expect(legalSubject("x".repeat(400))).toHaveLength(200);
  });

  it("is known by its mark, and nothing else is", () => {
    expect(isLegalSubject(legalSubject("Arbitration opt-out"))).toBe(true);
    expect(isLegalSubject("Where is my order?")).toBe(false);
    expect(isLegalSubject("Is this legal?")).toBe(false);
  });

  it("shows as Legal in Messages, even when it names an order or a charge", () => {
    expect(requestKind({ orderId: null, subject: legalSubject("Copyright notice"), body: "" })).toBe("Legal");
    expect(requestKind({ orderId: "o1", subject: legalSubject("About order EIK-5A3E19C0"), body: "" })).toBe("Legal");
    expect(requestKind({ orderId: null, subject: legalSubject("Opt out"), body: "my Plus subscription" })).toBe("Legal");
    expect(requestKind({ orderId: null, subject: "Copyright notice", body: "" })).toBeNull();
  });
});

describe("the webhook", () => {
  it("keeps mail to either inbox, and marks what came to the legal one", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "app/api/email/resend-webhook/route.ts"), "utf8");
    expect(route).toContain("const inbox = inboxOf(event.data.received_for ?? event.data.to ?? []);");
    expect(route).toContain("if (!inbox) return;");
    expect(route).toContain('subject: inbox === "legal" ? legalSubject(subject) : subject');
  });
});
