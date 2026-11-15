// A reader whose language is not English sees it, in its own faces, from the
// first frame (Updates 80, 1.9).
//
// What a reader would notice if these broke: in the apps, a screen opened
// straight away (a notification, a link) drawn in English and then again in
// their language a moment later, the words moving sideways under them; and
// the words drawn once in a stand-in face and again in their own. Measured on
// the export before the mend: Community's sign-in link in Arabic, "Sign in"
// for about 130 ms, then 20.5px sideways, then 1.4px each way as the Arabic
// faces arrived (docs/handoffs/updates-79.md, step 3).

import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { prerender } from "react-dom/static";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The apps: the static export, on a screen other than Today.
vi.mock("@/lib/platform/buildTarget", () => ({ BUILD_TARGET: "android", IS_STATIC_EXPORT: true }));
const where = vi.hoisted(() => ({ path: "/community/" }));
vi.mock("next/navigation", () => ({ usePathname: () => where.path }));

import { MessagesProvider, useTranslate } from "@/components/i18n/MessagesProvider";
import { facesReady, loadClientLanguage, scriptSample } from "../client";
import { forgetLaunchLanguageForTests, markLanguageSettled } from "../launchLanguage";

const g = globalThis as Record<string, unknown>;
const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

function SignIn() {
  const { t } = useTranslate();
  return createElement("a", { href: "/signin" }, t("community.signIn"));
}

type ProviderProps = Parameters<typeof MessagesProvider>[0];
/** A screen of the apps: the provider, the English it is built in, and Community's sign-in link. */
const screen = () => createElement(MessagesProvider, { locale: "en" } as ProviderProps, createElement(SignIn));

async function html(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

describe("a screen the apps reach before the reader's language is settled", () => {
  beforeEach(() => {
    forgetLaunchLanguageForTests();
    g.window = globalThis;
  });
  afterEach(() => {
    delete g.window;
    forgetLaunchLanguageForTests();
    where.path = "/community/";
  });

  it("draws nothing until the language is settled, so no English word is drawn first", async () => {
    let drawn = false;
    const done = prerender(screen()).then((r) => {
      drawn = true;
      return r;
    });
    await tick();
    expect(drawn).toBe(false);
    markLanguageSettled();
    const { prelude } = await done;
    expect(await html(prelude)).toContain('href="/signin"');
  });

  it("does not hold Today, which carries the launch slate and holds itself", async () => {
    where.path = "/";
    let drawn = false;
    const done = prerender(screen()).then((r) => {
      drawn = true;
      return r;
    });
    await tick();
    expect(drawn).toBe(true);
    await done;
  });

  it("does not hold a screen once the language is settled", async () => {
    markLanguageSettled();
    const { prelude } = await prerender(screen());
    expect(await html(prelude)).toContain("Sign in");
  });
});

describe("a language's words wait for their faces", () => {
  let release: () => void = () => {};
  const asked: Array<[string, string]> = [];
  const stack: Record<string, string> = {
    "--font-dm-sans": "'DM Sans', 'DM Sans Fallback'",
    "--font-noto-sans-arabic": "'Noto Sans Arabic', 'Noto Sans Arabic Fallback'",
    "--font-noto-naskh": "'Noto Naskh Arabic', 'Noto Naskh Arabic Fallback'",
  };

  beforeEach(() => {
    asked.length = 0;
    const faces = new Promise<unknown[]>((resolve) => {
      release = () => resolve([]);
    });
    g.document = {
      documentElement: {},
      fonts: {
        load: (font: string, text: string) => {
          asked.push([font, text]);
          return faces;
        },
      },
    };
    g.getComputedStyle = () => ({ getPropertyValue: (v: string) => stack[v] ?? "" });
  });
  afterEach(() => {
    delete g.document;
    delete g.getComputedStyle;
  });

  it("asks for the faces with the letters the catalog draws, and hands the words over only once they are loaded", async () => {
    let ready: Record<string, string> | null = null;
    const loading = loadClientLanguage("ar").then((m) => {
      ready = m;
    });
    await tick(200);
    expect(ready).toBeNull();
    expect(asked.map(([font]) => font)).toEqual([
      "400 1em 'DM Sans', 'DM Sans Fallback'",
      "400 1em 'Noto Sans Arabic', 'Noto Sans Arabic Fallback'",
      "400 1em 'Noto Naskh Arabic', 'Noto Naskh Arabic Fallback'",
    ]);
    for (const ch of "تسجيل الدخول".replace(" ", "")) expect(asked[0][1]).toContain(ch);
    release();
    await loading;
    expect(ready!["community.signIn"]).toBe("تسجيل الدخول");
  });

  it("asks for nothing in English, whose faces are preloaded", async () => {
    const en = await loadClientLanguage("en");
    expect(en["community.signIn"]).toBe("Sign in");
    expect(asked).toEqual([]);
  });

  it("never holds the words past its own limit", async () => {
    const t0 = Date.now();
    await facesReady({ a: "Русский" }, 40);
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(asked).toHaveLength(3);
  });

  it("samples every letter beyond ASCII once, for any script", () => {
    expect(scriptSample({ a: "Sign in", b: "ქართული", c: "ქა" })).toBe("ქართული".split("").filter((c, i, all) => all.indexOf(c) === i).join(""));
    expect(scriptSample({ a: "Sign in" })).toBe("");
  });
});

describe("the provider", () => {
  it("commits a language only after loadClientLanguage, faces and all", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "components/i18n/MessagesProvider.tsx"), "utf8");
    const load = src.indexOf("await loadClientLanguage(next)");
    expect(load).toBeGreaterThan(-1);
    expect(src.indexOf("setState({ locale: next", load)).toBeGreaterThan(load);
  });
});
