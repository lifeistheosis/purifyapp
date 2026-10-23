// The councils' documents (lib/councils/councils.ts and data/councils/).
// 1.8 hosts the nine that were "pending" on the Seven's pages or had no page:
// St. Cyril's second and third letters, the sentence against Nestorius and the
// Formula of Reunion at Ephesus; the Definition of Chalcedon, with the Tome of
// St. Leo opened in the reading room; the Sentence of the Synod and the Fifteen
// Anathemas against Origen at the Fifth Council; St. Agatho's letters and the
// Prosphoneticus at the Sixth; and with the Sixth, the 102 canons of the
// Council in Trullo (692). All from Percival, NPNF II 14 (1900).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";
import type { CouncilDocumentContent } from "@/lib/councils/load";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const DASH = String.fromCharCode(0x2014);

function load(council: string, slug: string): CouncilDocumentContent | null {
  const file = path.join(ROOT, "data", "councils", council, `${slug}.json`);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as CouncilDocumentContent) : null;
}

const HOSTED_IN_18 = [
  ["ephesus", "the-second-letter-of-cyril"],
  ["ephesus", "the-third-letter-of-cyril"],
  ["ephesus", "the-sentence-against-nestorius"],
  ["ephesus", "the-formula-of-reunion"],
  ["chalcedon", "the-definition-of-faith"],
  ["second-constantinople", "the-sentence-of-the-synod"],
  ["second-constantinople", "the-fifteen-anathemas-against-origen"],
  ["third-constantinople", "the-letter-of-agatho"],
  ["third-constantinople", "the-prosphoneticus"],
  ["third-constantinople", "the-sentence-against-the-monothelites"],
  ["third-constantinople", "the-canons-of-trullo"],
  ["ancyra-314", "the-twenty-five-canons"],
  ["neocaesarea-315", "the-fifteen-canons"],
  ["gangra", "the-synodical-letter-and-canons"],
  ["antioch-341", "the-synodal-letter-and-canons"],
  ["laodicea", "the-sixty-canons"],
  ["sardica", "the-twenty-canons"],
  ["carthage-419", "the-african-code"],
  ["carthage-256", "the-sentences-of-the-bishops"],
  ["carthage-256", "the-synodal-letter-to-januarius"],
  ["constantinople-394", "the-acts"],
] as const;

// The provincial synods whose canons stood in the Church's first code and to
// which the Council in Trullo set its seal (its canon II), added in 1.8 with
// accounts of our own: how many canons each has.
const LOCAL_CANONS: Record<string, number> = {
  "ancyra-314": 25,
  "neocaesarea-315": 15,
  gangra: 20,
  "antioch-341": 25,
  laodicea: 60,
  sardica: 20,
  "carthage-419": 138,
};

describe("council documents", () => {
  it("has a file for every document the registry lists, under its own council and slug", () => {
    for (const c of COUNCILS) {
      for (const d of c.documents) {
        if (d.href) continue;
        const doc = load(c.slug, d.slug);
        expect(doc, `${c.slug}/${d.slug}`).not.toBeNull();
        expect(doc!.council, d.slug).toBe(c.slug);
        expect(doc!.slug, d.slug).toBe(d.slug);
        expect(doc!.sections.map((s) => s.n), d.slug).toEqual(doc!.sections.map((_, i) => i + 1));
      }
    }
  });

  it("opens a document read elsewhere in the app where it is", () => {
    const linked = COUNCILS.flatMap((c) => c.documents.filter((d) => d.href));
    expect(linked.map((d) => d.slug)).toContain("the-tome-of-leo");
    for (const d of linked) {
      const m = d.href!.match(/^\/saints\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
      expect(m, d.href).not.toBeNull();
      expect(fs.existsSync(path.join(ROOT, "data", "saints", m![1], `${m![2]}.json`)), d.href).toBe(true);
    }
  });

  it("lists nothing as pending that is now hosted", () => {
    for (const [council, slug] of HOSTED_IN_18) {
      const c = COUNCILS.find((x) => x.slug === council)!;
      const title = c.documents.find((d) => d.slug === slug)!.title;
      for (const p of c.pendingDocuments ?? []) expect(p.title, council).not.toBe(title);
    }
    // only Carthage 256 still waits for something: St. Cyprian's other letters on baptism
    const waiting = COUNCILS.filter((c) => HOSTED_IN_18.some(([x]) => x === c.slug) && (c.pendingDocuments ?? []).length > 0);
    expect(waiting.map((c) => c.slug)).toEqual(["carthage-256"]);
  });

  for (const [council, slug] of HOSTED_IN_18) {
    it(`${council}/${slug}: in the registry, marked, and our words without an em dash`, () => {
      expect(COUNCILS.find((c) => c.slug === council)?.documents.some((d) => d.slug === slug)).toBe(true);
      const doc = load(council, slug)!;
      expect(doc.review?.status).toBe("awaiting-clergy-review");
      expect(doc.source).toMatch(/Nicene and Post-Nicene Fathers, Series II, Vol\. 14|The Ante-Nicene Fathers, Vol\. 5/);
      expect(doc.sections.some((s) => s.framing), "an introduction").toBe(true);
      for (const s of doc.sections) {
        // the Ancient Epitomes, the Latin texts and the remarks in brackets are the 1900 volume's, not ours
        for (const ours of [s.framing ?? "", ...(s.notes ?? []).filter((n) => !/^(Ancient Epitome|The Latin text: |\()/.test(n))]) expect(ours.includes(DASH), ours).toBe(false);
      }
      expect(doc.sections.every((s) => s.paragraphs.every((p) => p.split(/\s+/).length <= 600)), "paragraph length").toBe(true);
    });
  }

  it("gives each provincial synod its canons, its account marked ours, and the seal of Trullo", () => {
    const trulloII = load("third-constantinople", "the-canons-of-trullo")!.sections[2].paragraphs.join(" ");
    const sealed: Record<string, string> = {
      "ancyra-314": "Ancyra",
      "neocaesarea-315": "Neocæsarea",
      gangra: "Gangra",
      "antioch-341": "Antioch",
      laodicea: "Laodicea",
      sardica: "Sardica",
      "carthage-419": "Carthage",
    };
    for (const [slug, count] of Object.entries(LOCAL_CANONS)) {
      const c = COUNCILS.find((x) => x.slug === slug)!;
      expect(c.kind, slug).toBe("local");
      expect(c.review?.status, slug).toBe("awaiting-clergy-review");
      const ours = [c.shortBio, ...c.defined, ...c.condemned, ...c.life, c.reception?.note ?? ""].join("\n");
      expect(ours.includes(DASH), slug).toBe(false);
      expect(/["“”]/.test(ours), slug).toBe(false);
      expect(trulloII, slug).toContain(sealed[slug]);
      const doc = load(slug, c.documents[0].slug)!;
      const canons = doc.sections.filter((s) => /^Canon [IVXLC]+(\. .+)?$/.test(s.title));
      expect(canons.map((s) => s.title), slug).toHaveLength(count);
      for (const s of canons) expect(s.paragraphs.length, `${slug} ${s.title}`).toBeGreaterThan(0);
    }
  });

  it("gives the Council in Trullo its 102 canons, each with its Ancient Epitome", () => {
    const trullo = load("third-constantinople", "the-canons-of-trullo")!;
    expect(trullo.sections).toHaveLength(103);
    expect(trullo.sections[1].title).toBe("Canon I");
    expect(trullo.sections[102].title).toBe("Canon CII");
    for (const s of trullo.sections.slice(1)) {
      expect(s.paragraphs.length, s.title).toBeGreaterThan(0);
      expect(s.notes?.[0], s.title).toMatch(new RegExp(`^Ancient Epitome of ${s.title}: `));
    }
    // canon XCV names the heresies whose followers are received by certificate and anathema
    expect(trullo.sections[95].paragraphs.join(" ")).toContain("And the Manichæans, and Valentinians and Marcionites");
  });

  it("gives St. Cyril's twelve Anathematisms and the fifteen against Origen one section each", () => {
    const cyril = load("ephesus", "the-third-letter-of-cyril")!;
    expect(cyril.sections.slice(1).map((s) => s.title)).toEqual(
      ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map((n) => `Anathematism ${n}`),
    );
    expect(cyril.sections[1].paragraphs[0]).toMatch(/^If anyone will not confess that the Emmanuel is very God/);
    const origen = load("second-constantinople", "the-fifteen-anathemas-against-origen")!;
    expect(origen.sections).toHaveLength(16);
    expect(origen.sections[15].title).toBe("Anathema XV");
  });

  it("sets the Greek as the 1900 page prints it, and notes the page's own misprints", () => {
    // the transcription writes some accents as their Greek Extended forms
    const nfc = (s: string) => s.normalize("NFC");
    const all = HOSTED_IN_18.map(([c, s]) => nfc(JSON.stringify(load(c, s))));
    // the transcription's slips, read against the scan (pp. 218, 318, 319, 394, 403)
    for (const slip of ["τὴυ", "δημιρυργός", "ψυχὴ῾", "ἐκ τὴς", "spirit νοῦς", "ὀΨὲ", "῾Ελλη νιών",
      // and the words it changed, found by reading every real-word difference from the scan
      "and shall call his name Jesus", "many ways to show the divine", "tears, or its stability",
      "may be shown to have followed", "he shows that the human will", "in those let them glory",
      "immovably stands fast", "despising this own bishop", "fallen unto various faults",
      "faithful layman,", "reliques, on which", "presbyter worth of rule", "it is shown them by divine",
      "A presbyter and deacons, who"]) {
      expect(all.some((t) => t.includes(nfc(slip))), slip).toBe(false);
    }
    const origen = load("second-constantinople", "the-fifteen-anathemas-against-origen")!;
    expect(nfc(origen.sections[11].paragraphs[0])).toContain(nfc("immaterial ψύσις"));
    expect(nfc(origen.sections[11].paragraphs[0])).toContain(nfc("only spirit (νοῦς)"));
    expect(nfc(origen.sections[11].notes?.[0] ?? "")).toContain(nfc("φύσις"));
    const cyril = load("ephesus", "the-third-letter-of-cyril")!;
    expect(nfc(cyril.sections[0].paragraphs.join(" "))).toContain(nfc("πρὸς ἕνωσον φυσικήν"));
    expect(nfc(cyril.sections[0].notes?.[0] ?? "")).toContain(nfc("ἕνωσιν"));
  });

  it("closes every bracket and quotation within its paragraph, save the one the 1900 page leaves open", () => {
    const open: string[] = [];
    for (const [council, slug] of HOSTED_IN_18) {
      for (const s of load(council, slug)!.sections) {
        s.paragraphs.forEach((p, i) => {
          for (const [a, b] of [["(", ")"], ["[", "]"], ["“", "”"]]) {
            if (p.split(a).length !== p.split(b).length) open.push(`${slug} ${s.n}.${i} ${a}${b}`);
          }
        });
      }
    }
    // St. Paul to the Galatians in the Sentence of the Synod, printed (p. 308) with no opening mark
    expect(open).toEqual(["the-sentence-of-the-synod 1.13 “”"]);
  });
});
