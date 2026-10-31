// The saint web as the reader meets it (1.8, round 3, r3-06: card A "the
// handle" and drag B, the pick the owner left to the design job on
// 2026-10-30). Drawn on the server here, as the first paint is, from the
// app's own data: St John Chrysostom's web, the one the sheet draws. What a
// reader would notice if this broke: the card covering half the screen again,
// the kinds back as loose pills that never say which line is which, a card
// that cannot be pulled up or tucked away, a Put back offered before anything
// moved, or St John's circle showing his chest.

import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { WebConstellation } from "@/components/saints/web/WebConstellation";
import { getMessages } from "@/lib/i18n";
import { saintWeb, webSlugs } from "@/lib/saints/web";
import { webFilters } from "@/lib/saints/webLayout";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const en = getMessages("en");
const draw = (node: React.ReactElement) =>
  renderToString(createElement(MessagesProvider, { locale: "en", messages: en } as ProviderProps, node));
/** The markup without React's comment marks between texts. */
const plain = (html: string) => html.replace(/<!-- -->/g, "");
/** Text as React writes it into markup. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const john = saintWeb("john-chrysostom")!;

/** The element that opens with `start` (a tag and its attributes), as markup up to its own close. */
function element(html: string, start: RegExp): string {
  const m = start.exec(html);
  if (!m) return "";
  const tag = /^<([a-z0-9]+)/.exec(m[0])![1];
  let depth = 0;
  const re = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, "g");
  re.lastIndex = m.index;
  for (let t = re.exec(html); t; t = re.exec(html)) {
    if (t[1]) depth -= 1;
    else if (!t[2]) depth += 1;
    if (depth === 0) return html.slice(m.index, t.index + t[0].length);
  }
  return html.slice(m.index);
}

describe("St John Chrysostom's web, as it arrives", () => {
  const html = plain(draw(createElement(WebConstellation, { data: john })));

  it("names the key's kinds with their lines and how many each holds, All chosen", () => {
    expect(webFilters(john.nodes)).toEqual(["history", "lives"]);
    const key = element(html, /<div class="saint-web-key[^"]*"[^>]*>/);
    expect(key).not.toBe("");
    const parts = [...key.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>([\s\S]*?)<\/button>/g)];
    expect(parts.map((p) => p[1])).toEqual(["true", "false", "false"]);
    const words = parts.map((p) => p[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    expect(words).toEqual(["All 9", "History 1", "In the Lives 9"]);
    // Each kind beside its line: the web's mark for All, a dash for History, dots for the Lives.
    expect(parts[1][2]).toContain('stroke-dasharray="4 3.2"');
    expect(parts[2][2]).toContain('stroke-dasharray="0.1 4.2"');
    // A carved track, never the pills of build 80.
    expect(key).not.toMatch(/rounded-pill/);
  });

  it("chooses the first saint, his card short at the foot: icon, name, years and each kind by its line", () => {
    const card = element(html, /<section[^>]*data-saint-web-card[^>]*>/);
    expect(card).toMatch(/class="saint-web-sheet saint-web-card [^"]*fixed/);
    expect(card).toContain("height:78px");
    expect(card).toContain('data-state="short"');
    expect(card).not.toContain("data-away");
    const short = element(card, /<button[^>]*class="saint-web-card-short[^"]*"[^>]*>/);
    expect(short).toContain('aria-expanded="false"');
    expect(short).not.toMatch(/^<button[^>]*inert/);
    const text = short.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    expect(text).toBe("St. Olympias the Deaconess c. 361–c. 408 · History In the Lives");
  });

  it("holds every tie in full for the pull, with the ways on, out of reach until it is pulled up", () => {
    const card = element(html, /<section[^>]*data-saint-web-card[^>]*>/);
    const tall = element(card, /<div[^>]*class="saint-web-card-tall[^"]*"[^>]*>/);
    expect(tall).toMatch(/^<div[^>]*inert=""/);
    const olympias = john.nodes[0];
    expect(olympias.kind).toBe("saint");
    for (const tie of olympias.ties) expect(tall).toContain(esc(tie.text));
    expect(tall).toContain('href="/history/chrysostom-at-constantinople"');
    expect(tall).toContain('href="/saints/olympias-the-deaconess"');
    expect(tall).toContain(">Open her page<");
    expect(tall).toContain('href="/saints/olympias-the-deaconess/web"');
    expect(tall).toContain(">Center the web here<");
    expect(tall).toMatch(/<button[^>]*aria-expanded="true"/);
  });

  it("has its handle ready on the foot's edge, not shown while the card is out", () => {
    const handle = element(html, /<button[^>]*data-saint-web-handle[^>]*>/);
    expect(handle).toMatch(/^<button[^>]*inert=""/);
    expect(handle).not.toContain("data-shown");
    expect(handle.replace(/<[^>]+>/g, "")).toContain("Olympias the Deaconess");
  });

  it("offers Put back only once a saint has moved", () => {
    const put = element(html, /<button[^>]*class="saint-web-putback[^"]*"[^>]*>/);
    expect(put).toMatch(/^<button[^>]*inert=""/);
    expect(put).not.toContain("data-shown");
    expect(put.replace(/<[^>]+>/g, "").trim()).toBe("Put back");
  });

  it("draws every saint as a button, the first one chosen and lit", () => {
    const canvas = element(html, /<div[^>]*data-saint-web-canvas[^>]*>/);
    const nodes = [...canvas.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>/g)];
    expect(nodes).toHaveLength(john.nodes.length);
    expect(nodes.map((n) => n[1]).filter((p) => p === "true")).toHaveLength(1);
    expect(nodes[0][1]).toBe("true");
    expect(canvas).toMatch(/class="saint-web-ring rounded-full saint-web-ring-on"/);
    // A thread to each, from the saint to the one his line runs to.
    expect((canvas.match(/<path /g) ?? []).length).toBe(john.nodes.length);
  });

  it("lets a finger take a saint by his whole box and a margin round it, not his small circle alone (note 45)", () => {
    const canvas = element(html, /<div[^>]*data-saint-web-canvas[^>]*>/);
    // Each saint's button is his circle, his name and its line, and says which saint it is.
    const buttons = [...canvas.matchAll(/<button[^>]*data-web-node="(\d+)"[^>]*>/g)].map((m) => Number(m[1]));
    expect(buttons).toEqual(john.nodes.map((_, i) => i));
    expect(canvas).not.toContain("data-web-grip");
    // Behind them all, a hit area for each: his box (97px) and 20px over his
    // circle, 4px under his line, 10px each side, so at least 44px of it stand
    // round his circle's centre every way, on a phone as narrow as 320px.
    const hits = [...canvas.matchAll(/<span[^>]*data-web-hit="(\d+)"[^>]*style="([^"]*)"[^>]*>/g)];
    expect(hits.map((m) => Number(m[1]))).toEqual(john.nodes.map((_, i) => i));
    const tops = [...canvas.matchAll(/<button[^>]*data-web-node="\d+"[^>]*style="[^"]*top:(-?[\d.]+)px/g)].map((m) => Number(m[1]));
    hits.forEach(([, , style], i) => {
      expect(style).toContain("width:calc(25.6% + 20px)");
      expect(style).toContain("height:121px");
      // 20px over the top of his circle, so 44px over its centre.
      expect(style).toContain(`top:${tops[i] - 20}px`);
    });
    expect(canvas.indexOf("data-web-hit")).toBeLessThan(canvas.indexOf("data-web-node"));
    // The middle saint is a handle for the whole web.
    expect(canvas).toContain("data-web-middle");
  });

  it("lights the ground behind the middle saint grey from his icon, never in its colour", () => {
    const light = element(html, /<div[^>]*class="saint-web-light[^"]*"[^>]*>/);
    expect(light).toContain('style="top:');
    expect(light).toContain("background-image:url(/saints/icons/john-chrysostom.jpg)");
    // Its look is the rule's alone (globals.css): no colour or blur of its own.
    expect(light).not.toMatch(/\b(?:opacity-\d+|blur-\[)/);
  });

  it("cuts St John's tall icon at his face, and every other icon as before", () => {
    expect(html).toMatch(/src="\/saints\/icons\/john-chrysostom\.jpg"[^>]*style="object-position:50% 2%"/);
    expect(html).toMatch(/src="\/saints\/icons\/olympias-the-deaconess\.jpg"[^>]*style="object-position:50% 20%"/);
    expect(html).not.toContain("object-[50%_20%]");
  });

  it("draws the web in a room of its own, the page left to scroll until it is measured", () => {
    const room = element(html, /<div[^>]*class="saint-web-room[^"]*"[^>]*>/);
    expect(room).not.toBe("");
    // Full width on a phone and up to the bar's foot, so the web can be moved to any part of the screen.
    expect(room).toMatch(/^<div[^>]*class="saint-web-room -mx-5 -mt-2 px-5 pt-2 md:mx-0 md:mt-0 md:px-0 md:pt-0"/);
    expect(room).toMatch(/^<div[^>]*data-page-scrolls=""/);
    // The key and the canvas are in it; the card and Put back stand outside it.
    expect(room).toContain('class="saint-web-key-place"');
    expect(room).toContain("data-saint-web-canvas");
    expect(room).not.toContain("data-saint-web-card");
    expect(room).not.toContain("saint-web-putback");
  });
});

describe("the saint web's rules (app/globals.css)", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    return at < 0 ? "" : css.slice(at, css.indexOf("}", at) + 1);
  };

  it("cuts the moved web at the room's edges, and leaves the page's scroll to a finger that starts up or down where it scrolls", () => {
    expect(rule(".saint-web-room")).toContain("overflow: clip;");
    expect(rule(".saint-web-room")).toContain("touch-action: none;");
    expect(rule(".saint-web-room[data-page-scrolls]")).toContain("touch-action: pan-y pinch-zoom;");
    // The room reaches the foot of the screen in the apps, so the web can stand in its middle without a longer page.
    expect(rule("html.is-native .saint-web-room")).toMatch(/min-height: calc\(100vh - var\(--saint-web-top/);
  });

  it("greys the middle icon's light, white on the dark grounds and ink on Parchment", () => {
    expect(rule(".saint-web-light")).toContain("grayscale(1)");
    expect(rule('html[data-reading-mode="parchment"] .saint-web-light')).toContain("grayscale(1)");
  });

  it("never eases the card's height: the spring moves it, with the web, and nothing trails it under a finger", () => {
    const card = rule(".saint-web-card");
    expect(card).toContain("transition:");
    expect(card).not.toMatch(/\bheight var\(/);
    expect(rule(".saint-web-card[data-moving]")).not.toMatch(/\b(?:height|translate) var\(/);
    expect(css).toContain(':where([data-motion="reduce"]) .saint-web-card[data-moving]');
  });
});

describe("a web with councils", () => {
  const slug = webSlugs().find((s) => {
    const kinds = webFilters(saintWeb(s)!.nodes);
    return kinds.length === 3 && kinds.includes("councils");
  });

  it("puts each kind in the key, the councils by their solid line", () => {
    expect(slug).toBeDefined();
    const web = saintWeb(slug!)!;
    const html = plain(draw(createElement(WebConstellation, { data: web })));
    const key = element(html, /<div class="saint-web-key[^"]*"[^>]*>/);
    const parts = [...key.matchAll(/<button[^>]*aria-pressed="(?:true|false)"[^>]*>([\s\S]*?)<\/button>/g)];
    expect(parts).toHaveLength(4);
    const councils = parts.find((p) => p[1].includes(">Councils<"));
    expect(councils).toBeDefined();
    expect(councils![1]).toMatch(/<line[^>]*stroke-width="1.6"/);
    expect(councils![1]).not.toContain("stroke-dasharray");
  });
});

describe("the web a reader comes back to from the Timeline", () => {
  it("chooses the saint he chose, and offers Put back for the saints he moved", () => {
    const html = plain(
      draw(
        createElement(WebConstellation, {
          data: john,
          kept: {
            selectedId: john.nodes[3].id,
            places: { anchor: [null, { x: 330, y: 60 }, ...john.nodes.slice(1).map(() => null)] },
          },
        }),
      ),
    );
    const card = element(html, /<section[^>]*data-saint-web-card[^>]*>/);
    expect(card).toContain(john.nodes[3].kind === "saint" ? john.nodes[3].person.name : "");
    const put = element(html, /<button[^>]*class="saint-web-putback[^"]*"[^>]*>/);
    expect(put).toContain("data-shown");
    expect(put).not.toMatch(/^<button[^>]*inert/);
  });
});
