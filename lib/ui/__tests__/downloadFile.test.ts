// A file downloaded in a browser keeps its link a minute (lib/ui/downloadFile.ts):
// Safari begins the download after the click returns, and a link let go at
// once fails it with nothing said. Every download on the website goes through
// the one helper, so none lets go early again.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KEEP_LINK_MS, downloadFile } from "@/lib/ui/downloadFile";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");

let revoked: string[];
let clicked: { href: string; download: string }[];

beforeEach(() => {
  vi.useFakeTimers();
  revoked = [];
  clicked = [];
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:purify/1",
    revokeObjectURL: (u: string) => revoked.push(u),
  });
  vi.stubGlobal("document", {
    createElement: () => {
      const link = {
        href: "",
        download: "",
        click: () => clicked.push({ href: link.href, download: link.download }),
        remove: () => {},
      };
      return link;
    },
    body: { appendChild: () => {} },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a downloaded file", () => {
  it("is clicked with its name, and its link let go a minute later, not at once", () => {
    expect(downloadFile(new Blob(["{}"]), "purify-library-2026-11-07.json")).toBe(true);
    expect(clicked).toEqual([{ href: "blob:purify/1", download: "purify-library-2026-11-07.json" }]);
    expect(revoked).toEqual([]);
    vi.advanceTimersByTime(KEEP_LINK_MS - 1);
    expect(revoked).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(revoked).toEqual(["blob:purify/1"]);
  });

  it("says so when the click cannot be made", () => {
    vi.stubGlobal("URL", {
      createObjectURL: () => {
        throw new Error("no blobs here");
      },
      revokeObjectURL: () => {},
    });
    expect(downloadFile(new Blob(["{}"]), "x.json")).toBe(false);
  });
});

describe("every download on the website", () => {
  it("goes through the one helper, and none lets its link go at once", () => {
    for (const file of [
      "components/account/ExportLibrary.tsx",
      "components/profile/ProfileData.tsx",
      "lib/admin/csv.ts",
      "lib/share/shareImage.ts",
    ]) {
      const src = read(file);
      expect(src, file).toContain('from "@/lib/ui/downloadFile"');
      expect(src, file).not.toMatch(/URL\.revokeObjectURL\(/);
    }
  });
});
