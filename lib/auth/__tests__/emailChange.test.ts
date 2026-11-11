import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A reader could not change their email (the Discord, 2026-10-31: "does not
 * finish after the confirmation, tried several times").
 *
 * What was wrong: Supabase's secure email change sends a link to the old
 * address and one to the new, and changes nothing until both are opened.
 * The card named the new one only. A link opened landed on the profile with
 * the old address still showing, and the Security tab kept the address from
 * the session on the device for up to an hour after a change did finish.
 *
 * What would go wrong if this broke: the reader opens one link, sees nothing
 * change and tries again, and each try makes the last links worthless; or an
 * old link bounces them to the sign-in page with an error.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const verify = vi.hoisted(() => ({ result: { data: { session: null as unknown, user: null }, error: null as unknown } }));

vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "ip" }));
vi.mock("@/lib/legal/serverAcceptance", () => ({ recordSignInAcceptance: async () => {} }));
vi.mock("@/lib/email/accountEvents", () => ({ scheduleWelcome: () => {} }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      verifyOtp: async () => verify.result,
      getUser: async () => ({ data: { user: null } }),
      exchangeCodeForSession: async () => ({ error: null }),
    },
  }),
}));

import { GET } from "@/app/api/auth/callback/route";
import { readEmailChangeState } from "@/components/account/security/EmailChangeState";
import { getMessages } from "@/lib/i18n";

const open = async (query: string) => {
  const res = await GET(new Request(`https://purifyapp.net/api/auth/callback?${query}`) as never);
  return new URL(res.headers.get("location") ?? "").pathname + new URL(res.headers.get("location") ?? "").search;
};

beforeEach(() => {
  verify.result = { data: { session: null, user: null }, error: null };
});

describe("a link in a change-of-email email", () => {
  const LINK = "token_hash=abc&type=email_change&next=/account/profile";

  it("the first of the two: says to open the other", async () => {
    expect(await open(LINK)).toBe("/email/change?state=half");
  });

  it("the second: says it is done", async () => {
    verify.result = { data: { session: { access_token: "t" }, user: null }, error: null };
    expect(await open(LINK)).toBe("/email/change?state=done");
  });

  it("an old or used link: says so, never the sign-in page's error", async () => {
    verify.result = { data: { session: null, user: null }, error: { message: "Email link is invalid or has expired" } };
    expect(await open(LINK)).toBe("/email/change?state=expired");
  });

  it("leaves every other kind of link as it was", async () => {
    verify.result = { data: { session: null, user: null }, error: { message: "bad" } };
    expect(await open("token_hash=abc&type=recovery")).toMatch(/^\/signin\?error=/);
  });
});

describe("the page it lands on", () => {
  it("takes the callback's state first", () => {
    for (const s of ["done", "half", "expired"] as const) expect(readEmailChangeState(s, "")).toBe(s);
  });

  it("reads Supabase's own page's answer after the #, when the link went through it", () => {
    expect(readEmailChangeState(null, "#message=Confirmation+link+accepted.+Please+proceed+to+confirm+link+sent+to+the+other+email")).toBe("half");
    expect(readEmailChangeState(null, "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid")).toBe("expired");
    expect(readEmailChangeState(null, "#access_token=x&type=email_change")).toBe("done");
    expect(readEmailChangeState("nonsense", "")).toBe("expired");
  });
});

describe("the card and the tab", () => {
  it("asks Supabase to send its own page's reader to the same place", () => {
    expect(read("components/account/security/ChangeEmailCard.tsx")).toMatch(/emailRedirectTo: `\$\{authOrigin\(\)\}\/email\/change`/);
  });

  it("names both addresses when it sends, and the waiting change", () => {
    const en = getMessages("en") as Record<string, string>;
    expect(en["emailChange.sent"]).toContain("{next}");
    expect(en["emailChange.sent"]).toContain("{current}");
    expect(en["emailChange.howItWorks"]).toMatch(/both/);
    expect(en["emailChange.pending"]).toContain("{next}");
  });

  it("the Security tab reads the account's own address, not only the one kept on the device", () => {
    const tab = read("components/account/security/SecurityTabClient.tsx");
    expect(tab).toContain("supabase.auth.getUser()");
    expect(tab).toContain("refreshSession()");
    expect(tab).toContain("pendingEmail: current.new_email ?? null");
  });

  it("is in all 21 languages, with no dash, and keeps the placeholders", () => {
    const KEYS = ["emailChange.howItWorks", "emailChange.sent", "emailChange.pending", "emailChange.done", "emailChange.half", "emailChange.expired", "emailChange.toSecurity"];
    for (const code of ["ar", "bg", "de", "el", "en", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"]) {
      const m = getMessages(code as Parameters<typeof getMessages>[0]) as Record<string, string>;
      for (const k of KEYS) {
        expect(m[k]?.trim().length, `${code} ${k}`).toBeGreaterThan(0);
        expect(m[k], `${code} ${k}`).not.toMatch(/[–—]/);
      }
      expect(m["emailChange.sent"], code).toContain("{next}");
      expect(m["emailChange.sent"], code).toContain("{current}");
      expect(m["emailChange.pending"], code).toContain("{next}");
    }
  });
});
