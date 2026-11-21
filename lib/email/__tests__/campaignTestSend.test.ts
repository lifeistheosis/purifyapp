import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The test send (the owner's word, 2026-11-21: "test send to my email only").
 * A release letter he presses goes to every account at once, so the one way
 * to see it in a real inbox first must never be able to reach anyone else.
 */
const ROOT = path.resolve(__dirname, "../../..");
const route = fs.readFileSync(path.join(ROOT, "app/api/admin/email/campaign/test/route.ts"), "utf8");
const card = fs.readFileSync(path.join(ROOT, "components/admin/email/CampaignCard.tsx"), "utf8");
const code = route.replace(/\/\*[\s\S]*?\*\//g, "");

describe("the test send", () => {
  it("is an admin's alone, and goes to the session's own address, never one the request names", () => {
    expect(code).toMatch(/const adminUser = await getAdminUser\(\);\s*if \(!adminUser\) return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);/);
    expect(code).toContain("const to = adminUser.email?.trim();");
    // The request carries the kind and nothing else: no address, no list of people.
    expect(code).toContain("const Body = z.object({ kind: z.string() });");
    expect(code).not.toMatch(/parsed\.data\.(to|email|address)/);
    expect([...code.matchAll(/^\s+to,$/gm)].length).toBe(1);
  });

  it("starts no campaign and no job, and records no mailing", () => {
    expect(code).not.toMatch(/startCampaign|campaignStart|jobs|recordCampaign|subscribersOf|releaseNewsReaders|allAccounts/);
    expect(code).toContain('sendLoggedEmail("campaign_test"');
  });

  it("says it is a test, and is held for the postal address as every list email is", () => {
    expect(code).toContain("subject: `[Test] ${email.subject}`");
    expect(code.indexOf("postalAddress()")).toBeLessThan(code.indexOf("sendLoggedEmail("));
    expect(code).toContain("rateLimited(`email-campaign-test:${adminUser.id}`");
  });

  it("has its button on the send card, beside the draft, and the card posts only the kind", () => {
    expect(card).toContain("Send a test to me");
    expect(card).toContain('fetch("/api/admin/email/campaign/test"');
    expect(card).toContain("body: JSON.stringify({ kind: preview.kind }),");
  });
});
