// The root layout renders ONE client component around every page.
//
// Each client component a server layout renders is named in the page's
// payload on a line of its own, with the list of script files it needs:
// about 350 bytes. The root layout is part of every page, so in the apps'
// export each such line is written 3,832 times (1,916 pages, two files
// each). Twenty-two of them were about 30 MB of the bundle.
//
// So the bridges, hosts and the language provider live in
// components/layout/RootFrame.tsx, and the layout renders that. Adding
// `<SomethingBridge />` straight into app/layout.tsx works, shows no error,
// and costs every page of the export another line. This test is what says
// so: put it in RootFrame.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const code = (file: string) =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** A file's "@/..." imports, as paths from the repository root. */
function imports(file: string): string[] {
  const out: string[] = [];
  for (const m of code(file).matchAll(/(?:^|\n)\s*import\s+(?!type\s)[^;'"]*?from\s*["']@\/([^"']+)["']/g)) {
    for (const ext of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
      const candidate = m[1] + ext;
      if (fs.existsSync(path.join(ROOT, candidate)) && fs.statSync(path.join(ROOT, candidate)).isFile()) {
        out.push(candidate);
        break;
      }
    }
  }
  return out;
}

const isClient = (file: string) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/|\s)*["']use client["']/.test(read(file));

describe("app/layout.tsx", () => {
  it("renders one client component, the frame", () => {
    const clients = imports("app/layout.tsx").filter(isClient);
    expect(
      clients,
      "A client component rendered from the root layout is written into every " +
        "page's payload. Mount it in components/layout/RootFrame.tsx instead.",
    ).toEqual(["components/layout/RootFrame.tsx"]);
  });

  it("draws nothing of its own but the document and its pre-paint scripts", () => {
    const tags = [...code("app/layout.tsx").matchAll(/<([A-Za-z][A-Za-z0-9.]*)[\s>/]/g)].map((m) => m[1]);
    const drawn = [...new Set(tags.filter((t) => !["html", "body", "script"].includes(t)))];
    // Readonly is the layout's props type, written with angle brackets.
    expect(drawn.filter((t) => t !== "Readonly")).toEqual(["RootFrame"]);
  });

  it("hands the frame what only the server knows", () => {
    const layout = code("app/layout.tsx");
    expect(layout).toMatch(/locale=\{localeCode\}/);
    expect(layout).toMatch(/messages=\{messages\}/);
    expect(layout).toMatch(/catechismAvailable=\{bankHasQuestions\(\)\}/);
  });
});

describe("the head an app's page carries", () => {
  // A page's head is written into its payload, twice. The website's tags
  // (description, keywords, canonical, Open Graph, Twitter, the manifest) were
  // about 2.7 KB of that on every page of the export, and nothing inside an
  // app reads one of them.
  const layout = code("app/layout.tsx");

  it("is the website's on the website and a title in the apps", () => {
    expect(layout).toMatch(/export const metadata: Metadata = IS_STATIC_EXPORT \? APP_METADATA : WEBSITE_METADATA;/);
    const app = layout.slice(layout.indexOf("const APP_METADATA"), layout.indexOf("export const metadata"));
    const keys = [...app.matchAll(/^\s*([a-zA-Z]+):/gm)].map((m) => m[1]);
    expect(keys).toEqual(["metadataBase", "title"]);
    // The website keeps all of it.
    const web = layout.slice(layout.indexOf("const WEBSITE_METADATA"), layout.indexOf("const APP_METADATA"));
    for (const key of ["description", "manifest", "keywords", "openGraph", "twitter", "alternates"]) {
      expect(web, key).toMatch(new RegExp(`^\\s*${key}:`, "m"));
    }
  });

  it("is built without the files only a website needs, set aside last", () => {
    // scripts/native-build.mjs recovers a killed build by the POSITION of each
    // entry, so new ones go on the end and nothing above them may move.
    const build = code("scripts/native-build.mjs");
    const list = build.slice(build.indexOf("const STASH_PATHS = ["), build.indexOf("function slot("));
    // One entry to a line: ["app", "(app)", "campaigns", "[id]"],
    const entries = [...list.matchAll(/^\s*\[(".+")\],\s*$/gm)].map((m) =>
      [...m[1].matchAll(/"([^"]+)"/g)].map((part) => part[1]).join("/"),
    );
    expect(entries.slice(0, 3)).toEqual(["app/api", "app/(app)/campaigns/[id]", "app/(app)/florilegium/[id]"]);
    expect(entries.slice(-5)).toEqual([
      "app/opengraph-image.png",
      "app/opengraph-image.alt.txt",
      "app/sitemap.ts",
      "app/robots.ts",
      "app/llms.txt",
    ]);
    for (const entry of entries.slice(-5)) {
      expect(fs.existsSync(path.join(ROOT, entry)), `${entry} is set aside by the build and is not there`).toBe(true);
    }
  });
});

describe("app/(app)/layout.tsx", () => {
  // The same rule one level down: this layout is over every screen but Today.
  it("renders one client component, the frame", () => {
    expect(imports("app/(app)/layout.tsx").filter(isClient)).toEqual(["components/layout/AppFrame.tsx"]);
    const tags = [...code("app/(app)/layout.tsx").matchAll(/<([A-Za-z][A-Za-z0-9.]*)[\s>/]/g)].map((m) => m[1]);
    expect([...new Set(tags)]).toEqual(["AppFrame"]);
  });
});

describe("components/layout/AppFrame.tsx", () => {
  const frame = code("components/layout/AppFrame.tsx");

  it("is a client component with every part the layout had, each once", () => {
    expect(isClient("components/layout/AppFrame.tsx")).toBe(true);
    for (const name of [
      "AppNav",
      "SyncBridge",
      "GiftBridge",
      "EikonBoxBridge",
      "NativeBackBar",
      "Footer",
      "MobileTabBar",
      "ScrollToTop",
      // The floating ambience button went in 1.7: ambience lives in the
      // reader's settings (components/bible/ReaderSettingsMenu.tsx).
      "InstallPrompt",
    ]) {
      expect(frame.split(`<${name} />`).length - 1, name).toBe(1);
    }
    // The bridges that must outlive this group stay out of it.
    expect(frame).not.toContain("<PrayerSyncBridge />");
    expect(frame).not.toContain("<UpdateBridge />");
  });

  it("keeps the shell marked for focus mode, and the tab bar beside the screen, not around it", () => {
    // Three wrappers carry data-app-chrome: the web header, the web footer and
    // the tab bar; the way back is the fourth, inside <main>.
    expect(frame.split("data-app-chrome").length - 1).toBe(4);
    const main = frame.indexOf("<main data-route-content");
    const closeMain = frame.indexOf("</main>");
    const page = frame.indexOf("{children}");
    expect(main).toBeGreaterThan(-1);
    expect(page).toBeGreaterThan(main);
    expect(page).toBeLessThan(closeMain);
    expect(frame.indexOf("<NativeBackBar />")).toBeGreaterThan(main);
    expect(frame.indexOf("<NativeBackBar />")).toBeLessThan(page);
    // A sibling of <main>, never inside it: the bar must not fade with the screen.
    expect(frame.indexOf("<MobileTabBar />")).toBeGreaterThan(closeMain);
  });
});

describe("components/layout/RootFrame.tsx", () => {
  const frame = code("components/layout/RootFrame.tsx");

  it("is a client component", () => {
    expect(isClient("components/layout/RootFrame.tsx")).toBe(true);
  });

  it("mounts every bridge and host the root had, each once", () => {
    for (const name of [
      "AppThemeController",
      "LocaleBootstrap",
      "RouteExitBridge",
      "ScrollResetBridge",
      "PrayerSyncBridge",
      "PushHealBridge",
      "ProfilePrefsBridge",
      "UpdateBridge",
      "DesktopPresenceBridge",
      "DiscordFirstRun",
      "InputModality",
      "MotionRoot",
      "NowPlayingBar",
      "StreakSavedHost",
      "CommandPaletteMount",
      "AppNudge",
      "PressToCopy",
      "AnalyticsTracker",
      "NativeBridge",
      "ShortcutListener",
    ]) {
      expect(frame.split(`<${name} />`).length - 1, name).toBe(1);
    }
    expect(frame).toContain("<FirstRunGate catechismAvailable={catechismAvailable} />");
  });

  it("keeps the page inside the language provider, between the bridges and the hosts", () => {
    const open = frame.indexOf("<MessagesProvider");
    const page = frame.indexOf("{children}");
    const close = frame.indexOf("</MessagesProvider>");
    expect(open).toBeGreaterThan(-1);
    expect(page).toBeGreaterThan(open);
    expect(close).toBeGreaterThan(page);
    // The order the layout had: what must run before a page, then the page,
    // then what sits over it.
    expect(frame.indexOf("<LocaleBootstrap />")).toBeLessThan(page);
    expect(frame.indexOf("<MotionRoot />")).toBeLessThan(page);
    expect(frame.indexOf("<NowPlayingBar />")).toBeGreaterThan(page);
    expect(frame.indexOf("<PressToCopy />")).toBeLessThan(close);
    // The three that do not speak sit outside the provider, as before.
    expect(frame.indexOf("<NativeBridge />")).toBeGreaterThan(close);
  });
});

// A chapter of the Bible is the page there are most of: 1,362 of the export's
// 1,916. It drew twenty-six client components straight from the page, 15 KB
// of each chapter's 51. They are in components/bible/ChapterScreen.tsx now,
// and the page names the screen and the few things only it can decide.
describe("app/(app)/bible/[book]/[chapter]/page.tsx", () => {
  const PAGE = "app/(app)/bible/[book]/[chapter]/page.tsx";

  it("renders the screen, and only the parts that are the page's to choose", () => {
    const clients = imports(PAGE).filter(isClient).sort();
    expect(
      clients,
      "A client component rendered from the chapter page is written into each " +
        "of 1,362 chapters. Draw it from components/bible/ChapterScreen.tsx.",
    ).toEqual(
      [
        // The verses: one reader in the apps, either on the website.
        "components/bible/ChapterReader.tsx",
        "components/bible/LicensedChapterReader.tsx",
        "components/bible/ChapterScreen.tsx",
        // The Fathers beside the text: fetched in the apps, written into the
        // page on the website.
        "components/bible/LazyStudyRail.tsx",
        "components/bible/StudyRail.tsx",
        // The phone's bar and the two things it holds. A bar is mounted from
        // a page or a layout: lib/nav/__tests__/backBar.test.ts.
        "components/nav/MobileTopBar.tsx",
        "components/bible/ChapterVerseStatus.tsx",
        "components/bible/MobileReaderActions.tsx",
      ].sort(),
    );
  });

  it("draws no markup of its own", () => {
    const tags = [...code(PAGE).matchAll(/<([A-Za-z][A-Za-z0-9.]*)[\s>/]/g)].map((m) => m[1]);
    const drawn = [...new Set(tags)].filter((t) => /^[a-z]/.test(t));
    expect(drawn, "Markup in the page is written into every chapter. It belongs in ChapterScreen.").toEqual([]);
  });

  it("hands the screen its three places", () => {
    const page = code(PAGE);
    expect(page.split("<ChapterScreen").length - 1).toBe(1);
    for (const place of ["topBar={", "reader={", "rail={"]) expect(page, place).toContain(place);
  });
});

describe("components/bible/ChapterScreen.tsx", () => {
  const screen = read("components/bible/ChapterScreen.tsx");

  it("is a client component", () => {
    expect(isClient("components/bible/ChapterScreen.tsx")).toBe(true);
  });

  it("draws every part the page drew, and puts the three places where they were", () => {
    for (const name of [
      "ReaderPrefsProvider",
      "ReaderFocusController",
      "ChapterKeyNav",
      "VerseFocusFlash",
      "ReadingProgressBar",
      "MobileChapterPill",
      "KeepDay",
      "BookChapterSidebar",
      "BookSwitcher",
      "ChapterBookmarkButton",
      "ReaderFocusButton",
      "MobileBookPill",
      "MobileChapterStrip",
      "RestoreTranslation",
      "GreekNumberingNote",
      "ChapterPager",
      "ChapterDiscussions",
      // The computer's translation popover and Reader pill, and the phone's
      // and tablet's translation sheet (1.7). A phone has no Reader pill:
      // the top bar's settings icon does its job.
      "TranslationSwitcher",
      "ReaderSettingsMenu",
      "MobileTranslationPill",
    ]) {
      expect(screen.split(`<${name}`).length - 1, name).toBe(1);
    }
    // Drawn twice each: once in the computer's toolbar, once in the phone's
    // and tablet's row inside the text's column.
    for (const name of ["BibleSearch", "InterlinearToggle"]) {
      expect(screen.split(`<${name}`).length - 1, name).toBe(2);
    }
    const at = (text: string) => screen.indexOf(text);
    expect(at("{topBar}")).toBeGreaterThan(at("<ReaderFocusController />"));
    expect(at("{topBar}")).toBeLessThan(at("<ChapterKeyNav"));
    expect(at("{reader}")).toBeGreaterThan(at('id="chapter-title"'));
    expect(at("{reader}")).toBeLessThan(at("<ChapterPager"));
    expect(at("{rail}")).toBeGreaterThan(at("<ChapterDiscussions"));
  });

  it("does not bring in the pair an app never uses", () => {
    // The page chooses between them, so a chapter in the apps never loads the
    // code of the website's reader for licensed translations or its rail.
    for (const name of ["LicensedChapterReader", "StudyRail", "ChapterReader"]) {
      expect(screen, name).not.toMatch(new RegExp(`import[^;]*\\b${name}\\b`));
    }
  });
});
