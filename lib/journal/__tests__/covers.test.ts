// A page's cover (Plus): only verified artwork, shipped in the apps, credited.

import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ICON_RIGHTS } from "@/lib/saints/iconRights";

import { COVERS, coverById } from "../covers";
import { cleanCover, parsePage, serializePage } from "../page";

describe("a page's cover", () => {
  it("offers only the icons whose rights are verified, never one used with permission", () => {
    expect(COVERS.length).toBeGreaterThan(10);
    for (const c of COVERS) {
      const r = ICON_RIGHTS[c.id];
      expect(r?.status, c.id).toBe("verified");
      expect(c.alt.length, c.id).toBeGreaterThan(20);
      expect(c.credit, c.id).toContain(r.source);
    }
    const permitted = Object.entries(ICON_RIGHTS).filter(([, r]) => r.status === "permission").map(([f]) => f);
    for (const f of permitted) expect(coverById(f)).toBeNull();
  });

  it("every cover ships inside the apps", () => {
    for (const c of COVERS) expect(existsSync(join(process.cwd(), "public", c.src)), c.src).toBe(true);
  });

  it("is kept by its file's name, and nothing that could lead elsewhere", () => {
    const body = serializePage({ title: "T", blocks: [{ type: "text", text: "W" }], cover: COVERS[0].id });
    expect(body).toBe(`# T\n\n[[cover ${COVERS[0].id}]]\n\nW`);
    expect(parsePage(body).cover).toBe(COVERS[0].id);
    expect(cleanCover("../../etc/passwd")).toBeUndefined();
    expect(cleanCover("https://evil.example/x.jpg")).toBeUndefined();
    expect(coverById("not-offered.jpg")).toBeNull();
  });
});
