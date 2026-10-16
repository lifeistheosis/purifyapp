import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { akathistTitleKey, getAkathist, listAkathists } from "@/lib/prayers/akathists";

/**
 * The Akathist to the Theotokos, stanza by stanza (1.7).
 *
 * Until 1.7 the file shipped a first kontakion and ikos in a modern wording
 * under a citation of Hapgood's Service Book of 1906, which does not print
 * the Akathist at all (its contents list no akathist; checked on the Cornell
 * scan, cu31924029363128), and a third stanza that was a placeholder asking
 * readers to write in. The Cherubic Hymn precedent in attribution.test.ts is
 * the same failure: a modern rendering wearing a public-domain label.
 *
 * What ships now is only what is verified: the opening Kontakion as Hapgood
 * prints it (in the Divine Liturgy celebrated by a Bishop), with one honest
 * line about the rest. docs/editorial/ingest-review/akathist-theotokos.md
 * records the check and what the rest of the hymn waits on.
 */

const STANZA = /^(kontakion|ikos)-(\d+)$/;

describe("the Akathist to the Theotokos", () => {
  const akathist = getAkathist("theotokos")!;

  it("is a stanza-by-stanza hymn, every stanza a kontakion or an ikos with its own refrain", () => {
    expect(akathist.kind).toBe("akathist");
    expect(akathist.prayers.length).toBeGreaterThan(0);
    for (const p of akathist.prayers) {
      expect(p.id, p.id).toMatch(STANZA);
      expect((p.text ?? "").trim(), p.id).not.toBe("");
      expect((p.refrain ?? "").trim(), `${p.id} has its refrain`).not.toBe("");
    }
    // Kontakia 2 to 13 end in Alleluia, so no one refrain is the whole hymn's.
    expect(akathist.refrain).toBeUndefined();
  });

  it("ships no placeholder and asks no reader to typeset it", () => {
    const text = JSON.stringify(akathist);
    expect(akathist.prayers.some((p) => !STANZA.test(p.id))).toBe(false);
    expect(text).not.toMatch(/needs-content|team@purify\.app|being typeset|placeholder/i);
  });

  it("carries no modern wording under the 1906 citation", () => {
    // The two stanzas it used to ship, in the wording of a living publisher.
    const text = JSON.stringify(akathist);
    for (const modern of ["Champion Leader", "as ones rescued out of sufferings", "taking bodily form"]) {
      expect(text.includes(modern), modern).toBe(false);
    }
    expect(akathist.source).toMatch(/Hapgood/);
    expect(akathist.source).toMatch(/cu31924029363128/);
    expect(akathist.prayers[0].text).toMatch(/^We, thy servants, in that we have been delivered from calamity/);
    expect(akathist.prayers[0].refrain).toBe("Hail, O Bride Unwedded!");
  });

  it("is named in the catalogs, and so is each kind of stanza", () => {
    const messages = en as Record<string, string>;
    for (const a of listAkathists()) expect(messages[akathistTitleKey(a.slug)], a.slug).toBeTypeOf("string");
    expect(messages["prayers.akathist.kontakion"]).toContain("{n}");
    expect(messages["prayers.akathist.ikos"]).toContain("{n}");
  });
});
