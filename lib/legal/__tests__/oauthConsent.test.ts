// Every account-creating path must both ASK for the Terms and RECORD them.
//
// Acceptance used to be recorded in exactly two places, SignUpForm and
// OnboardingFlow, both email/password. The OAuth callback recorded nothing,
// so no Google account had ever produced a row. Worse, OnboardingFlow
// rendered <OAuthButtons /> with no consent surface of any kind while the
// checkbox sat inside the email form, so an in-app Google sign-up was never
// shown the Terms at all. 572 of 613 post-feature accounts had no row.
//
// Four things are pinned here, all by reading source, because the failure was
// never a type error or a crash. It was an absence.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const OAUTH_BUTTONS = "components/auth/OAuthButtons.tsx";
const CALLBACK = "app/api/auth/callback/route.ts";
const MIGRATION =
  "supabase/migrations/20260802_terms_acceptance_idempotent.sql";

/** Every file that renders <OAuthButtons ...>, with the props it passes. */
function oauthCallSites(): { file: string; props: string }[] {
  const out: { file: string; props: string }[] = [];
  const stack = ["components", "app"];
  while (stack.length) {
    const cur = stack.pop()!;
    const abs = path.join(ROOT, cur);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = path.posix.join(cur, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__") continue;
        stack.push(rel);
      } else if (entry.name.endsWith(".tsx") && rel !== OAUTH_BUTTONS) {
        const src = read(rel);
        const re = /<OAuthButtons([\s\S]*?)\/?>/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(src))) out.push({ file: rel, props: m[1] });
      }
    }
  }
  return out;
}

describe("asking: the Terms notice", () => {
  it("lives inside OAuthButtons, so a call site cannot forget it", () => {
    const src = read(OAUTH_BUTTONS);
    expect(src).toMatch(/showTermsNotice\s*=\s*true/);
    expect(src).toMatch(/By continuing, you agree/);
    expect(src).toMatch(/href="\/terms"/);
    expect(src).toMatch(/href="\/privacy"/);
  });

  it("is rendered above the provider buttons, not below them", () => {
    // Notice placed after the button is not conspicuous notice.
    const src = read(OAUTH_BUTTONS);
    const notice = src.indexOf("By continuing, you agree");
    const grid = src.indexOf('className="grid grid-cols-1');
    expect(notice).toBeGreaterThan(-1);
    expect(grid).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(grid);
  });

  it("is only suppressed where a clickwrap checkbox already governs", () => {
    const offenders: string[] = [];
    for (const { file, props } of oauthCallSites()) {
      if (!/showTermsNotice\s*=\s*\{?\s*false/.test(props)) continue;
      // Suppressing is allowed only alongside a real checkbox gate.
      const src = read(file);
      const gated =
        /disabled\s*=\s*\{\s*!agreed\s*\}/.test(props) &&
        /type="checkbox"/.test(src);
      if (!gated) {
        offenders.push(
          `${file}: suppresses the notice without a checkbox gating the button`,
        );
      }
    }
    expect(offenders, offenders.join("\n  ")).toEqual([]);
  });

  it("every OAuth call site therefore presents the Terms somehow", () => {
    const sites = oauthCallSites();
    expect(sites.length).toBeGreaterThan(0);
    const silent = sites.filter(({ file, props }) => {
      const suppressed = /showTermsNotice\s*=\s*\{?\s*false/.test(props);
      if (!suppressed) return false; // notice shows by default
      return !/type="checkbox"/.test(read(file));
    });
    expect(silent.map((s) => s.file), "no consent surface").toEqual([]);
  });
});

describe("recording: the callback", () => {
  const src = read(CALLBACK);

  it("records acceptance on the OAuth code path", () => {
    expect(src).toMatch(/recordSignInAcceptance/);
    const codeBranch = src.slice(src.indexOf("exchangeCodeForSession"));
    expect(codeBranch).toMatch(/recordAcceptanceFor\(\)/);
  });

  it("does NOT record for recovery or email_change", () => {
    // Those are not sign-ups and show no notice; a row there would be an
    // agreement that was never offered.
    const guard = /type === "signup" \|\| type === "magiclink" \|\| type === "invite"/;
    expect(src).toMatch(guard);
    expect(src).not.toMatch(/type === "recovery"[\s\S]{0,80}recordAcceptanceFor/);
  });
});

describe("idempotency", () => {
  const sql = read(MIGRATION);

  it("is a partial unique index scoped to signup rows", () => {
    expect(sql).toMatch(/create unique index if not exists/i);
    expect(sql).toMatch(/\(user_id, terms_version\)/);
    // Partial, or a member's second purchase under one Terms version would be
    // rejected: checkout acceptances legitimately repeat, one per order.
    expect(sql).toMatch(/where context = 'signup'/);
    expect(sql).toMatch(/user_id is not null/);
  });

  it("the writer relies on that conflict rather than a read-then-write", () => {
    const writer = read("lib/legal/serverAcceptance.ts");
    expect(writer).toMatch(/onConflict:\s*"user_id,terms_version"/);
    expect(writer).toMatch(/ignoreDuplicates:\s*true/);
  });
});
