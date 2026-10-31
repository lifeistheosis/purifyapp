// The saint web (1.8): the owner's round 1, A and B on one screen with a
// switch. Built from the app's own data and nothing written for it
// (lib/saints/web.ts). What a reader would notice if this broke: a tie the
// data does not hold, a year read off a day or a count, a sentence cut after
// "St.", a saint joined to a monastery or a feast named for another, a web
// offered to a saint nobody is joined to, or a Timeline that loses people the
// web shows.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";
import { publishedEvents } from "@/lib/history/events";
import { SAINTS } from "@/lib/saints/saints";
import {
  councilTag,
  dateYear,
  hasWeb,
  lifeSpan,
  namedIn,
  saintWeb,
  sentenceYear,
  shortName,
  splitSentences,
  webSlugs,
} from "@/lib/saints/web";

describe("a registry date line", () => {
  it("gives its year, and what the brackets add", () => {
    expect(dateYear("c. 330 (Caesarea in Cappadocia)")).toEqual({ at: 330, year: "c. 330", note: "Caesarea in Cappadocia" });
    expect(dateYear("January 1, 379")).toEqual({ at: 379, year: "379" });
    expect(dateYear("12 March 604 (Rome)")).toEqual({ at: 604, year: "604", note: "Rome" });
    expect(dateYear("May 381 (Constantinople, during the Second Council)")?.at).toBe(381);
    expect(dateYear("The Dormition, c. 41 (Jerusalem)")).toEqual({ at: 41, year: "c. 41", note: "Jerusalem" });
    expect(dateYear("c. AD 29 (beheaded at Machaerus)")?.year).toBe("c. 29");
    expect(dateYear("c. 338–340 (Bodbe, Kakheti)")?.year).toBe("c. 338");
  });

  it("says c. where the line leaves the year open", () => {
    expect(dateYear("December 13, 1836 or 1837 (Spruce Island, Alaska)")?.year).toBe("c. 1836");
  });

  it("gives none where there is no single year to stand on", () => {
    for (const line of [
      undefined,
      "1st century (Galilee)",
      "Fourth century (beyond the Danube)",
      "c. 166 BC (Antioch, under Antiochus IV Epiphanes)",
      "Alexander 340; John 595; Paul 784",
      "February 14, 869 (Cyril, Rome) and April 6, 885 (Methodius, Moravia)",
      "May 24. The year is given as 596 in some accounts and 597 in others, and the difference is not resolved here.",
      "Tradition: Jerusalem, to Ss. Joachim and Anna",
    ]) {
      expect(dateYear(line), String(line)).toBeNull();
    }
  });

  it("makes a life's span only from both ends", () => {
    expect(lifeSpan({ born: "c. 329 (Arianzus in Cappadocia)", reposed: "January 25, 390" })).toBe("c. 329–390");
    expect(lifeSpan({ born: undefined, reposed: "January 25, 390" })).toBeUndefined();
  });
});

describe("a Life, sentence by sentence", () => {
  it("is cut at a full stop, never after St., c. or an initial", () => {
    expect(
      splitSentences("He kept the teaching of St. Gregory the Wonderworker. He was born c. 330. J. N. W. B. Robertson put it in English. Then he died."),
    ).toEqual([
      "He kept the teaching of St. Gregory the Wonderworker.",
      "He was born c. 330.",
      "J. N. W. B. Robertson put it in English.",
      "Then he died.",
    ]);
    expect(splitSentences("His last words: 'Glory to God for all things.' He was buried at Comana.")).toEqual([
      "His last words: 'Glory to God for all things.'",
      "He was buried at Comana.",
    ]);
  });

  it("joins back into every Life without losing a word", () => {
    for (const s of SAINTS) {
      for (const p of s.life) {
        const parts = splitSentences(p);
        expect(parts.join(" ").replace(/\s+/g, " "), s.slug).toBe(p.trim().replace(/\s+/g, " "));
        for (const part of parts) expect(part, s.slug).not.toMatch(/\b(?:St|Sts|c)\.$/);
      }
    }
  });

  it("finds the year a sentence stands at, and only a year", () => {
    expect(sentenceYear("Made bishop of Caesarea in 370, he confronted both the Arian emperor Valens.")).toEqual({ at: 370, year: "370" });
    expect(sentenceYear("Born in Alexandria around 296, Athanasius was raised in a Christian household.")).toEqual({ at: 296, year: "c. 296" });
    expect(sentenceYear("It was at Antioch, in the Lent of 387, that he became the voice of a terrified city.")?.at).toBe(387);
    expect(sentenceYear("A community of about 300 monks gathered round him.")).toBeNull();
    expect(sentenceYear("He was one of the 318 Fathers.")).toBeNull();
    expect(sentenceYear("He wrote it in 166 BC.")).toBeNull();
    expect(sentenceYear("He lived in peace.")).toBeNull();
  });
});

describe("the names a sentence holds", () => {
  it("counts a saint, and not a monastery, a feast or an icon named for one", () => {
    expect(namedIn("He was a friend of Gregory the Theologian.", "basil-the-great")).toEqual(["gregory-theologian"]);
    expect(namedIn("He was taken to the women's monastery of St. John the Theologian at Souroti.", "paisios-the-athonite")).toEqual([]);
    expect(namedIn("He reposed on the feast of the Entry of the Mother of God.", "iakovos-of-evia")).toEqual([]);
    expect(namedIn("He travelled with the Kursk Root icon of the Mother of God.", "john-of-shanghai")).toEqual([]);
    expect(namedIn("He was granted a vision of the Mother of God.", "sergius-of-radonezh")).toEqual(["theotokos"]);
  });
});

describe("a saint's web", () => {
  const bySlug = new Map(SAINTS.map((s) => [s.slug, s]));

  it("is offered to the saints the data joins to someone, and to no one else", () => {
    const slugs = webSlugs();
    expect(slugs.length).toBeGreaterThan(60);
    for (const s of SAINTS) {
      const web = saintWeb(s.slug);
      expect(hasWeb(s.slug), s.slug).toBe(web !== null);
      if (web) expect(web.nodes.length, s.slug).toBeGreaterThan(0);
    }
    // St Herman's Alaska mission names him alone: no web.
    expect(hasWeb("herman-of-alaska")).toBe(false);
  });

  it("joins only what the data joins, both ways", () => {
    for (const slug of webSlugs()) {
      const web = saintWeb(slug)!;
      for (const node of web.nodes) {
        if (node.kind === "council") {
          const council = COUNCILS.find((c) => c.slug === node.slug)!;
          expect(council.principalFathers?.some((f) => f.slug === slug), `${slug} at ${node.slug}`).toBe(true);
          continue;
        }
        const other = node.person.slug;
        expect(other, slug).not.toBe(slug);
        for (const tie of node.ties) {
          if (tie.kind === "disciple") expect(bySlug.get(slug)!.disciples?.some((d) => d.slug === other), `${slug} > ${other}`).toBe(true);
          if (tie.kind === "teacher") expect(bySlug.get(other)!.disciples?.some((d) => d.slug === slug), `${other} > ${slug}`).toBe(true);
          if (tie.kind === "history") {
            const event = publishedEvents().find((e) => tie.href === `/history/${e.slug}`)!;
            expect(event.rel?.saints, `${slug} ${tie.href}`).toEqual(expect.arrayContaining([slug, other]));
          }
          if (tie.kind === "life") {
            const life = bySlug.get(tie.life!.slug)!.life.join(" ");
            expect(life.replace(/\s+/g, " "), `${slug} ${other}`).toContain(tie.text.replace(/\s+/g, " "));
          }
        }
        // The web is the same from the other end.
        expect(saintWeb(other)?.nodes.some((n) => n.id === `saint:${slug}`), `${other} back to ${slug}`).toBe(true);
      }
    }
  });

  it("is St Nicholas at Nicaea with its fathers, and Constantine through the event", () => {
    const web = saintWeb("nicholas-the-wonderworker")!;
    const ids = web.nodes.map((n) => n.id);
    expect(ids[0]).toBe("council:first-nicaea");
    for (const s of ["athanasius-the-great", "alexander-of-alexandria", "hosius-of-cordova", "eustathius-of-antioch", "spyridon-of-trimythous", "constantine-the-great"]) {
      expect(ids, s).toContain(`saint:${s}`);
    }
    const athanasius = web.nodes.find((n) => n.id === "saint:athanasius-the-great")!;
    expect(athanasius.ties[0]).toMatchObject({ kind: "council", tag: "Nicaea, 325", via: "council:first-nicaea" });
    // One moment at Nicaea, not the council and the event twice.
    expect(web.timeline.filter((r) => r.at === 325 && r.kind !== "life")).toHaveLength(1);
  });

  it("tells the Timeline in his Life's order and the years of the Church, and loses no one", () => {
    for (const slug of webSlugs()) {
      const web = saintWeb(slug)!;
      for (let i = 1; i < web.timeline.length; i++) {
        expect(web.timeline[i].at, `${slug} row ${i}`).toBeGreaterThanOrEqual(web.timeline[i - 1].at);
      }
      const shown = new Set([...web.timeline.flatMap((r) => ("people" in r ? r.people : [])), ...web.undated]);
      for (const node of web.nodes) expect(shown.has(node.id), `${slug} ${node.id}`).toBe(true);
    }
    const basil = saintWeb("basil-the-great")!;
    expect(basil.center.years).toBe("c. 330–379");
    expect(basil.timeline.map((r) => r.kind)).toEqual(["born", "life", "life", "life", "reposed"]);
    expect(basil.timeline.find((r) => r.kind === "life" && r.year === "370")).toBeTruthy();
  });

  it("tells the Council of 381 as the witnesses do: St Meletius presided at its opening, St Gregory after his death (the owner's note 48 of build 80)", () => {
    // Socrates V.8, Sozomen VII.7 to 8 and Theodoret V.8 (NPNF II 2 and 3) and the 1894 editors of NPNF II 7:
    // no witness has Gregory open the council (docs/editorial-standards.md, clergy queue item 25).
    const row = saintWeb("gregory-theologian")!.timeline.find((r) => r.kind === "life" && r.at === 381);
    expect(row?.kind === "life" && row.text).toBe(
      "When the Second Ecumenical Council met at Constantinople in 381, St. Meletius of Antioch presided at its opening and confirmed Gregory as archbishop of the city, and when Meletius died during the council, Gregory presided in his place.",
    );
    expect(row?.kind === "life" && row.people).toContain("saint:meletius-of-antioch");
    const english = SAINTS.find((s) => s.slug === "gregory-theologian")!.life.join(" ");
    const german = (JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/saints/gregory-theologian/i18n/de.json"), "utf8")) as { life: string[] }).life.join(" ");
    expect(english).not.toMatch(/opened the Second Ecumenical Council/);
    expect(german).not.toMatch(/Konzil[^.]*eröffnete/);
    expect(german).toContain("präsidierte der heilige Meletius von Antiochien dessen Eröffnung und bestätigte Gregor als Erzbischof der Stadt; als Meletius während des Konzils starb, präsidierte Gregor an seiner Stelle.");
  });

  it("names a council by its place and year, and a saint without his St.", () => {
    expect(councilTag({ location: "Nicaea in Bithynia (modern İznik, Türkiye)", year: 325 })).toBe("Nicaea, 325");
    expect(councilTag({ location: "Chalcedon (modern Kadıköy, İstanbul, Türkiye), across the Bosphorus", year: 451 })).toBe("Chalcedon, 451");
    expect(shortName("St. Basil the Great")).toBe("Basil the Great");
    expect(shortName("Sts. Cyril and Methodius")).toBe("Cyril and Methodius");
    expect(shortName("The Most Holy Theotokos")).toBe("The Most Holy Theotokos");
  });
});
