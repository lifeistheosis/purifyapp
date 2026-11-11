// The chants' words shown only where they are confirmed (build 93, the
// owner's word of 2026-11-11: "the lyrics on some of the chants is wrong, so
// fix that"; the arbiter's rule: each line checked against what the
// recording sings and against a published text of the chant in that
// language, wrong lines mended from the published text, and any line that
// cannot be confirmed hidden, so the recording still plays with the rest).
//
// A hidden line keeps its place and its time in the data, with the reason
// (ChantLine.hidden), and reaches no reader: not the page, and not the timing
// file the app is given, whose own words Pray with chant draws. Each line's
// verdict and what the speech model heard: docs/chants/lyrics-check.md.

import { describe, expect, it } from "vitest";

import { allChants, forPage } from "@/lib/chants/registry.server";
import { servedTiming, timingFile } from "@/lib/chants/timing.server";

const versions = allChants().flatMap((c) => c.variants.map((v, k) => ({ c, v, k, id: `${c.slug}/${v.id}` })));
const hiddenOf = (slug: string, id: string) =>
  allChants()
    .find((c) => c.slug === slug)!
    .variants.find((v) => v.id === id)!
    .lines.flatMap((l, i) => (l.hidden ? [i] : []));
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe("the chants' words", () => {
  it("hide every line that is not the words sung, or not confirmed in the singing", () => {
    // Note 78's marks said so in the data and the page showed the line
    // anyway: the nearest public-domain wording where the singers sing
    // another, and words a speech model heard only in part.
    for (const { v, id } of versions) {
      v.lines.forEach((l, i) => {
        if (l.nearest || l.unsure) expect(l.hidden, `${id} line ${i + 1}: "${l.text}"`).toBeTruthy();
      });
    }
  });

  it("keep a hidden line out of the page and out of the timing the app is given, line for line", () => {
    for (const { c, v, k, id } of versions) {
      const page = forPage(c).variants[k];
      const shown = v.lines.filter((l) => !l.hidden);
      expect(page.lines.map((l) => l.text), id).toEqual(shown.map((l) => l.text));
      for (const l of page.lines) expect("hidden" in l, id).toBe(false);
      if (!v.timing) continue;
      const file = `${v.id}.json`;
      const onDisk = timingFile(c.slug, file)!;
      const served = servedTiming(c.slug, file)!;
      // The file keeps every line and its time; the app is given the shown ones.
      expect(onDisk.lines).toHaveLength(v.lines.length);
      expect(served.lines.map((l) => l.text), id).toEqual(shown.map((l) => l.text));
      const at = v.lines.flatMap((l, i) => (l.hidden ? [] : [onDisk.lines[i].at]));
      expect(served.lines.map((l) => l.at), id).toEqual(at);
    }
  });

  it("hide the Prayer Rope Anthem's Arabic, a transcription a reader reports wrong, until a listener's words are checked", () => {
    const ar = allChants()
      .find((c) => c.slug === "prayer-rope-anthem")!
      .variants.find((v) => v.id === "ar")!;
    expect(hiddenOf("prayer-rope-anthem", "ar")).toEqual(range(0, ar.lines.length - 1));
    // The recording still plays: the version and its timing stay.
    expect(ar.timing).toBeDefined();
    expect(ar.audio.src).toBeTruthy();
  });

  it("hide the Paschal Canon's words, Hapgood's English, which the recording does not sing", () => {
    // The recording sings a translation of our own time in every hymn (the
    // troparion as "by death He has trampled upon death"); Hapgood's English
    // stays in the data and plays no part in the singing.
    const canon = allChants().find((c) => c.slug === "paschal-canon")!.variants[0];
    expect(hiddenOf("paschal-canon", "en")).toEqual(range(0, canon.lines.length - 1));
    expect(forPage(allChants().find((c) => c.slug === "paschal-canon")!).variants[0].lines).toEqual([]);
  });

  it("show the English and French Prayer Rope Anthem whole, every line heard as written", () => {
    expect(hiddenOf("prayer-rope-anthem", "en")).toEqual([]);
    expect(hiddenOf("prayer-rope-anthem", "fr")).toEqual([]);
  });

  it("hide in the English Psalm 135 the first halves no public-domain printing has as sung", () => {
    // The thirteen of note 78, and verse 26, heard as "the Lord of heaven"
    // where the King James has "the God of heaven".
    expect(hiddenOf("psalm-135", "en")).toEqual([12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 76, 88, 96, 100]);
  });

  it("hide in the Serbian Psalm 135 the four first halves the singer sings otherwise than Daničić", () => {
    // u nasleđe (verses 21 and 22, note 78's), koji nas se seti (23) and
    // svakomu telu (25), heard with the recording whole.
    expect(hiddenOf("psalm-135", "sr")).toEqual([80, 84, 88, 96]);
  });

  it("hide in the Greek Psalm 135 the eleven first halves the model could not hear, until a listener confirms them", () => {
    // Verses 5, 8 to 11, 13, 16, 21 and 22 unheard however they were heard;
    // 25 and 26 heard only in part. The refrain and the Alleluia stay.
    expect(hiddenOf("psalm-135", "el")).toEqual([16, 28, 32, 36, 40, 48, 60, 80, 84, 96, 100]);
  });

  it("hide in the Arabic psalms the verses sung in words no public-domain printing gives, and those not heard", () => {
    // Psalm 135: the nine first halves the choir sings in the Antiochian
    // Arabic, and the last Alliluia, sung long.
    expect(hiddenOf("psalm-135", "ar")).toEqual([4, 8, 12, 16, 20, 24, 28, 32, 36, 39]);
    // Psalm 117: every verse the singers sing in the Antiochian words, told
    // apart by hearing the whole recording (verse 19 among them, "fa-adkhulha").
    expect(hiddenOf("psalm-117", "ar")).toEqual([3, 4, 6, 9, 10, 13, 14, 17, 20, 23, 26, 29, 32, 35, 41, 42, 43, 44]);
  });
});
