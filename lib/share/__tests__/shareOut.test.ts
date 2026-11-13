// One way to share for the whole app (1.9, build 95 note 24). His word,
// 2026-11-13 about 08:08 UTC, with the player's sheet on his Android phone and
// the phone's clipboard preview at its foot: "the share should open the share
// system not just a copy link button."
//
// Android's web view has no Web Share. Every Share that asked the browser for
// it (the round Share of a saint, a chant, a council, an event, a service, a
// campaign's page; the player's; a campaign's card; the ambassador's link)
// copied in the Android app and never opened the phone's sheet. What holds:
//   no screen asks the browser's share itself: the app's one way does
//   (lib/share/shareOut.ts), and it asks the Share plugin first in the apps
//   copying only where there is no share sheet, and the caller says so
//   a sheet closed without choosing copies nothing
//
// What a reader would notice if this broke: Share on Android putting a link on
// the clipboard with no sheet, as he saw.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let native = true;
const plugin: unknown[] = [];
let pluginThrows: Error | null = null;

vi.mock("@/lib/platform/native", () => ({ isNativeClient: () => native }));
vi.mock("@capacitor/share", () => ({
  Share: {
    share: async (o: unknown) => {
      if (pluginThrows) throw pluginThrows;
      plugin.push(o);
    },
  },
}));

const { shareOut } = await import("@/lib/share/shareOut");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      walk(rel, out);
    } else if (/\.(tsx?|mjs)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const LINK = "https://purifyapp.net/saints/john-chrysostom";

beforeEach(() => {
  native = true;
  plugin.length = 0;
  pluginThrows = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("every Share in the app", () => {
  it("goes by the app's own way: no screen asks the browser's share itself", () => {
    const own = new Set(["lib/share/shareImage.ts"]);
    const asking = ["app", "components", "lib"]
      .flatMap((d) => walk(d))
      .filter((rel) => !own.has(rel))
      .filter((rel) => /\bnavigator\s*\.\s*(?:share|canShare)\b|navigator\.share\?\./.test(code(rel)));
    expect(asking).toEqual([]);
  });

  it("the places that shared a link ask the one way, and say when they copied", () => {
    for (const rel of ["components/ui/ShareButton.tsx", "components/player/PlayerMore.tsx", "components/community/CampaignCard.tsx", "components/shop/ambassador/AmbassadorDashboard.tsx"]) {
      const src = code(rel);
      expect(src, rel).toMatch(/import \{ shareOut \} from "@\/lib\/share\/shareOut"/);
      expect(src, rel).toMatch(/=== "copied"/);
      expect(src, rel).toMatch(/setCopied\(true\)/);
    }
  });

  it("the ambassador's Share is offered in the apps, where the browser's share is not", () => {
    expect(code("components/shop/ambassador/AmbassadorDashboard.tsx")).toMatch(/isNativeClient\(\) \|\| \(typeof navigator !== "undefined" && "share" in navigator\)/);
  });
});

describe("the one way", () => {
  it("in the apps, opens the phone's own sheet by the Share plugin", async () => {
    vi.stubGlobal("navigator", { userAgent: "x" });
    expect(await shareOut({ title: "St. John Chrysostom", url: LINK })).toBe("shared");
    expect(plugin).toEqual([{ title: "St. John Chrysostom", text: "St. John Chrysostom", url: LINK, dialogTitle: "St. John Chrysostom" }]);
  });

  it("in a browser that can share, opens its share sheet", async () => {
    native = false;
    const asked: ShareData[] = [];
    vi.stubGlobal("navigator", { userAgent: "x", share: async (d: ShareData) => void asked.push(d) });
    expect(await shareOut({ title: "Luke 2", text: "Luke 2, read aloud", url: "https://purifyapp.net/bible/luke/2" })).toBe("shared");
    expect(asked).toEqual([{ title: "Luke 2", text: "Luke 2, read aloud", url: "https://purifyapp.net/bible/luke/2" }]);
    expect(plugin).toEqual([]);
  });

  it("copies only where there is no share sheet, the link unless other words are named", async () => {
    native = false;
    const copied: string[] = [];
    vi.stubGlobal("navigator", { userAgent: "x", clipboard: { writeText: async (s: string) => void copied.push(s) } });
    expect(await shareOut({ title: "t", url: LINK })).toBe("copied");
    expect(await shareOut({ title: "t", text: "words", url: LINK, copy: `words\n${LINK}` })).toBe("copied");
    expect(copied).toEqual([LINK, `words\n${LINK}`]);
  });

  it("in the apps, a plugin that cannot answer falls back as a browser does", async () => {
    pluginThrows = new Error("plugin not implemented");
    const copied: string[] = [];
    vi.stubGlobal("navigator", { userAgent: "x", clipboard: { writeText: async (s: string) => void copied.push(s) } });
    expect(await shareOut({ title: "t", url: LINK })).toBe("copied");
    expect(copied).toEqual([LINK]);
  });

  it("copies nothing when the sheet is closed without choosing", async () => {
    pluginThrows = new Error("Share canceled");
    const copied: string[] = [];
    vi.stubGlobal("navigator", { userAgent: "x", clipboard: { writeText: async (s: string) => void copied.push(s) } });
    expect(await shareOut({ title: "t", url: LINK })).toBe("dismissed");
    native = false;
    vi.stubGlobal("navigator", {
      userAgent: "x",
      share: async () => {
        throw Object.assign(new Error("closed"), { name: "AbortError" });
      },
      clipboard: { writeText: async (s: string) => void copied.push(s) },
    });
    expect(await shareOut({ title: "t", url: LINK })).toBe("dismissed");
    expect(copied).toEqual([]);
  });

  it("says it failed when nothing could take it", async () => {
    native = false;
    vi.stubGlobal("navigator", { userAgent: "x", clipboard: { writeText: async () => Promise.reject(new Error("refused")) } });
    expect(await shareOut({ title: "t", url: LINK })).toBe("failed");
  });
});
