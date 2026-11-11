// What his PC reads aloud beside the Bible is written from the same files
// the pages are drawn from, and names each paragraph by the place its page
// gives it: that is the only thing that lets the reader light the paragraph
// being read. So the batches are held to the pages here.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";
import { SAINTS } from "@/lib/saints/saints";

import { councilBatches, historyBatches, lifeBatches, theologyBatches } from "../batches";
import { batchOf, hostKeyOf, listenHref, listenId, parseListenId, sentencesOf, timingsFit, type ListenBatch, type ListenTimings } from "../texts";

const places = (b: ListenBatch) => b.blocks.filter((x) => x.at).map((x) => `${x.at!.sectionN}:${x.at!.paragraphIdx}`);
const EM_DASH = String.fromCharCode(0x2014);

describe("a recording's name", () => {
  it("says what it is, and is read back the same", () => {
    for (const id of [listenId("life", "anthony-the-great"), listenId("history", "pentecost"), listenId("theology", "papacy", undefined, 2), listenId("council", "first-nicaea", "the-twenty-canons", 7)]) {
      const ref = parseListenId(id);
      expect(ref, id).not.toBeNull();
      expect(listenHref(ref!)).toMatch(/^\/(saints|history|theology|councils)\//);
    }
    expect(listenHref(parseListenId("council/first-nicaea/the-twenty-canons/7")!)).toBe("/councils/first-nicaea/the-twenty-canons#s7");
    expect(hostKeyOf(parseListenId("council/first-nicaea/the-twenty-canons/7")!, { sectionN: 7, paragraphIdx: 1 })).toBe("text|council|first-nicaea|the-twenty-canons|7|1");
    expect(hostKeyOf(parseListenId("life/anthony-the-great")!, { sectionN: 1, paragraphIdx: 0 })).toBe("text|life|anthony-the-great|-|1|0");
  });

  it("is refused when it is not one", () => {
    for (const bad of ["", "life", "life/Not A Slug", "council/first-nicaea/the-canons", "theology/papacy/two", "work/a/b/1", "life/a/b"]) expect(parseListenId(bad), bad).toBeNull();
  });
});

describe("what the voice is handed", () => {
  it("is whole sentences, in order, with nothing lost between them", () => {
    const text = "He went to St. Basil at Caesarea. There he read Matt. 5 with him! Then he left.";
    expect(sentencesOf(text)).toEqual(["He went to St. Basil at Caesarea.", "There he read Matt. 5 with him!", "Then he left."]);
    expect(sentencesOf("   ")).toEqual([]);
  });

  it("is nothing where a text has no paragraph to light", () => {
    expect(batchOf("life/x", "A title", "Purify", [{ kind: "title", sentences: ["A title."] }])).toBeNull();
  });
});

describe("the lives", () => {
  it("are one recording a life, each paragraph in its place on the saint's page", async () => {
    const batches = await lifeBatches();
    const withLife = SAINTS.filter((s) => s.life?.length);
    expect(batches).toHaveLength(withLife.length);
    for (const saint of withLife.slice(0, 40)) {
      const b = batches.find((x) => x.id === `life/${saint.slug}`)!;
      expect(places(b)).toEqual(saint.life.map((_, i) => `1:${i}`));
      expect(b.by).toBe("Purify");
      expect(b.blocks[0]).toEqual({ kind: "title", sentences: [`The life of ${saint.name.replace(/[.\s]+$/, "")}.`] });
    }
  });
});

describe("the councils", () => {
  it("are one recording a section, the document's own words and not the editor's note", async () => {
    const batches = await councilBatches();
    expect(batches.length).toBeGreaterThan(300);
    const nicaea = COUNCILS.find((c) => c.slug === "first-nicaea")!;
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/councils/first-nicaea/the-twenty-canons.json"), "utf8")) as { sections: { n: number; framing?: string; paragraphs: string[] }[] };
    for (const s of raw.sections) {
      const b = batches.find((x) => x.id === `council/first-nicaea/the-twenty-canons/${s.n}`)!;
      expect(b, `section ${s.n}`).toBeTruthy();
      expect(places(b)).toEqual(s.paragraphs.map((_, i) => `${s.n}:${i}`));
      expect(b.by).toBe(nicaea.byname);
      if (s.framing) expect(JSON.stringify(b)).not.toContain(s.framing.slice(0, 60));
    }
  });
});

describe("theology and history", () => {
  it("are a study's parts and an event's whole account, the paragraphs in the page's own places", async () => {
    const theology = await theologyBatches();
    const history = await historyBatches();
    expect(theology.length).toBeGreaterThan(20);
    expect(history.length).toBeGreaterThan(20);
    // A study's first part opens with its summary, part 0 on the page.
    const papacy = theology.find((b) => b.id === "theology/papacy/1")!;
    expect(places(papacy)[0]).toBe("0:0");
    expect(places(papacy).slice(1).every((p) => p.startsWith("1:"))).toBe(true);
    // An event's account runs through the page's four runs, in order.
    const pentecost = history.find((b) => b.id === "history/pentecost")!;
    const runs = places(pentecost).map((p) => Number(p.split(":")[0]));
    expect(runs).toEqual([...runs].sort((a, b) => a - b));
    expect(new Set(runs).size).toBeGreaterThan(1);
  });

  it("no batch reads an em dash aloud as a word, and none is empty", async () => {
    for (const b of [...(await theologyBatches()), ...(await historyBatches()), ...(await lifeBatches())]) {
      expect(b.words, b.id).toBeGreaterThan(0);
      expect(b.blocks.every((x) => x.sentences.every((s) => s.trim().length > 0)), b.id).toBe(true);
      expect(new Set(places(b)).size, `${b.id}: a place named twice`).toBe(places(b).length);
      expect(b.title.includes(EM_DASH), b.id).toBe(false);
    }
  });
});

describe("timings handed back", () => {
  const batch = batchOf("life/x", "The life of X", "Purify", [
    { kind: "title", sentences: ["The life of X."] },
    { kind: "para", at: { sectionN: 1, paragraphIdx: 0 }, sentences: ["One.", "Two."] },
  ])!;
  const good: ListenTimings = { voice: "af_heart", seconds: 6, blocks: [{ s: [[0, 1.5]] }, { at: { sectionN: 1, paragraphIdx: 0 }, s: [[2, 3], [3.4, 5.5]] }] };

  it("fit their batch block for block", () => {
    expect(timingsFit(batch, good)).toBeNull();
  });

  it("are refused when a block, a place or a sentence is missing, or time runs backwards", () => {
    expect(timingsFit(batch, { ...good, blocks: good.blocks.slice(0, 1) })).toMatch(/blocks timed/);
    expect(timingsFit(batch, { ...good, blocks: [good.blocks[0], { at: { sectionN: 1, paragraphIdx: 1 }, s: good.blocks[1].s }] })).toMatch(/another place/);
    expect(timingsFit(batch, { ...good, blocks: [good.blocks[0], { at: good.blocks[1].at, s: [[2, 3]] }] })).toMatch(/sentences timed/);
    expect(timingsFit(batch, { ...good, blocks: [good.blocks[0], { at: good.blocks[1].at, s: [[2, 3], [2.5, 2.4]] }] })).toMatch(/backwards/);
    expect(timingsFit(batch, { ...good, seconds: 4 })).toMatch(/ends before/);
  });
});
