// The sign-in pages have a way back in the apps (1.9; the arbiter's word of
// 2026-11-11 on Fable Theology's finding). They are drawn by their own frame,
// outside the app's, so the apps' back bar never stood over them: an iPhone,
// which has no Back of its own, could leave Sign in only by the Purify mark,
// to Today, with the reader's place lost.
//
// What a reader would notice if this broke: no chevron at the top of Sign in
// on an iPhone; or one that does nothing at the bottom of the history, as a
// link from an email leaves it. scripts/auth-back-walk.mjs walks it on the
// export.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const FRAME = "app/(auth)/layout.tsx";
const BACK = "components/auth/AuthBack.tsx";

describe("the way back out of the sign-in pages", () => {
  it("stands at the start of their frame's head, before the Purify mark", () => {
    const frame = code(FRAME);
    expect(frame).toContain('import { AuthBack } from "@/components/auth/AuthBack";');
    const back = frame.indexOf("<AuthBack />");
    const mark = frame.indexOf('href="/"');
    expect(back).toBeGreaterThan(frame.indexOf("<header"));
    expect(mark).toBeGreaterThan(back);
    // Every page of the group is drawn in this frame, so each has it.
    for (const page of ["signin", "signup", "forgot", "reset", "set-password"]) {
      expect(fs.existsSync(path.join(ROOT, "app/(auth)", page, "page.tsx")), page).toBe(true);
      expect(fs.existsSync(path.join(ROOT, "app/(auth)", page, "layout.tsx")), `${page} has a frame of its own, which would not have the way back`).toBe(false);
    }
  });

  it("is the house's chevron, named Back in the reader's language, a finger's size, mirrored where the page runs right to left", () => {
    const back = code(BACK);
    expect(back).toContain('aria-label={t("nav.back")}');
    expect(back).toContain('<ChevronLeft size={22} className="rtl:-scale-x-100" />');
    expect(back).toMatch(/className="[^"]*\bsize-11\b[^"]*"/);
    expect(back).toContain('type="button"');
    for (const { code: locale } of LOCALES) {
      const words = JSON.parse(read(`lib/i18n/messages/${locale}.json`)) as Record<string, string>;
      expect(words["nav.back"], `${locale}: Back has no name`).toBeTruthy();
    }
  });

  it("goes back the one way every bar does, to where the reader was, with Today as the floor", () => {
    const back = code(BACK);
    expect(back).toContain('import { goBack } from "@/lib/nav/goBack";');
    expect(back).toContain('export const AUTH_BACK_FLOOR = "/";');
    expect(back).toContain("onClick={() => goBack(router, AUTH_BACK_FLOOR)}");
    // Never a plain step back, which does nothing at the bottom of the history, nor a link to Today, which loses the place.
    expect(back).not.toContain("router.back()");
    expect(back).not.toMatch(/<Link\b/);
  });

  it("is drawn only in the apps, as the back bar is: a browser has its own Back", () => {
    const back = code(BACK);
    expect(back).toMatch(/<NativeOnly>\s*<Back \/>\s*<\/NativeOnly>/);
    expect(code("components/layout/AppFrame.tsx")).toMatch(/<NativeOnly>\s*<NativeBackBar \/>/);
  });

  // Found on the way (2026-11-11): the word between the form and Continue with Google was centred by a left
  // offset, which a page that runs right to left counts from its right, so in Arabic and Urdu it left the screen.
  it("keeps the word between the two ways in on the screen, whichever way the page runs", () => {
    for (const form of ["components/auth/SignInForm.tsx", "components/auth/SignUpForm.tsx"]) {
      const src = code(form);
      const at = src.indexOf('{t("notFound.or")}');
      expect(at, form).toBeGreaterThan(0);
      const row = src.slice(src.lastIndexOf("<div", at), at);
      expect(row, form).toContain('data-or-line=""');
      expect(row, form).toContain("flex justify-center");
      expect(row, `${form}: centred by a side again`).not.toMatch(/\b(?:left|right)-1\/2\b|translate-x/);
    }
  });
});
