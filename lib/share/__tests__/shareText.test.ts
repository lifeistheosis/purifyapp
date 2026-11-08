// Words to the share sheet (lib/share/shareImage.ts, shareText): in the apps
// the Share plugin, since their WebView has no Web Share API; in a browser
// the Web Share API; and a closed sheet is not a failure. The verse strip's
// Share goes through it (1.9): it asked navigator.share itself, which the
// apps do not have, so in the apps Share copied without a word on Android and
// did nothing on an iPhone. The focus that replaced the strip shares the same way.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let native = true;
const shared: unknown[] = [];
let pluginThrows: Error | null = null;

vi.mock("@/lib/platform/native", () => ({ isNativeClient: () => native }));
vi.mock("@capacitor/share", () => ({
  Share: {
    share: async (o: unknown) => {
      if (pluginThrows) throw pluginThrows;
      shared.push(o);
    },
  },
}));

const { shareText } = await import("@/lib/share/shareImage");

beforeEach(() => {
  native = true;
  shared.length = 0;
  pluginThrows = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("words to the share sheet", () => {
  it("in the apps, through the Share plugin, the address with them", async () => {
    expect(await shareText("John 3:16", "“For God so loved the world” John 3:16", "https://purifyapp.net/bible/john/3#v16")).toBe("shared");
    expect(shared).toEqual([
      { title: "John 3:16", text: "“For God so loved the world” John 3:16", url: "https://purifyapp.net/bible/john/3#v16", dialogTitle: "John 3:16" },
    ]);
  });

  it("with no address, none is sent", async () => {
    await shareText("A gathering", "its lines");
    expect(shared).toEqual([{ title: "A gathering", text: "its lines", dialogTitle: "A gathering" }]);
  });

  it("a sheet closed without a choice is not a failure", async () => {
    pluginThrows = new Error("Share canceled");
    expect(await shareText("John 3:16", "words")).toBe("dismissed");
  });

  it("in a browser, the Web Share API, the address with them", async () => {
    native = false;
    const asked: unknown[] = [];
    vi.stubGlobal("navigator", { share: async (o: unknown) => void asked.push(o) });
    expect(await shareText("John 3:16", "words", "https://purifyapp.net/bible/john/3#v16")).toBe("shared");
    expect(asked).toEqual([{ title: "John 3:16", text: "words", url: "https://purifyapp.net/bible/john/3#v16" }]);
    expect(shared).toEqual([]);
  });

  it("with no sheet anywhere, says so, so the page can copy instead", async () => {
    native = false;
    vi.stubGlobal("navigator", {});
    expect(await shareText("John 3:16", "words")).toBe("failed");
  });
});

describe("the verse's Share (the focus, 1.9; the strip before it)", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "../../../components/bible/VerseFocus.tsx"), "utf8");
  const share = src.slice(src.indexOf("async function share()"), src.indexOf("const color = highlight.color"));

  it("goes to the share sheet the apps have, and copies the words and the link only when there is none", () => {
    expect(share).toContain("await shareText(reference, text, link)");
    expect(share).toMatch(/if \(outcome === "failed"\) await copyText\(/);
    expect(share).not.toContain("navigator.share");
    expect(share).not.toContain("navigator.clipboard");
  });
});
