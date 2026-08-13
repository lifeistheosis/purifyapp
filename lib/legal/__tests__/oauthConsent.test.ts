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
    // Matched on the class list rather than on `className="…`: the container
    // became a template literal when the Apple button started being hidden in
    // the Android shell, and the point of this test is the ORDER, not how the
    // attribute happens to be quoted.
    const grid = src.indexOf("grid grid-cols-1");
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

describe("recording: the native path", () => {
  // The callback tests above pass while the app records nothing at all.
  // /api/auth/callback is a REDIRECT target, and the native app never
  // redirects: OAuthButtons calls signInWithIdToken straight from the WebView.
  // So the P0-5b fix landed on web only and Android shipped the hole it was
  // written to close. This suite is the half that was missing.
  const src = read(OAUTH_BUTTONS);

  it("records acceptance after a native ID-token sign-in", () => {
    expect(src).toMatch(/recordNativeSignInAcceptance/);
    const nativeBranch = src.slice(src.indexOf("signInWithIdToken"));
    expect(
      nativeBranch,
      "signInWithIdToken must be followed by an acceptance write",
    ).toMatch(/recordNativeSignInAcceptance\(/);
  });

  it("starts the write before navigating, and does not block on it", () => {
    // This test used to require `await recordNativeSignInAcceptance(...)`
    // followed by window.location.assign. Both halves were wrong, and
    // together they are what Apple rejected 1.0 build 12 for.
    //
    // The hard navigation had to go: Capacitor's iOS router serves
    // basePath + "/index.html" for any extensionless path, so assigning
    // /account/profile handed back the Today page and the reload discarded
    // the session with it.
    //
    // Once navigation is a soft router.push the page is NOT torn down, so an
    // in-flight request survives it, and the await that the old name insisted
    // on becomes pure downside: apiFetch mints a bearer through the cross-tab
    // lock and carries no deadline, so awaiting it parked a reader who was
    // already signed in on "Connecting..." indefinitely. That is F-13.
    //
    // What still matters is that the write is STARTED before we navigate.
    const i = src.indexOf("recordNativeSignInAcceptance(");
    const j = src.indexOf("router.push(");
    expect(i, "the acceptance write must exist").toBeGreaterThan(-1);
    expect(j, "navigation must be a soft push, not a hard assign").toBeGreaterThan(-1);
    expect(i, "the write must be started before navigating").toBeLessThan(j);
    // Started, deliberately not awaited. `void` marks that as intent rather
    // than a forgotten await, which is what the lint rule would otherwise flag.
    expect(src).toMatch(/void recordNativeSignInAcceptance\(/);
  });

  it("never hard-navigates out of the native sign-in branch", () => {
    // The iOS router discards the path on any extensionless hard navigation,
    // so window.location is never a safe way to leave this flow. Guarding the
    // whole file rather than the branch: there is no correct use of it here.
    // Matches a CALL or an assignment, not prose: the comment above the fix
    // names window.location.assign to explain why it is gone, and a bare
    // substring check fails on its own documentation. window.location.origin
    // is untouched, since the web PKCE branch legitimately needs it.
    expect(
      src,
      "window.location.assign/href sends an iOS reader to the Today page",
    ).not.toMatch(/window\.location\.assign\s*\(|window\.location\.href\s*=/);
  });

  it("does not abort a sign-in that already succeeded", () => {
    // Unlike the email path, the account exists by now; throwing would strand
    // a signed-in reader on an error screen AND still not produce the row.
    const writer = read("lib/legal/recordAcceptance.ts");
    const fn = writer.slice(writer.indexOf("export async function recordNativeSignInAcceptance"));
    expect(fn).not.toMatch(/throw\s/);
    // But it must still be logged. An empty catch is how this hid for 572
    // accounts.
    expect(fn).toMatch(/console\.warn/);
  });

  it("writes idempotently, so a returning reader is not locked out", () => {
    // The partial unique index turns every sign-in after the first into a
    // conflict. A plain insert would answer ok:false, and if the caller ever
    // treats that as fatal the record of agreement becomes the thing that
    // blocks signing in.
    const route = read("app/api/legal/accept/route.ts");
    expect(route).toMatch(/onConflict:\s*"user_id,terms_version"/);
    expect(route).toMatch(/ignoreDuplicates:\s*true/);
    // Scoped: checkout acceptances repeat legitimately, one per order.
    expect(route).toMatch(/context === "signup"/);
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
