// Listen on the texts beside the Bible, on the reader's side: which
// recording an address is, what is being read at a moment, and that no page
// offers a Listen that has nothing behind it.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { playingOf, readHref, shareHref } from "@/lib/player/steps";

import { listenOfSrc, listenRecording, readingAt } from "../recordings";
import { idOfSavedSrc, idOfShelf, isTextShelf, shelfChapters, shelfName, shelfOf } from "../shelf";
import { listenSteps, parseListenId, type ListenTimings } from "../texts";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("a recording's address", () => {
  it("is in Purify's bucket, and names its text both ways", () => {
    const src = listenRecording("council/first-nicaea/the-twenty-canons/7");
    expect(src).toBe("https://audio.purifyapp.net/listen/council/first-nicaea/the-twenty-canons/7.mp3");
    expect(listenOfSrc(src)?.id).toBe("council/first-nicaea/the-twenty-canons/7");
    expect(listenOfSrc("https://audio.purifyapp.net/read/john/1.mp3")).toBeNull();
    expect(listenOfSrc("https://audio.purifyapp.net/listen/work/athanasius-the-great/life-of-antony/1.mp3")?.ref).toEqual({ kind: "work", slug: "athanasius-the-great", doc: "life-of-antony", n: 1 });
    expect(listenOfSrc("https://audio.purifyapp.net/listen/sermon/x/1.mp3")).toBeNull();
    expect(listenOfSrc(null)).toBeNull();
  });

  it("is known to the player: Read opens the page at the part being read", () => {
    const playing = playingOf(listenRecording("council/first-nicaea/the-twenty-canons/7"));
    expect(playing).toEqual({ kind: "text", id: "council/first-nicaea/the-twenty-canons/7", href: "/councils/first-nicaea/the-twenty-canons#s7" });
    expect(readHref(playing)).toBe("/councils/first-nicaea/the-twenty-canons#s7");
    expect(shareHref(playing)).toBe("/councils/first-nicaea/the-twenty-canons");
    expect(readHref(playingOf(listenRecording("life/anthony-the-great")))).toBe("/saints/anthony-the-great");
    // A chapter of the Bible is still a chapter.
    expect(playingOf("https://audio.purifyapp.net/read/john/1.mp3")).toEqual({ kind: "chapter", book: "john", chapter: 1 });
  });
});

describe("what is being read at a moment", () => {
  const t: ListenTimings = {
    voice: "af_heart",
    seconds: 12,
    blocks: [{ s: [[0, 1.5]] }, { at: { sectionN: 1, paragraphIdx: 0 }, s: [[2, 4], [4.5, 6]] }, { s: [[6.5, 8]] }, { at: { sectionN: 1, paragraphIdx: 1 }, s: [[8.5, 11]] }],
  };

  it("is the last sentence whose start has passed, the pause after it still its own", () => {
    expect(readingAt(t, 0)).toEqual({ block: 0, sentence: 0 });
    expect(readingAt(t, 1.8)).toEqual({ block: 0, sentence: 0 });
    expect(readingAt(t, 2.1)).toEqual({ block: 1, sentence: 0 });
    expect(readingAt(t, 5)).toEqual({ block: 1, sentence: 1 });
    expect(readingAt(t, 7)).toEqual({ block: 2, sentence: 0 });
    expect(readingAt(t, 11.5)).toEqual({ block: 3, sentence: 0 });
  });
});

describe("Listen on the pages", () => {
  it("is offered on every text he named, by the recording's own name", () => {
    expect(read("components/saints/SaintLife.tsx")).toContain('<ListenHere id={listenId("life", saint.slug)}');
    expect(read("components/councils/CouncilSections.tsx")).toContain('id={listenId("council", council.slug, content.slug, s.n)}');
    expect(read("components/theology/StudyPartText.tsx")).toContain('<ListenHere id={listenId("theology", study.slug, undefined, part)}');
    expect(read("components/history/EventArticle.tsx")).toContain('<ListenHere id={listenId("history", meta.slug)}');
    expect(read("components/saints/WritingReader.tsx")).toContain('id={listenId("work", saint.slug, content.slug, sec.n)}');
  });

  it("stands only where the text has a recording: no button that plays nothing", () => {
    const here = read("components/reading/ListenHere.tsx");
    expect(here).toContain("const available = useHasListen(id);");
    expect(here).toMatch(/if \(!available\) return null;/);
    // The list a build carries starts empty and grows only from checked timings.
    expect(read("scripts/listen-index.mjs")).toContain("why = timingsFit(batch,");
    const carried = JSON.parse(read("data/listen/index.json")) as string[];
    const served = JSON.parse(read("public/audio/listen/index.json")) as string[];
    expect(carried).toEqual(served);
    for (const id of carried) expect(fs.existsSync(path.join(process.cwd(), "public/audio/listen", `${id}.json`)), id).toBe(true);
  });

  it("a council's words are heard in the language they were recorded in", () => {
    expect(read("components/councils/CouncilSections.tsx")).toMatch(/\{text === "en" \? \(\s*<ListenHere/);
  });

  it("plays through the one player, and keeps the reader's place in the text", () => {
    const play = read("lib/listen/play.ts");
    expect(play).toContain("setTrack(listenSrc(id), {");
    expect(play).toContain("rate: readSpeed(),");
    expect(play).toContain("const at = startOf(placeKey(id), 0);");
  });
});

describe("previous and next", () => {
  const recorded = ["council/first-nicaea/the-twenty-canons/2", "council/first-nicaea/the-twenty-canons/3", "council/first-nicaea/the-twenty-canons/7", "council/first-nicaea/the-synodal-letter/3", "theology/papacy/1", "theology/papacy/2", "life/anthony-the-great", "history/pentecost"];

  it("are the sections of the same document that have a recording, by their numbers", () => {
    expect(listenSteps("council/first-nicaea/the-twenty-canons/3", recorded)).toEqual({ previous: "council/first-nicaea/the-twenty-canons/2", next: "council/first-nicaea/the-twenty-canons/7" });
    expect(listenSteps("council/first-nicaea/the-twenty-canons/2", recorded)).toEqual({ previous: null, next: "council/first-nicaea/the-twenty-canons/3" });
    expect(listenSteps("council/first-nicaea/the-twenty-canons/7", recorded).next).toBeNull();
    expect(listenSteps("theology/papacy/1", recorded)).toEqual({ previous: null, next: "theology/papacy/2" });
  });

  it("never step out of a document into another, and a life or an event stands alone", () => {
    expect(listenSteps("council/first-nicaea/the-synodal-letter/3", recorded)).toEqual({ previous: null, next: null });
    expect(listenSteps("life/anthony-the-great", recorded)).toEqual({ previous: null, next: null });
    expect(listenSteps("history/pentecost", recorded)).toEqual({ previous: null, next: null });
  });

  it("are in the player, and a recording that ends rolls on into the next", () => {
    const steps = read("components/player/PlayerSteps.tsx");
    expect(steps).toContain('if (playing?.kind === "text") {');
    expect(steps).toContain("go: () => void startListening(next)");
    const here = read("components/reading/ListenHere.tsx");
    expect(here).toContain("const { next } = stepsOf(id);");
    expect(here).toContain("if (began) router.push(listenHref(ref));");
    // A recording stepped to from any page is named by its own timings.
    expect(read("scripts/listen-index.mjs")).toContain("title: batch.title, by: batch.by");
  });
});

describe("a text kept on the phone", () => {
  const ids = ["council/first-nicaea/the-twenty-canons/7", "work/athanasius-the-great/life-of-antony/2", "theology/papacy/2", "life/anthony-the-great", "history/pentecost"];

  it("is kept as a book's chapter is, on a shelf no book of the Bible can be mistaken for", () => {
    for (const id of ids) {
      const { book, chapter } = shelfOf(parseListenId(id)!);
      expect(isTextShelf(book), id).toBe(true);
      expect(book).toMatch(/^~[a-z0-9~-]+$/);
      expect(idOfShelf(book, chapter)).toBe(id);
      // The address its saved file plays from names it too, so the player still knows what it is.
      expect(idOfSavedSrc(`https://localhost/_capacitor_file_/data/files/audio/read/${book}/${chapter}.mp3`)).toBe(id);
      expect(listenOfSrc(`https://localhost/_capacitor_file_/data/files/audio/read/${book}/${chapter}.mp3`)?.id).toBe(id);
    }
    expect(isTextShelf("john")).toBe(false);
    expect(idOfShelf("john", 1)).toBeNull();
    expect(idOfSavedSrc("https://localhost/_capacitor_file_/audio/read/john/1.mp3")).toBeNull();
  });

  it("is saved with the rest of its document, and named plainly under Storage", () => {
    const recorded = ["council/first-nicaea/the-twenty-canons/2", "council/first-nicaea/the-twenty-canons/7", "council/first-nicaea/the-synodal-letter/1", "life/anthony-the-great"];
    expect(shelfChapters(parseListenId("council/first-nicaea/the-twenty-canons/7")!, recorded)).toEqual([2, 7]);
    expect(shelfChapters(parseListenId("life/anthony-the-great")!, recorded)).toEqual([0]);
    expect(shelfName("~council~first-nicaea~the-twenty-canons")).toBe("First Nicaea · The Twenty Canons");
    expect(shelfName("~work~athanasius-the-great~life-of-antony")).toBe("Athanasius the Great · Life of Antony");
    expect(shelfName("~history~pentecost")).toBe("Pentecost");
  });

  it("goes through the Bible's own saving: Plus asked first, Wi-Fi waited for, the same mark and the same row", () => {
    expect(read("lib/readAloud/saving.ts")).toContain("const text = idOfShelf(book, chapter);");
    const mark = read("components/player/SaveOffline.tsx");
    expect(mark).toContain("const shelf = shelfOfListen(text.id);");
    expect(mark).toMatch(/if \(\(await plusFeaturesNow\(\)\) === false\) \{\s*upgrade\.open\("offline"/);
    expect(read("components/settings/StorageSection.tsx")).toContain("isTextShelf(b.book) ? shelfName(b.book)");
    expect(read("lib/listen/recordings.ts")).toContain("savedSrc(shelf.book, shelf.chapter)");
  });
});

