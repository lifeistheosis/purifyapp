import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import {
  DEFAULT_STYLE,
  FONT_ORDER,
  FOOT,
  FOOT_CLEAR,
  ICON,
  ICON_PAD_BOTTOM,
  LOOKS,
  MIN_SIZE,
  SHAPES,
  SHAPE_ORDER,
  TEXT_SCALES,
  YOURS,
  cardFileName,
  fitWords,
  lineHeightFor,
  lookOf,
  planPicture,
  sizesFrom,
  wrap,
  type Measure,
  type Measures,
  type PictureStyle,
} from "@/lib/share/verseCard";

/**
 * Words as a picture: where everything goes. The drawing needs a canvas; the
 * arithmetic does not, and the arithmetic is where a verse gets cut off, runs
 * off the edge or is written over an icon. Every letter is taken to be half
 * its size wide, which is close to a serif's average and exact enough to
 * test the rules.
 */
const measure: Measure = (text, size) => text.length * size * 0.5;
const measures: Measures = { words: measure, reference: measure, note: measure };

const JOHN_3_16 =
  "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";
const LUKE_11_13 =
  "If ye then, being evil, know how to give good gifts unto your children: how much more shall your heavenly Father give the Holy Spirit to them that ask him?";
const SHORT = "Jesus wept.";
/** Esther 8:9 is the longest verse in the English Bible, about 520 letters. */
const LONGEST =
  "Then were the king's scribes called at that time in the third month, that is, the month Sivan, on the three and twentieth day thereof; and it was written according to all that Mordecai commanded unto the Jews, and to the lieutenants, and the deputies and rulers of the provinces which are from India unto Ethiopia, an hundred twenty and seven provinces, unto every province according to the writing thereof, and unto every people after their language, and to the Jews according to their writing, and according to their language.";

const verse = { text: LUKE_11_13, reference: "Luke 11:13", note: "King James Version" };
const style = (over: Partial<PictureStyle> = {}): PictureStyle => ({ ...DEFAULT_STYLE, ...over });

/** Every combination a reader can choose, for one set of words. */
function* everyStyle(): Generator<PictureStyle> {
  for (const look of [...LOOKS.map((l) => l.id), YOURS.id])
    for (const shape of SHAPE_ORDER)
      for (const font of FONT_ORDER)
        for (let size = 0; size < TEXT_SCALES.length; size++)
          for (const align of ["center", "left"] as const) yield style({ look, shape, font, size, align });
}

describe("breaking the words into lines", () => {
  it("never makes a line wider than the box, and never loses a word", () => {
    for (const size of sizesFrom(69)) {
      const lines = wrap(JOHN_3_16, size, 886, measure);
      expect(lines.join(" ")).toBe(JOHN_3_16);
      for (const line of lines) expect(measure(line, size), `${size}px: ${line}`).toBeLessThanOrEqual(886);
    }
  });

  it("gives a word too wide for the line a line of its own, rather than dropping it", () => {
    expect(wrap("a Mahershalalhashbaz b", 60, 200, measure)).toEqual(["a", "Mahershalalhashbaz", "b"]);
  });

  it("treats any run of spaces and line breaks as one space", () => {
    expect(wrap("  In the   beginning\nwas the Word  ", 40, 2000, measure)).toEqual(["In the beginning was the Word"]);
  });

  it("does not leave one short word alone on the last line", () => {
    // Twelve letters fit a line. Filled greedily this is "aaaa bbbb cc" then
    // "dd"; evened out, the last two words share the last line.
    expect(wrap("aaaa bbbb cc dd", 10, 60, measure)).toEqual(["aaaa bbbb", "cc dd"]);
  });

  it("gives nothing for nothing", () => {
    expect(wrap("   ", 40, 800, measure)).toEqual([]);
    expect(fitWords("   ", measure, { width: 800, height: 800 }, [40])).toBeNull();
  });
});

describe("how large the words are set", () => {
  it("tries the sizes largest first, down to one that still reads", () => {
    const sizes = sizesFrom(69);
    expect(sizes[0]).toBe(69);
    expect(sizes.at(-1)).toBe(MIN_SIZE);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThan(sizes[i - 1]);
  });

  it("brings a long verse down until the whole of it fits, and takes the largest that does", () => {
    const box = { width: 886, height: 600 };
    const fit = fitWords(JOHN_3_16, measure, box, sizesFrom(69))!;
    expect(fit.lines.join(" ")).toBe(JOHN_3_16);
    expect(fit.height).toBeLessThanOrEqual(box.height);
    const larger = sizesFrom(69).filter((s) => s > fit.size).at(-1);
    if (larger) expect(wrap(JOHN_3_16, larger, box.width, measure).length * lineHeightFor(larger)).toBeGreaterThan(box.height);
  });

  it("sets a short verse at the size chosen, and a larger step sets it larger", () => {
    const sizes = TEXT_SCALES.map((_, size) => planPicture({ text: SHORT, reference: "John 11:35" }, style({ size }), measures)!.words.size);
    expect(sizes[2]).toBe(69);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
  });

  it("fits the longest verse in the Bible whole in the picture as the sheet opens", () => {
    const plan = planPicture({ text: LONGEST, reference: "Esther 8:9" }, DEFAULT_STYLE, measures);
    expect(plan).not.toBeNull();
    expect(plan!.words.lines.join(" ")).toBe(LONGEST);
  });

  it("never cuts the words: too long for a look and a size is no picture at all", () => {
    expect(planPicture({ text: `${LONGEST} ${LONGEST} ${LONGEST} ${LONGEST}`, reference: "Esther 8:9" }, DEFAULT_STYLE, measures)).toBeNull();
    // The longest verse under an icon in a square has not the room.
    expect(planPicture({ text: LONGEST, reference: "Esther 8:9" }, style({ look: "christ", shape: "square" }), measures)).toBeNull();
    for (const s of everyStyle()) {
      const plan = planPicture(verse, s, measures);
      if (!plan) continue;
      const set = s.font === "caps" ? LUKE_11_13.toUpperCase() : LUKE_11_13;
      expect(plan.words.lines.join(" "), JSON.stringify(s)).toBe(set);
      const room = plan.width - 2 * Math.round(plan.width * 0.09);
      for (const line of plan.words.lines) expect(measure(line, plan.words.size)).toBeLessThanOrEqual(room);
    }
  });
});

describe("the looks and the sizes", () => {
  it("offers Light, Horizon, Christ, Trinity and Plain, then the reader's own photo, each named in the catalog", () => {
    expect(LOOKS.map((l) => l.id)).toEqual(["light", "horizon", "christ", "trinity", "plain"]);
    expect(YOURS.kind).toBe("picture");
    for (const look of [...LOOKS, YOURS]) expect((en as Record<string, string>)[look.nameKey!], look.id).toBeTruthy();
    expect(lookOf("nothing")).toBe(LOOKS[0]);
    expect(lookOf("yours")).toBe(YOURS);
  });

  it("takes the icons from the bundle, so the picture is made with no network", () => {
    const icons = LOOKS.filter((l) => l.kind === "icon");
    expect(icons.map((l) => (l.kind === "icon" ? l.src : ""))).toEqual(["/sections/prayers.v3.jpg", "/discover/tiles/theology.v2.webp"]);
    for (const look of icons) if (look.kind === "icon") expect(fs.existsSync(path.join("public", look.src)), look.src).toBe(true);
    expect(fs.existsSync("public/purify-cross-mark.png")).toBe(true);
  });

  it("is a story (9:16), a square or a post (4:5), 1080 wide, and opens as a story", () => {
    expect(SHAPES).toEqual({ story: { width: 1080, height: 1920 }, square: { width: 1080, height: 1080 }, post: { width: 1080, height: 1350 } });
    expect(DEFAULT_STYLE.shape).toBe("story");
    for (const shape of SHAPE_ORDER) {
      const plan = planPicture(verse, style({ shape }), measures)!;
      expect([plan.width, plan.height]).toEqual([SHAPES[shape].width, SHAPES[shape].height]);
    }
  });
});

describe("an icon is never written over", () => {
  it("stands whole in the upper part with the words under it, and no cross over it", () => {
    let planned = 0;
    for (const s of everyStyle()) {
      if (lookOf(s.look).kind !== "icon") continue;
      const plan = planPicture(verse, { ...s, cross: true }, measures);
      if (!plan) continue;
      planned += 1;
      const why = JSON.stringify(s);
      const place = ICON[s.shape];
      expect(plan.icon, why).toEqual({ bottom: Math.round(plan.height * place.height), fadeFrom: Math.round(plan.height * place.fadeFrom) });
      // The words start no higher than where the fade is two thirds dark.
      expect(plan.words.top, why).toBeGreaterThanOrEqual(plan.icon!.fadeFrom + ((plan.icon!.bottom - plan.icon!.fadeFrom) * 2) / 3);
      expect(plan.mark, why).toBeNull();
      expect(plan.words.top + plan.words.lines.length * plan.words.lineHeight, why).toBeLessThanOrEqual(plan.height * (1 - ICON_PAD_BOTTOM));
    }
    expect(planned).toBeGreaterThan(100);
  });

  it("keeps the cross over every other look, when the reader leaves it on", () => {
    for (const look of ["light", "horizon", "plain", "yours"]) {
      expect(planPicture(verse, style({ look }), measures)!.mark, look).not.toBeNull();
      expect(planPicture(verse, style({ look, cross: false }), measures)!.mark, look).toBeNull();
    }
  });
});

describe("the words, the reference and the foot", () => {
  it("signs every picture Purify App at its foot, under everything else", () => {
    expect(FOOT.text).toBe("Purify App");
    for (const s of everyStyle()) {
      const plan = planPicture(verse, s, measures);
      if (!plan) continue;
      expect(plan.foot.text).toBe("Purify App");
      const last = Math.max(
        plan.words.top + plan.words.lines.length * plan.words.lineHeight,
        plan.reference ? plan.reference.baseline : 0,
        plan.note ? plan.note.baseline + (plan.note.lines.length - 1) * plan.note.lineHeight : 0,
      );
      expect(plan.foot.baseline - plan.foot.size, JSON.stringify(s)).toBeGreaterThan(last);
      // With room between: nothing comes nearer the foot than its clearance.
      expect(last, JSON.stringify(s)).toBeLessThanOrEqual(plan.height - FOOT_CLEAR);
      expect(plan.foot.baseline).toBeLessThan(plan.height);
    }
    // Nowhere does the drawing write the website's address any more.
    expect(fs.readFileSync("lib/share/drawVerseCard.ts", "utf8")).not.toMatch(/purifyapp\.net/i);
  });

  it("sets the reference in capitals under a rule, with the Bible it is from, and takes both away together", () => {
    const plan = planPicture(verse, DEFAULT_STYLE, measures)!;
    expect(plan.reference?.lines).toEqual(["LUKE 11:13"]);
    expect(plan.rule).not.toBeNull();
    expect(plan.note?.lines).toEqual(["King James Version"]);
    const bare = planPicture(verse, style({ reference: false }), measures)!;
    expect([bare.reference, bare.rule, bare.note]).toEqual([null, null, null]);
  });

  it("keeps a machine translation's label even with the reference off, and makes no picture without it", () => {
    const translated = { text: "Siz kötü olduğunuz hâlde...", reference: "Luka 11:13", note: "Makine çevirisi", keepNote: true, lang: "tr" };
    expect(planPicture(translated, style({ reference: false }), measures)!.note?.lines).toEqual(["Makine çevirisi"]);
    expect(planPicture({ ...translated, note: "x ".repeat(400) }, DEFAULT_STYLE, measures)).toBeNull();
    // Capitals by the words' own language: Turkish i is İ.
    expect(planPicture({ ...translated, reference: "Luka 11:13 incil" }, DEFAULT_STYLE, measures)!.reference?.lines).toEqual(["LUKA 11:13 İNCİL"]);
  });

  it("takes any words with a line under them: a saint's words and his name", () => {
    const plan = planPicture({ text: "Let no one fear death, for the Saviour's death hath set us free.", reference: "St. John Chrysostom", note: "The Paschal Homily" }, DEFAULT_STYLE, measures)!;
    expect(plan.reference?.lines).toEqual(["ST. JOHN CHRYSOSTOM"]);
    expect(plan.note?.lines).toEqual(["The Paschal Homily"]);
    // A name too long for one line comes down in size, then over two lines.
    const long = planPicture({ text: SHORT, reference: "Our Holy Father among the Saints John Chrysostom, Archbishop of Constantinople" }, DEFAULT_STYLE, measures)!;
    expect(long.reference!.lines.length).toBeGreaterThan(1);
    expect(long.reference!.lines.join(" ")).toBe("OUR HOLY FATHER AMONG THE SAINTS JOHN CHRYSOSTOM, ARCHBISHOP OF CONSTANTINOPLE");
  });

  it("sets the lines from the left margin, or about the middle", () => {
    expect(planPicture(verse, style({ align: "left" }), measures)!.x).toBe(97);
    expect(planPicture(verse, style({ align: "center" }), measures)!.x).toBe(540);
  });

  it("sets bold capitals in capitals", () => {
    expect(planPicture(verse, style({ font: "caps" }), measures)!.words.lines.join(" ")).toBe(LUKE_11_13.toUpperCase());
  });
});

describe("the picture's file name", () => {
  it("is the reference, in plain letters", () => {
    expect(cardFileName("John 3:16")).toBe("purify-john-3-16.png");
    expect(cardFileName("1 Corinthians 13:4–8")).toBe("purify-1-corinthians-13-4-8.png");
    expect(cardFileName("Κατά Ιωάννην 3:16")).toBe("purify-κατα-ιωαννην-3-16.png");
    expect(cardFileName("")).toBe("purify-verse.png");
  });
});
