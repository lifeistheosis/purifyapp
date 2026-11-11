// The sign-in screens, fresh eyes M6 and the pre-build gate's first run
// (docs/1.9-build/notes/fresh-eyes.md, M6; gate-run-1.md, Updates 2's list):
// a typed emoji for "Show password" that stayed on the right in Arabic,
// links 19px tall, a 17px terms box, the owner's own name as the sample
// display name, and a page that moved under the finger when an error line
// appeared. Read as source, as the gate's other mends are
// (lib/ui/__tests__/gateRunOne.test.ts); the walk on the export measures
// the screens (scripts/guardrail-walk.mjs). Each case fails on the code the
// fresh eyes walked.
//
// What would go wrong if this broke: a "Show password" no palette colours,
// on the wrong side in Arabic and Urdu; links and a box a finger misses; a
// stranger's name offered as the reader's own; or Continue with Google and
// a form's own button moving under the finger that pressed them.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { connectionAware } from "@/lib/auth/friendlyError";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
/** The code without its comments, so a note is not read as the page. */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** The class of the element whose opening tag holds `mark` (its tag runs to the next "<", since an arrow function's "=>" is not its end). */
function classOf(src: string, mark: string): string {
  const at = src.indexOf(mark);
  expect(at, mark).toBeGreaterThan(-1);
  const open = src.lastIndexOf("<", at);
  const next = src.indexOf("<", at);
  const tag = src.slice(open, next === -1 ? undefined : next);
  return /className="([^"]*)"/.exec(tag)?.[1] ?? "";
}

describe("the sign-in screens", () => {
  it("show and hide a password with the house's eye, placed with end so it mirrors", () => {
    const src = code("components/auth/PasswordInput.tsx");
    expect(src).not.toMatch(/[\u{1F441}\u{1F648}]/u);
    expect(src).toContain('import { Eye, EyeClosed } from "@/components/ui/icons/Eye";');
    expect(src).toContain("{shown ? <EyeClosed size={20} /> : <Eye size={20} />}");
    const button = classOf(src, "aria-label={shown ?");
    expect(button).toContain("end-2");
    expect(button).not.toMatch(/\bright-\d/);
    expect(src).toContain("ps-4 pe-12");
    expect(src).not.toMatch(/\bpl-4 pr-12\b/);
  });

  it("give every link and button on them a 44px reach", () => {
    const signin = code("components/auth/SignInForm.tsx");
    expect(classOf(signin, 'href="/forgot"')).toContain("min-h-11");
    expect(classOf(signin, 'href="/signup"')).toContain("min-h-11");
    const layout = code("app/(auth)/layout.tsx");
    expect(classOf(layout, 'href="/"')).toContain("min-h-11");
    expect(classOf(layout, 'href="/privacy"')).toMatch(/min-h-11.*min-w-11|min-w-11.*min-h-11/);
    expect(classOf(code("components/auth/ForgotForm.tsx"), 'href="/signin"')).toContain("min-h-11");
    expect(classOf(code("components/auth/SetPasswordForm.tsx"), "onClick={signOut}")).toContain("min-h-11");
    const back = code("components/bible/MultiVerseClient.tsx");
    expect(classOf(back, 'href="/bible"')).toContain("min-h-11");
    expect(back).not.toContain("/> →");
  });

  it("give the terms box a 44 by 44 reach inside its label, and say so to the checker", () => {
    const src = code("components/auth/SignUpForm.tsx");
    const box = src.slice(src.indexOf('type="checkbox"') - 400, src.indexOf('type="checkbox"') + 400);
    expect(box).toContain('<span className="-m-[13px] inline-flex h-11 w-11 shrink-0 items-center justify-center">');
    expect(box).toContain('data-mock-allow="target"');
    expect(box).toMatch(/data-mock-why="[^"]+"/);
  });

  it("offer a plain sample name, nobody's own, in the reader's language", () => {
    const src = code("components/auth/SignUpForm.tsx");
    expect(src).not.toContain('placeholder="Edgar"');
    expect(src).toContain('placeholder={t("campaigns.new.namePlaceholder")}');
  });

  it("say a lost connection in the reader's words, never the browser's (\"Failed to fetch\")", () => {
    const t = (key: string) => key;
    for (const words of ["Failed to fetch", "TypeError: Load failed", "NetworkError when attempting to fetch resource.", "fetch failed"]) {
      expect(connectionAware(words, t), words).toBe("auth.noSignal");
    }
    expect(connectionAware("Invalid login credentials", t)).toBe("Invalid login credentials");
    for (const file of ["SignInForm", "SignUpForm", "ForgotForm", "ResetForm", "SetPasswordForm", "OAuthButtons"]) {
      expect(code(`components/auth/${file}.tsx`), file).toContain("connectionAware(");
    }
    for (const name of fs.readdirSync("lib/i18n/messages").filter((f) => f.endsWith(".json"))) {
      const line = (JSON.parse(read(`lib/i18n/messages/${name}`)) as Record<string, string>)["auth.noSignal"];
      expect(line, name).toBeTruthy();
      expect(line, name).not.toContain("\u2014");
    }
  });

  it("put each form's error under its button, and stand the form from the top on a phone, so nothing moves under the finger", () => {
    for (const file of ["SignInForm", "SignUpForm", "ForgotForm", "ResetForm", "SetPasswordForm"]) {
      const src = code(`components/auth/${file}.tsx`);
      const button = src.indexOf('type="submit"');
      const error = src.indexOf('<p role="alert" className="font-sans text-detail text-crimson-soft">{error}</p>');
      expect(button, file).toBeGreaterThan(-1);
      expect(error, file).toBeGreaterThan(button);
    }
    // Centred, a line appearing under Continue with Google lifted the whole form by half its height.
    const layout = code("app/(auth)/layout.tsx");
    expect(layout).toContain('<main className="flex-1 flex items-start justify-center px-5 py-10 md:items-center">');
  });
});
