// Discover on a computer (2.0). His words, 2026-11-28: "the https://purifyapp.net/discover
// design is outdated", then "push out the discover redesign update". The computer drew a
// row of pills and cards with icons and no pictures, while the phone has the library's
// doors, each with its picture and line. Now the computer draws the phone's own doors.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => createElement("a", { href, ...rest }, children) }));

import { ORDER_KEY, orderPrepaint } from "@/lib/discover/doorOrder";

const read = (...p: string[]) => fs.readFileSync(path.join(process.cwd(), ...p), "utf8");
const PAGE = read("app", "(app)", "discover", "page.tsx");
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const DOORS = [
  { href: "/saints", title: "Saints", line: "The lives of the saints.", picture: "/discover/tiles/saints.webp", focus: "50% 20%" },
  { href: "/reading", title: "Reading room", line: "The Fathers, read whole.", picture: "/discover/tiles/reading.v2.webp" },
  { href: "/parishes", title: "Find a parish", line: "The directories of each jurisdiction.", picture: "/discover/tiles/parishes.v2.webp" },
];

async function grid(): Promise<string> {
  const { DoorGrid } = await import("@/components/discover/DoorGrid");
  return renderToStaticMarkup(createElement(DoorGrid, { doors: DOORS }));
}

describe("Discover on a computer", () => {
  it("draws the phone's own doors, from the one list both share", () => {
    expect(code(PAGE)).toMatch(/<DoorGrid\s+doors=\{discoverEntries\(\)\.map\(\(e\) => \(\{\s*href: e\.href,\s*title: e\.label,\s*line: e\.blurb,\s*picture: e\.picture,\s*focus: e\.focus,\s*badge: e\.badge,/);
    expect(read("components", "mobile", "DiscoverMobile.tsx")).toContain("const entries = discoverEntries();");
  });

  it("gives every door its picture, its name and its line, as a link to its place", async () => {
    const html = await grid();
    expect(html).toContain('data-door-grid=""');
    for (const door of DOORS) {
      expect(html, door.href).toContain(`data-door="${door.href}"`);
      expect(html, door.href).toContain(`href="${door.href}"`);
      expect(html, door.href).toContain(door.title);
      expect(html, door.href).toContain(door.line);
    }
    // Each a picture, as on the phone: the band's picture and its preview at once.
    expect((html.match(/<img\b/g) ?? []).length).toBeGreaterThanOrEqual(DOORS.length);
  });

  it("lays them side by side: one across on a narrow window, two, then three", async () => {
    expect(await grid()).toMatch(/data-door-grid="" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"/);
  });

  it("keeps no row of pills and no icon cards for the library (his floating pills rule, 2026-11-10)", () => {
    const page = code(PAGE);
    expect(page).not.toMatch(/rounded-pill/);
    expect(page).not.toMatch(/ICON_TILE|STUDY_MODES|QUICK/);
    expect(page).not.toMatch(/components\/ui\/icons\//);
  });

  it("takes the reader's own order before the first paint, from the phone's script", () => {
    const added: { textContent: string }[] = [];
    const sandbox = {
      localStorage: { getItem: (k: string) => (k === ORDER_KEY ? JSON.stringify(["/parishes", "/saints", "/reading"]) : null) },
      document: { createElement: () => ({ id: "", textContent: "" }), head: { appendChild: (el: { textContent: string }) => added.push(el) } },
    };
    vm.runInNewContext(orderPrepaint(DOORS.map((d) => d.href)), sandbox);
    expect(added[0].textContent).toContain('[data-door-grid]>[data-door="/parishes"]{order:0}');
    expect(added[0].textContent).toContain('[data-door-grid]>[data-door="/reading"]{order:2}');
  });
});
