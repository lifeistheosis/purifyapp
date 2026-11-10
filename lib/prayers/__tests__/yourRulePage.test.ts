import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";
import { getPrayerIcon } from "@/lib/prayers/icons";
import { WIDE_CUTS, ruleHeadArt, serviceArt } from "@/lib/prayers/serviceArt";
import { deleteIntention, readIntentions, reposeDateText, restoreIntention, writeIntentions, type Intention } from "@/lib/prayers/storage";

/**
 * The page of Your rule (/prayers/personal), held to what a design round
 * found on it (sheet r3-27, the owner's note 73: "fix all of them"):
 *
 *  1. both lists' lines printed a web address, "/prayers/today";
 *  2. a repose date printed as typed, 2019-03-04;
 *  3. removing a name asked in the browser's own confirm box;
 *  4. the note at the page's foot said "The names below sync", under the names;
 *  5. Start from Morning prayers brought in what the prayer book calls 8 min,
 *     and the page said about 12 (the count: lib/prayers/__tests__/myRule.test.ts);
 *  6. the names brought from the prayer wall were never shown on the page
 *     (lib/prayers/__tests__/wallNames.test.ts, "on the page of Your rule").
 *
 * Each fix is measured on the built page by scripts/export-walk.mjs too.
 */

const ROOT = process.cwd();
const catalog = (code: string): Record<string, string> =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "lib", "i18n", "messages", `${code}.json`), "utf8"));
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note about the old page is not read as the page. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(e.name)) out.push(rel);
  }
  return out;
}

/** This device's storage, in memory. */
function deviceStorage() {
  const kept = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => kept.get(k) ?? null,
      setItem: (k: string, v: string) => void kept.set(k, v),
      removeItem: (k: string) => void kept.delete(k),
    },
    dispatchEvent: () => true,
  });
  vi.stubGlobal("CustomEvent", class extends Event {});
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the lists' lines", () => {
  it("name Today in words, in every language, and print no address", () => {
    for (const { code } of LOCALES) {
      const m = catalog(code);
      for (const key of ["prayers.diptychs.livingIntro", "prayers.diptychs.reposedIntro"]) {
        expect(m[key], `${code} ${key}`).not.toContain("/");
        // The page's name as the catalog writes it on the tab and the page.
        expect(m[key], `${code} ${key}`).toContain(m["nav.today"]);
      }
    }
  });
});

describe("a repose date", () => {
  it("is written as the reader's language writes a date", () => {
    expect(reposeDateText("2019-03-04", "en")).toBe("Mar 4, 2019");
    expect(reposeDateText("2019-03-04", "de")).toBe("4. März 2019");
    expect(reposeDateText("2019-03-04", "fr")).toBe("4 mars 2019");
    for (const { code } of LOCALES) expect(reposeDateText("2019-03-04", code), code).not.toContain("2019-03");
  });

  it("is the calendar's day wherever the reader is, and kept as typed when it is no day", () => {
    // Written in UTC: a day, not a moment, so no zone moves it to March 3.
    expect(reposeDateText("2019-03-04", "en")).toBe("Mar 4, 2019");
    expect(reposeDateText("2020-02-29", "en")).toBe("Feb 29, 2020");
    expect(reposeDateText("0099-01-01", "en")).toContain("99");
    expect(reposeDateText("0099-01-01", "en")).not.toContain("1999");
    for (const bad of ["2019-02-29", "2019-13-01", "2019-3-4", "", "yesterday"]) expect(reposeDateText(bad, "en")).toBe(bad);
  });

  it("is what the row prints, never the stored text", () => {
    const src = read("components/prayers/Diptychs.tsx");
    expect(src).toContain("reposeDateText(entry.repose, locale)");
    expect(src).not.toMatch(/reposedLabel"\)\} \$\{entry\.repose\}/);
  });
});

describe("removing a name", () => {
  const name = (id: string): Intention => ({ id, name: id, addedAt: "2026-10-31T00:00:00.000Z" });

  it("asks nothing in the browser's own boxes, anywhere in the prayer pages", () => {
    const files = [...walk("components/prayers"), ...walk("app/(app)/prayers")];
    expect(files.length).toBeGreaterThan(20);
    const asking = files.filter((f) => /(^|[^\w.])(window\.)?(confirm|alert|prompt)\(/m.test(code(f)));
    expect(asking).toEqual([]);
  });

  it("takes it out at once, with the rule's own Removed line and Undo", () => {
    const src = code("components/prayers/Diptychs.tsx");
    // From the name's own sheet since r3-27 A, a tap on its medallion away.
    expect(src).toContain("onClick={() => onRemove(kind, entry, items.findIndex((i) => i.id === entry.id))}");
    expect(src).toMatch(/deleteIntention\(kind, entry\.id\);\s*removed\(\{ kind, entry, index \}\);/);
    expect(src).toMatch(/function removed\(r: Removed\) \{\s*setSheetOpen\(false\);\s*window\.clearTimeout\(undoTimer\.current\);\s*setUndo\(r\);/);
    expect(src).toContain('<p role="status"');
    expect(src).toContain('removedLine(t("prayers.mine.removed"), undo.entry.name)');
    expect(src).toContain('t("prayers.mine.undo")');
    expect(src).toContain("restoreIntention(undo.kind, undo.entry, undo.index)");
  });

  it("and Undo puts it back where it stood, once", () => {
    deviceStorage();
    writeIntentions("living", [name("anna"), name("basil"), name("clare")]);
    deleteIntention("living", "basil");
    expect(readIntentions("living").map((n) => n.id)).toEqual(["anna", "clare"]);
    restoreIntention("living", name("basil"), 1);
    expect(readIntentions("living").map((n) => n.id)).toEqual(["anna", "basil", "clare"]);
    // A second Undo, or one after the name came back by sync, adds nothing.
    restoreIntention("living", name("basil"), 0);
    expect(readIntentions("living").map((n) => n.id)).toEqual(["anna", "basil", "clare"]);
    // A place past the end, after others were removed meanwhile, is the end.
    deleteIntention("living", "clare");
    deleteIntention("living", "anna");
    restoreIntention("living", name("clare"), 2);
    expect(readIntentions("living").map((n) => n.id)).toEqual(["basil", "clare"]);
  });
});

describe("a part's length on the page", () => {
  it("is counted where the words are, the same figure in the head and under the list, and kept for Today", () => {
    const src = code("components/prayers/mine/MyRuleBuilder.tsx");
    // Counted afresh, never a figure kept by an older count.
    expect(src).toMatch(/partMinutes\(rule\.morning, lookup\)/);
    expect(src).not.toMatch(/rule\.minutes\[part\] \|\|/);
    // Kept again when the count changed, for Today, which has no prayer book.
    expect(src).toMatch(/writeMyRule\(withMinutes\(rule, minutes\)\)/);
  });
});

describe("the note at the page's foot", () => {
  // Each catalog's word for "below" or "above" in the note as it stood; the
  // note stands under the names, so it names them and not where they are.
  const PLACE: Record<string, RegExp> = {
    ar: /أدناه|أعلاه/,
    bg: /по-долу|по-горе/,
    de: /darunter|darüber|unten|oben/,
    el: /παρακάτω|παραπάνω/,
    en: /\bbelow\b|\babove\b/i,
    es: /de abajo|de arriba/,
    fil: /sa ibaba|sa itaas/,
    fr: /ci-dessous|ci-dessus/,
    hu: /alábbi|fenti/,
    id: /di bawah|di atas/,
    it: /qui sotto|qui sopra/,
    ka: /ქვემოთ|ზემოთ/,
    ne: /तलका|माथिका/,
    pl: /poniżej|powyżej/,
    pt: /abaixo|acima/,
    ro: /de mai jos|de mai sus/,
    ru: /ниже|выше/,
    sr: /испод|изнад/,
    tr: /Aşağıdaki|Yukarıdaki/i,
    uk: /нижче|вище/,
    ur: /نیچے|اوپر/,
  };

  it("names the names it speaks of, wherever it stands, in every language", () => {
    expect(Object.keys(PLACE).sort()).toEqual(LOCALES.map((l) => l.code).sort());
    for (const { code } of LOCALES) {
      const note = catalog(code)["prayers.mine.deviceNote"];
      expect(note, code).not.toMatch(PLACE[code]);
    }
    expect(catalog("en")["prayers.mine.deviceNote"]).toContain("The names you carry sync across your devices");
  });
});

/** A JPEG's own pixels, from its frame header. */
function jpegSize(rel: string): { width: number; height: number } {
  const b = fs.readFileSync(path.join(ROOT, "public", rel));
  for (let i = 2; i < b.length; ) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`no frame in ${rel}`);
}

// The owner's pick A of r3-27 (note 73 of build 86, "A with a rule"), "the
// icon above, the steps below". scripts/export-walk.mjs, section 39, measures
// it on the built page, empty and with a rule.
describe("the page as the owner picked it, r3-27 A", () => {
  const builder = code("components/prayers/mine/MyRuleBuilder.tsx");
  const head = code("components/prayers/mine/RuleHead.tsx");
  const track = code("components/prayers/mine/PartSwitch.tsx");
  const steps = code("components/prayers/mine/ReorderList.tsx");
  const names = code("components/prayers/Diptychs.tsx");
  const where = code("components/prayers/mine/RememberedIn.tsx");
  const ticks = code("components/prayers/PlaceChips.tsx");
  const css = read("app/globals.css");
  const block = css.slice(css.indexOf("/* ── Your rule: the icon above, the steps below (1.8) ──"), css.indexOf("/* The shop's floating cart button"));

  it("heads each part with its own icon, as the prayer book pairs them, in the largest copy the app carries", () => {
    expect(serviceArt("mine-morning").slug).toBe("anastasis");
    expect(serviceArt("mine-evening").slug).toBe("christ-pantocrator");
    expect(serviceArt("mine-morning").slug).toBe(serviceArt("morning").slug);
    expect(serviceArt("mine-evening").slug).toBe(serviceArt("evening").slug);
    for (const part of ["morning", "evening"] as const) {
      const art = ruleHeadArt(part);
      const slug = serviceArt(`mine-${part}`).slug;
      expect(WIDE_CUTS[slug], part).toBeDefined();
      // The pixels the page is told are the file's own, and it is no new file.
      expect(jpegSize(art.src), part).toEqual({ width: art.width, height: art.height });
      expect(art.alt).toBe(getPrayerIcon(slug)?.alt);
    }
    // The evening's is the Prayers tab's own cut, not the prayer pages' 392 pixels.
    expect(ruleHeadArt("evening").width).toBeGreaterThanOrEqual(1200);
    // On the clergy list, as every pairing is.
    expect(read("docs/editorial-standards.md")).toMatch(/26\. \*\*Your rule's two icons/);
  });

  it("puts the icon under the clear bar, fading in, the name and Pray my rule on it", () => {
    expect(read("app/(app)/prayers/personal/page.tsx")).toMatch(/<MobileTopBar[^>]*revealTitleOn="mine-title"[^>]*\boverlay\b/);
    expect(head).toContain("under-topbar picture-melt");
    expect(head).toContain('<h1 id="mine-title"');
    expect(head).toContain("data-mine-pray");
    expect(head).toContain("{pray.meta}");
    // Both parts' icons once the part is known, the one shown lit.
    expect(head).toMatch(/part\s*\?\s*MY_RULE_PARTS\.map/);
    expect(head).toContain('data-on={on ? "" : undefined}');
    expect(builder).toContain('t("prayers.mine.partMinutes", { part: t(PART_KEY[part]), min: minutes[part] })');
  });

  it("opens on the part the device names, never Morning crossing to Evening (build 89 note 9)", () => {
    // Decided before the first paint of a page reached inside the app.
    expect(builder).toMatch(/useLayoutEffect\(\(\) => \{\s*const kept = readMyRule\(\);/);
    // Until then neither part is lit, nothing about a part is said, and the
    // morning list holds its room unseen.
    expect(track).toContain("value: MyRulePart | null;");
    expect(builder).toContain("<PartSwitch value={part} onChange={select} still={!arrived} />");
    expect(builder).toContain("part && has(part)");
    expect(builder).toContain('className={holding ? "invisible mt-5" : arrived ? "mt-5" : "rule-panel-arrive mt-5"}');
    // Set with no cross-fade, the list arriving with the page's own fade, and
    // still with motion off; a reader's tap keeps the cross.
    expect(track).toContain('data-still={still ? "" : undefined}');
    expect(block).toMatch(/\.rule-track\[data-still\] > button,\s*\.rule-track\[data-still\] > button::before \{\s*transition: none;/);
    expect(block).toContain(".rule-panel-arrive {\n animation: page-open-fade");
    expect(block).toContain(':where([data-motion="reduce"]) .rule-panel-arrive');
  });

  it("sets Morning and Evening on a carved switch, a tablist kept in the address", () => {
    expect(track).toContain('role="tablist"');
    expect(track).toContain("id={`mine-tab-${part}`}");
    expect(track).toContain("aria-controls={`mine-panel-${part}`}");
    expect(track).toContain("<Sun ");
    expect(track).toContain("<Lampada ");
    expect(track).toContain('className="rule-track"');
    expect(builder).toContain("window.history.replaceState(null, \"\", `${window.location.pathname}${window.location.search}#${next}`)");
    expect(builder).toContain("id={`mine-panel-${p}`}");
  });

  it("draws the prayers as numbered steps on one thread, a handle on each, Add prayers the last stop", () => {
    expect(steps).toContain('className="rule-thread"');
    expect(steps).toMatch(/\{row\.lit \? <Orans size=\{15\} \/> : i \+ 1\}/);
    // The handle at the row's end, after the row's own button.
    expect(steps.indexOf("data-step-open")).toBeLessThan(steps.indexOf('aria-label={t("prayers.mine.moveRow"'));
    expect(builder).toContain("lit: true");
    expect(builder).toContain('data-mine-add');
    expect(builder).toContain('className="rule-step rule-add');
  });

  it("offers an empty part's two ways in as one choice of two rows drawn alike, each saying what it brings", () => {
    const ways = builder.slice(builder.indexOf("data-mine-ways"), builder.indexOf("{undo && undo.part === p"));
    // Both are the one shared row (build 89 note 14).
    expect(ways.match(/<WayRow\b/g)).toHaveLength(2);
    expect(code("components/prayers/mine/WayRow.tsx")).toContain('className="set-link rule-way flex w-full items-center gap-3 text-start"');
    expect(ways).toContain('t("prayers.mine.startFromWhat"');
    expect(ways).toContain('t("prayers.mine.addOneByOne")');
    expect(ways).toContain('t("prayers.mine.addOneByOneWhat")');
    expect(catalog("en")["prayers.mine.startFromWhat"]).toBe("The prayer book's own, {prayers} · {minutes}");
  });

  it("keeps the names as rows of medallions, a tap opening a name, the wall's with their day", () => {
    expect(names).toContain('className="rule-meds"');
    expect(names.match(/className="rule-med tap-press"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(names).toContain("<NameSheet");
    expect(names).toContain("<WallNameSheet");
    expect(names).toContain('aria-haspopup="dialog"');
    // Sentence-case labels: no list's name is set in capitals.
    expect(names).not.toMatch(/\buppercase\b/);
  });

  it("asks In which prayers in the same row as Add prayers one by one (build 89 note 14)", () => {
    // The shared row, never a second drawing of it.
    expect(where).toContain("<WayRow");
    expect(where).not.toMatch(/className="[^"]*\bset-link\b/);
    // `.set-row` sets display: block outside Tailwind's layers, so it beats
    // `flex` or `grid` on the same element: that is how this row stacked.
    for (const file of ["components/prayers/mine/RememberedIn.tsx", "components/prayers/mine/MyRuleBuilder.tsx", "components/settings/LitPanel.tsx", "components/settings/SettingsClient.tsx"]) {
      expect(code(file), file).not.toMatch(/className="[^"]*\bset-row\b[^"]*\b(flex|grid)\b/);
      expect(code(file), file).not.toMatch(/className="[^"]*\b(flex|grid)\b[^"]*\bset-row\b/);
    }
  });

  it("asks In which prayers in one row that opens a sheet of lines to tick, never pills", () => {
    expect(where).toContain("data-remembered-in");
    expect(where).toContain("<Sheet ");
    expect(where).toContain("<PlaceChips ");
    expect(ticks).toContain('className="rule-tick"');
    expect(ticks).not.toMatch(/rounded-pill|border-paper\/15 text-paper\/70/);
    // The wall's own add sheet has the same lines.
    expect(code("components/community/AddToPrayersSheet.tsx")).toContain("<PlaceChips ");
  });

  it("draws nothing for prayer campaigns while they are closed: the one part they bring is empty then", () => {
    // 1.9 (note 70) at first kept the campaigns' place on this page in words
    // only. The rework, in 1.9 too, draws it behind the switch (his "ok to
    // all ensure its all in v1.9" of 2026-11-10): the names mount one part,
    // CampaignNames, and the page says nothing else of campaigns.
    for (const src of [builder, head, steps]) expect(src).not.toMatch(/campaign/i);
    expect(names).toContain("<CampaignNames Medallion={Medallion} />");
    expect(names.replace(/CampaignNames/g, "").replace(/@\/components\/campaigns\//g, "")).not.toMatch(/campaign/i);
    // That part draws nothing while the reader carries no campaign and none
    // waits for its answer, and a closed build reads no list at all, so with
    // the switch closed the page is what it was (lib/campaigns/__tests__/
    // closed.test.ts holds the switch itself).
    expect(code("components/campaigns/CampaignNames.tsx")).toContain("if (now.length === 0 && asking.length === 0 && !notice) return null;");
    expect(code("lib/campaigns/useCarried.ts")).toContain('if (typeof window === "undefined" || !campaignsInBuild()) return EMPTY;');
    expect(read("components/prayers/mine/MyRuleBuilder.tsx")).toMatch(/1\.9 \(note 70\)/);
  });

  it("draws the names' small lines at each palette's own share, so each holds 4.5:1", () => {
    // A list's name (58 percent) and a medallion's line (50) are written in
    // the stylesheet, not as text-paper utilities, so "Faint text on every
    // palette" never reached them: 3.72:1 and 2.97:1 on Light, 3.91:1 on
    // Candlelight, measured on the export. Each palette draws them at the
    // share that table gives it (lib/ui/__tests__/faintText.test.ts does its
    // arithmetic).
    const css = read("app/globals.css");
    expect(css).toMatch(
      /html\[data-reading-mode="parchment"\] :is\(\.rule-names-label, \.rule-med-sub, \.rule-meds-none\) \{\s*color: color-mix\(in srgb, var\(--color-paper\) 70%, transparent\);/,
    );
    expect(css).toMatch(/html\[data-reading-mode="candlelight"\] :is\(\.rule-med-sub, \.rule-meds-none\) \{\s*color: color-mix\(in srgb, var\(--color-paper\) 60%, transparent\);/);
    expect(css).toMatch(
      /:is\(html\[data-reading-mode="monastery"\], html\[data-reading-mode="councils"\], html\[data-reading-mode="cappadocian"\]\) :is\(\.rule-med-sub, \.rule-meds-none\) \{\s*color: color-mix\(in srgb, var\(--color-paper\) 55%, transparent\);/,
    );
  });

  it("is black, white and grey in every palette, and still with motion off", () => {
    expect(block.length).toBeGreaterThan(2000);
    expect(block).not.toMatch(/gold|amber|yellow|#d8b25c|#cfa65a/i);
    // Parchment and True black have their own lines; nothing glows on paper.
    expect(block).toContain('html[data-reading-mode="parchment"] .rule-pray');
    expect(block).toContain('html[data-reading-mode="black"] .rule-node');
    // Each movement has its escape.
    for (const moving of [".rule-head-img", ".rule-head-img[data-on]", ".rule-track > button", ".rule-track > button::before"]) {
      expect(block, moving).toContain(`:where([data-motion="reduce"]) ${moving}`);
    }
  });
});
