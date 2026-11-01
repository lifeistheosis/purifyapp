// components/native/WidgetBridgeSync.tsx cannot run here: it is a component,
// and it does its work only inside the apps. So these hold what can be held
// from its source: where it is mounted, what it brings into the app's start,
// and when it pushes. The why is in the component's own header.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const SYNC = "components/native/WidgetBridgeSync.tsx";

/** A file's source with its comments taken out, so prose cannot pass for code. */
const code = (file: string) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\s*\}/g, "{}");

/** What a file imports when it loads, as written: not `import type`, not import(). */
function eager(file: string): string[] {
  const out: string[] = [];
  for (const m of code(file).matchAll(/(?:^|[\n;])\s*import\s+([^;'"]*?)\s+from\s*["']([^"']+)["']/g)) {
    const clause = m[1].trim();
    if (/^type\s/.test(clause)) continue;
    const names = clause.match(/\{([\s\S]*)\}/)?.[1].split(",").map((s) => s.trim()).filter(Boolean) ?? [];
    const outside = clause.replace(/\{[\s\S]*\}/, "").replace(/,/g, "").trim();
    if (!outside && names.length > 0 && names.every((n) => /^type\s/.test(n))) continue;
    out.push(m[2]);
  }
  return out;
}

/** What a file loads with import(), when it is called. */
const lazy = (file: string) => [...code(file).matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]);

describe("where the sync is mounted", () => {
  const frame = code("components/layout/RootFrame.tsx");

  it("is the root frame, once, around every page", () => {
    expect(frame.split("<WidgetBridgeSync />").length - 1).toBe(1);
  });

  it("is inside the language provider, because the widgets speak the reader's language", () => {
    const at = frame.indexOf("<WidgetBridgeSync />");
    expect(at).toBeGreaterThan(frame.indexOf("<MessagesProvider"));
    expect(at).toBeLessThan(frame.indexOf("</MessagesProvider>"));
  });

  it("is not in a layout, where every page of the export would name it", () => {
    for (const layout of ["app/layout.tsx", "app/(app)/layout.tsx"]) {
      expect(code(layout), layout).not.toContain("WidgetBridgeSync");
    }
  });
});

describe("what the sync brings into the app's start", () => {
  const LAZY = ["@/lib/widget/state", "@/lib/widget/labels", "@/lib/widget/bridge"];

  it("is none of the widget code, nor the icons' rights record", () => {
    const imports = eager(SYNC);
    expect(imports.length, "the import reader found nothing").toBeGreaterThan(3);
    for (const heavy of [...LAZY, "@/lib/saints/iconRights", "@/lib/saints/saints"]) {
      expect(imports, heavy).not.toContain(heavy);
    }
    expect(imports.filter((i) => i.startsWith("@/data/"))).toEqual([]);
  });

  it("loads them when it first pushes", () => {
    expect(lazy(SYNC)).toEqual(expect.arrayContaining(LAZY));
  });

  it("keeps the tap's address check light, since the shortcut listener loads it at start", () => {
    for (const heavy of ["@/lib/saints/iconRights", "@/lib/saints/saints", "./state", "./labels", "./bridge"]) {
      expect(eager("lib/widget/open.ts"), heavy).not.toContain(heavy);
    }
  });

  it("would see such an import if it came", () => {
    expect(eager("lib/widget/state.ts")).toContain("@/lib/saints/iconRights");
    expect(eager("lib/widget/state.ts")).not.toContain("./bridge");
  });
});

describe("when the sync pushes", () => {
  const sync = code(SYNC);

  it("does nothing in a browser", () => {
    expect(sync).toMatch(/return useIsNative\(\) \? <WidgetSync \/> : null;/);
  });

  it("waits for the app to settle, and for its language, before the first push", () => {
    expect(sync).toMatch(/const SETTLE_MS = \d{4};/);
    expect(sync).toMatch(/window\.setTimeout\(\(\) => \{\s*void whenLanguageSettled\(\)/);
  });

  it("pushes again on a prayer, a calendar setting, and a return to the front", () => {
    expect(sync).toMatch(/addEventListener\(PRAYER_EVENT, /);
    expect(sync).toMatch(/addEventListener\(CALENDAR_STYLE_EVENT, /);
    expect(sync).toMatch(/document\.addEventListener\("visibilitychange", /);
    expect(sync).toMatch(/removeEventListener\(PRAYER_EVENT, /);
    expect(sync).toMatch(/removeEventListener\(CALENDAR_STYLE_EVENT, /);
    expect(sync).toMatch(/document\.removeEventListener\("visibilitychange", /);
  });

  it("pushes again when the streak or the language changes", () => {
    expect(sync).toMatch(/const \{ locale, t, tn \} = useTranslate\(\);/);
    expect(sync).toMatch(/const streak = useStreak\(\);/);
    expect(sync).toMatch(/\}, \[locale, t, tn, streak\]\);/);
  });

  it("asks the server for the patron itself, so no connection is not taken for no saint", () => {
    expect(sync).toContain('apiFetch("/api/profile/patron-saint"');
    expect(sync).not.toContain("patronSlug(");
  });

  it("tells the server's answer whether the app holds a session, so a 401 signed in keeps the saint (note 85)", () => {
    expect(sync).toMatch(/async function askPatron\(signedIn: boolean\)/);
    expect(sync).toContain("readPatronAnswer(res.status, body, signedIn)");
  });
});

describe("a patron saved on this device (note 85)", () => {
  const sync = code(SYNC);

  it("reaches the widget at once, not at the app's next return to the front", () => {
    expect(eager(SYNC)).toContain("@/lib/profile/patronEvent");
    expect(sync).toMatch(/window\.addEventListener\(PATRON_EVENT, onPatron\)/);
    expect(sync).toMatch(/window\.removeEventListener\(PATRON_EVENT, onPatron\)/);
    // What was saved, read as the server's own answer would be.
    expect(sync).toContain("readPatronAnswer(200, saved)");
  });

  it("is not overwritten by an answer the server gave before the save", () => {
    expect(sync).toMatch(/const saves = patronSaves;/);
    expect(sync).toMatch(/if \(saves !== patronSaves\) \{\s*if \(patronStale\) soon\(\);\s*return;\s*\}/);
    expect(sync).toMatch(/patronSaves \+= 1;/);
  });

  it("is announced by both places a reader chooses one, after the server has saved it", () => {
    const picker = code("components/profile/PatronSaintPicker.tsx");
    expect(picker).toMatch(/if \(res\?\.ok\) \{[^}]*announcePatron\(next \|\| null\);/);
    const editor = code("components/community/profile/ProfileEditor.tsx");
    const saved = editor.indexOf("if (!res.ok) return setMessage");
    const told = editor.indexOf("announcePatron(res.profile.patronSaint?.slug ?? null)");
    expect(saved).toBeGreaterThan(0);
    expect(told).toBeGreaterThan(saved);
  });

  it("is a light file, since the root frame loads it", () => {
    expect(eager("lib/profile/patronEvent.ts")).toEqual([]);
  });
});
