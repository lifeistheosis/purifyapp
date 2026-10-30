// The saint web as the reader meets it (1.8, round 3, r3-06: card A "the
// handle" and drag B, the pick the owner left to the design job on
// 2026-10-30). Drawn on the server here, as the first paint is, from the
// app's own data: St John Chrysostom's web, the one the sheet draws. What a
// reader would notice if this broke: the card covering half the screen again,
// the kinds back as loose pills that never say which line is which, a card
// that cannot be pulled up or tucked away, a Put back offered before anything
// moved, or St John's circle showing his chest.

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

  it("draws every saint as a button a finger can take by his circle, the first one chosen and lit", () => {
    const canvas = element(html, /<div[^>]*data-saint-web-canvas[^>]*>/);
    const nodes = [...canvas.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>/g)];
    expect(nodes).toHaveLength(john.nodes.length);
    expect(nodes.map((n) => n[1]).filter((p) => p === "true")).toHaveLength(1);
    expect(nodes[0][1]).toBe("true");
    expect((canvas.match(/data-web-grip/g) ?? []).length).toBe(john.nodes.length);
    expect(canvas).toMatch(/class="saint-web-ring rounded-full saint-web-ring-on"/);
    // A thread to each, from the saint to the one his line runs to.
    expect((canvas.match(/<path /g) ?? []).length).toBe(john.nodes.length);
  });

  it("cuts St John's tall icon at his face, and every other icon as before", () => {
    expect(html).toMatch(/src="\/saints\/icons\/john-chrysostom\.jpg"[^>]*style="object-position:50% 2%"/);
    expect(html).toMatch(/src="\/saints\/icons\/olympias-the-deaconess\.jpg"[^>]*style="object-position:50% 20%"/);
    expect(html).not.toContain("object-[50%_20%]");
  });

  it("keeps room under the web for the card", () => {
    expect(html).toMatch(/class="saint-web-room" style="--saint-web-card-h:78px"/);
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
