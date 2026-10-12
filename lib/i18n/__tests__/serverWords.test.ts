// Words the server writes into a page, and why the apps' screens must not
// have any.
//
// A server component can look a phrase up (`getMessages` and `t(m, key)`)
// and write the string into the page. On the website that is fine: the
// server runs for each request and knows the reader's language. In the apps
// the server ran once, at build time, in English, and what it wrote is in the
// bundle for good. So until 1.6 a phone set to Greek opened Today in Greek
// and found the Discover tab, the reading room, the 404 page and a dozen
// headings in English, though every one of those lines was already
// translated. The cure is the island in components/i18n/T.tsx: the server
// writes the KEY, and the words are looked up on the device.
//
// If the guard below fails, the new lookup is on a screen the apps show.
// Write `<T k="..." />` instead. Only add a file to the list when the apps
// truly never draw it, and say why.

import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { T, withoutTrailing } from "@/components/i18n/T";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";

const ROOT = process.cwd();

/**
 * Server components that may still look words up, each with the reason the
 * apps never show what they write.
 */
const NEVER_DRAWN_IN_THE_APPS: Record<string, string> = {
  "app/page.tsx": "the website's front page, left out of the apps' export (IS_STATIC_EXPORT)",
  "app/(app)/discover/page.tsx": "the computer's twin of Discover, hidden in the apps (native-md-hidden)",
  "app/(app)/reading/page.tsx": "the computer's twin of the reading room, hidden in the apps (native-md-hidden)",
  "app/(app)/account/page.tsx": "the computer's twin of the account page, hidden in the apps (native-md-hidden)",
  "app/(app)/pricing/page.tsx": "pricing wording, which is the owner's and is not touched here",
  "components/i18n/ContentNotYetTranslated.tsx": "the note that a text is not translated yet, kept off phones on purpose",
};

/** The computer's twins: exempt only while they are in fact hidden in the apps. */
const TWINS = ["app/(app)/discover/page.tsx", "app/(app)/reading/page.tsx", "app/(app)/account/page.tsx"];

function sourceFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      out.push(...sourceFiles(rel));
    } else if (/\.tsx$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/** Code only: a comment may talk about `t(m, ...)` as much as it likes. */
function code(file: string): string {
  return fs
    .readFileSync(path.join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("words the server writes into a page", () => {
  const lookups = [...sourceFiles("app"), ...sourceFiles("components")].filter((file) =>
    /\bt\(\s*(m|messages|msgs|dict)\s*,/.test(code(file)),
  );

  it("are on no screen the apps draw", () => {
    const offenders = lookups.filter((file) => !(file in NEVER_DRAWN_IN_THE_APPS));
    expect(
      offenders,
      "These look words up on the server, so in the apps they stay in English " +
        'whatever the phone is set to. Write <T k="..." /> instead ' +
        `(components/i18n/T.tsx):\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("are on no phone screen at all", () => {
    // components/mobile is the apps' own tree: nothing in it is ever hidden
    // from them, so nothing in it may even import the server's catalog.
    const offenders = sourceFiles("components/mobile").filter((file) => /\bgetMessages\b/.test(code(file)));
    expect(offenders).toEqual([]);
  });

  it("keeps no free pass that has gone stale", () => {
    for (const file of Object.keys(NEVER_DRAWN_IN_THE_APPS)) {
      expect(fs.existsSync(path.join(ROOT, file)), `${file} is on the list and does not exist`).toBe(true);
      expect(lookups, `${file} is on the list and looks nothing up any more: take it off`).toContain(file);
    }
    // A twin is exempt because the apps hide it. If that stops being true the
    // exemption is a hole.
    for (const file of TWINS) {
      expect(code(file), `${file} no longer hides its computer tree in the apps`).toContain("native-md-hidden");
    }
  });
});

describe("the island", () => {
  type ProviderProps = Parameters<typeof MessagesProvider>[0];
  const inLanguage = (code: string, node: ReturnType<typeof createElement>) =>
    renderToString(
      createElement(MessagesProvider, { locale: code, messages: getMessages(code) } as ProviderProps, node),
    );

  it("draws the reader's language, not the server's", () => {
    const en = getMessages("en");
    const el = getMessages("el");
    expect(el["discover.tile.saints"]).not.toBe(en["discover.tile.saints"]);
    expect(inLanguage("el", createElement(T, { k: "discover.tile.saints" }))).toContain(el["discover.tile.saints"]);
    expect(inLanguage("en", createElement(T, { k: "discover.tile.saints" }))).toContain(en["discover.tile.saints"]);
  });

  it("leaves a mark off the end, and only off the end", () => {
    expect(withoutTrailing("Explore the interactive timeline →", "→")).toBe("Explore the interactive timeline");
    expect(withoutTrailing("Explore the interactive timeline  →  ", "→")).toBe("Explore the interactive timeline");
    expect(withoutTrailing("The reading room.", ".")).toBe("The reading room");
    expect(withoutTrailing("No mark here", "→")).toBe("No mark here");
    expect(withoutTrailing("An arrow → in the middle", "→")).toBe("An arrow → in the middle");
    expect(withoutTrailing("Unchanged", "")).toBe("Unchanged");
  });

  it("drops what the server's own string surgery dropped, in every language", () => {
    // The two lines Discover used to cut with .replace() on the server. The
    // island has to give every language what that gave it.
    for (const { code } of LOCALES) {
      const m = getMessages(code);
      const arrow = m["study.exploreTheInteractiveTimeline"];
      expect(withoutTrailing(arrow, "→"), `${code}: the timeline line`).toBe(arrow.replace(/\s*→\s*$/, ""));
      const heading = m["reading.h1"];
      expect(withoutTrailing(heading, "."), `${code}: the reading room's heading`).toBe(heading.replace(/\.$/, ""));
    }
  });

  it("draws the cut line in the reader's language too", () => {
    const el = getMessages("el");
    const html = inLanguage("el", createElement(T, { k: "reading.h1", dropTrailing: "." }));
    expect(html).toContain(withoutTrailing(el["reading.h1"], "."));
  });
});

describe("the fallback every page carries", () => {
  // Next writes app/not-found.tsx's output into every page's payload. As
  // markup it was about 1.8 KB, three times a page, on 1,916 pages: some
  // 10 MB of the export. It is one client component now, and a page carries a
  // reference to it. This keeps the markup from drifting back in.
  it("is one client component and no markup of its own", () => {
    const page = code("app/not-found.tsx");
    expect(page).toContain("<NotFoundScreen />");
    expect(page).not.toMatch(/className=/);
    expect(page).not.toMatch(/<(main|div|p|h1|Link)\b/);
    const screen = fs.readFileSync(path.join(ROOT, "components/layout/NotFoundScreen.tsx"), "utf8");
    expect(screen.trimStart().startsWith('"use client"')).toBe(true);
  });

  it("speaks the reader's language", () => {
    const screen = code("components/layout/NotFoundScreen.tsx");
    expect(screen).toContain("useTranslate()");
    const en = getMessages("en");
    const keys = [...screen.matchAll(/\bt\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThanOrEqual(7);
    for (const key of keys) expect(en[key], key).toBeTypeOf("string");
  });
});

describe("the screens that were frozen in English", () => {
  // Read as source: each of these drew server strings until 1.6.
  const FIXED = [
    "components/mobile/DiscoverMobile.tsx",
    "components/mobile/ReadingMobile.tsx",
    "app/not-found.tsx",
    "app/(app)/about/page.tsx",
    "app/(app)/councils/page.tsx",
    "app/(app)/faq/page.tsx",
    "app/(app)/privacy/page.tsx",
    "app/(app)/saints/page.tsx",
    "app/(app)/support/page.tsx",
    "app/(app)/topics/page.tsx",
    "app/(app)/topics/[slug]/page.tsx",
    "app/(app)/whats-new/page.tsx",
    "app/(app)/prayers/morning/page.tsx",
    "app/(app)/prayers/evening/page.tsx",
    "components/saints/MiraclesSection.tsx",
  ];

  it("look nothing up on the server now", () => {
    for (const file of FIXED) {
      expect(code(file), file).not.toMatch(/\bgetMessages\b/);
      expect(code(file), file).not.toMatch(/\bt\(\s*m\s*,/);
    }
  });

  it("use keys that exist", () => {
    const en = getMessages("en");
    for (const file of FIXED) {
      const keys = [...code(file).matchAll(/<T\s+k="([^"]+)"/g), ...code(file).matchAll(/titleKey="([^"]+)"/g)].map((m) => m[1]);
      for (const key of keys) expect(en[key], `${file}: ${key}`).toBeTypeOf("string");
    }
  });
});
