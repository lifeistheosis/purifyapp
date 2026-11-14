// Every picture in the councils, the local synods and the book covers too
// (build 97 note 4; his word, 2026-11-14 about 16:02 UTC: "please ensure every
// photo is accounted for and not missed in the councils section (even the
// local synods and book covers)").
//
// The pre-build gate's part 3 (CLAUDE.md: "no saint and no work stands
// without a picture unless it is on the named list of permissions awaited")
// was held by the saints' list and the reading room's
// (lib/saints/__tests__/everySaintAPicture.test.ts,
// lib/reading/__tests__/coverArt.test.ts). Neither counted a council's head,
// a Father on a council's page, or a council's books, so six Fathers whose
// page icons were settled and carried stood on the plate's cross on their
// councils' pages (St Juvenal, St Celestine, St Anatolius, St Eutychius, St
// Sophronius and St Irene), and no one was looking for the rest.
//
// What stands here: every council's head (its picture, lib/councils/page.ts,
// councilPicture), every Father on its page (his card and his face in the
// row, lib/councils/fathers.ts) and every book under "Read the Council's
// documents" (lib/councils/books.ts). One with no picture is named below
// with what it waits for, in the saints' list's three kinds:
//   permission  no picture is free, or none is known; the place is named in
//               docs/1.9-build/ICON-PERMISSIONS.md with why, and whom to
//               write to where there is anyone; the only kind the gate lets
//               through
//   search      no free picture has passed yet, and the chat named is looking
//   his word    a picture found, waiting on the owner
// A council's own books are windows onto its head's picture, so they wait
// with its head and are not named again. Each place leaves the list in the
// commit that gives it its picture, and one with no picture that is not named
// fails here; so does one named that has its picture.
//
// What would go wrong if this broke: a Father on the plate whose settled icon
// was in the app all along, a council's head or books with nothing on them
// that no one is looking for, or a test build cut while one waits on a search.

import fs from "node:fs";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { councilBooks, shelfCouncil } from "@/lib/councils/books";
import { COUNCILS } from "@/lib/councils/councils";
import { fatherFaces } from "@/lib/councils/fathers";
import { councilEvent, councilPicture } from "@/lib/councils/page";
import { COUNCIL_PICTURES } from "@/lib/councils/pictures";
import { creditFor, isCcLicence } from "@/lib/credits/photos";
import { CARRIED_HISTORY } from "@/lib/media/carried";
import { iconRightsFor } from "@/lib/saints/iconRights";
import { getSaint } from "@/lib/saints/saints";
import { SITE_URL } from "@/lib/site";
import { COVER_FACES } from "@/lib/today/saintFaces";

/** Councils whose head has no picture, by slug. */
const HEADS: Record<string, string> = {
  // The local councils with no picture of their own (lib/councils/pictures.ts
  // has the two found, Antioch's of 268 and Sardica's). His rule (2026-11-13):
  // a council's plate takes its real picture where one is allowed and is
  // dropped where not, so each of these heads is its words alone and its own
  // books the room's plate. Searched by Updates 45 and Updates 50 (build 97
  // note 4); each is on the list for Admin's letters with what was found.
  "carthage-256": "permission: no picture of this council is known, so no one to write to",
  "ancyra-314": "permission: no picture of this council is known, so no one to write to (Commons has a photograph of a page of its canons, not of the council)",
  "neocaesarea-315": "permission: no picture of this council is known, so no one to write to",
  "gangra": "permission: no whole picture of this council is known, so no one to write to (its panel in Bethlehem survives as a fragment with no name or words)",
  "antioch-341": "permission: no picture of this council is known, so no one to write to (the Antioch panel in Bethlehem is the council of 268's)",
  "laodicea": "permission: no picture of this council is known, so no one to write to (its panel in Bethlehem is lost)",
  "constantinople-394": "permission: no picture of this council is known, so no one to write to",
  "carthage-419": "permission: no picture of this council is known, so no one to write to (the Illustrated Chronicle's stock council scene is not its own)",
  "orange-529": "permission: the window in Orange cathedral that shows it, its maker and date not found in a heritage record; its parish, or the Diocese of Avignon",
  "jerusalem-1672": "permission: no picture of this synod is known, so no one to write to",
};

/** Fathers with no face on a council's page, as "<council slug>: <his name as the council names him>". */
const FATHERS: Record<string, string> = {
  // St Nectarius's settled icon is a scene of his council (NOT_HIS_FACE), and
  // the one fresco found under his name has lost it. Firmilian, Malchion and
  // Dositheos have no page in Purify; St Caesarius had none either, and wears
  // the face his slug names among the covers (build 97 note 4).
  "first-constantinople: St. Nectarius of Constantinople": "permission: no picture that names him is known; the Holy Monastery of Dionysiou, Mount Athos, could say whether its fresco of 1547, whose name has worn away, is he",
  "constantinople-394: St. Nectarius of Constantinople": "permission: no picture that names him is known; the Holy Monastery of Dionysiou, Mount Athos, could say whether its fresco of 1547, whose name has worn away, is he",
  "antioch-268: Firmilian of Caesarea": "permission: no picture of him is known, so no one to write to",
  "antioch-268: Malchion": "permission: no picture of him is known, so no one to write to",
  "jerusalem-1672: Dositheos II, Patriarch of Jerusalem": "permission: the engraving of 1715 in scans whose holders claim rights in them (the Onassis Library, CC BY-NC-ND 4.0; the Hellenic Institute of Venice); one of them, or a scan with no claim",
};

/** A Father whose settled page icon is not his face (a scene where he cannot be told apart), so it is not his face here either. */
const NOT_HIS_FACE: Record<string, string> = {
  "nectarius-of-constantinople": "the Paris Gregory's miniature of the Council of 381 (BnF MS grec 510, folio 355), the council in session, where he cannot be told apart (lib/saints/iconRights.ts)",
};

const KIND = /^(permission|search|his word): ./;

describe("every council", () => {
  it("has its picture at its head, but the named few still waiting for one", () => {
    for (const native of [false, true]) {
      const bare = COUNCILS.filter((c) => !councilPicture(c.slug, native)).map((c) => c.slug);
      expect(bare.sort(), native ? "in the apps" : "on the website").toEqual(Object.keys(HEADS).sort());
    }
  });

  it("shows every Father on its page with his face, but the named few still waiting for one", () => {
    for (const native of [false, true]) {
      const bare = COUNCILS.flatMap((c) => fatherFaces(c, native).filter((f) => !f.picture).map((f) => `${c.slug}: ${f.name}`));
      expect(bare.sort(), native ? "in the apps" : "on the website").toEqual(Object.keys(FATHERS).sort());
    }
  });

  it("never leaves a Father on the plate while his page's settled icon is his face", () => {
    for (const c of COUNCILS) {
      for (const [i, f] of fatherFaces(c, false).entries()) {
        const slug = c.principalFathers?.[i]?.slug;
        const icon = slug ? getSaint(slug)?.iconUrl : undefined;
        if (!icon || !iconRightsFor(icon) || slug! in NOT_HIS_FACE) continue;
        expect(f.picture, `${c.slug}: ${f.name} has a settled icon (${icon})`).toBeDefined();
      }
    }
  });

  it("gives every book under Read the Council's documents its cover, but a council's own books while its head waits", () => {
    for (const native of [false, true]) {
      for (const c of COUNCILS) {
        for (const b of councilBooks(c, native)) {
          if (b.cover) continue;
          expect(b.key, `${b.key}: a book read among a Father's works has his cover`).toMatch(new RegExp(`^councils/${c.slug}/`));
          expect(HEADS[c.slug], `${b.key}: its council's head is not waiting`).toBeDefined();
        }
      }
    }
  });

  // Build 97 note 4: a local council's own picture, once found, is drawn where
  // the seven's are (lib/councils/pictures.ts), and its photographer named.
  it("draws a local council's own picture at its head, on its own books and its shelf, credited", async () => {
    expect(Object.keys(COUNCIL_PICTURES).sort()).toEqual(["antioch-268", "sardica"]);
    for (const [slug, own] of Object.entries(COUNCIL_PICTURES)) {
      const c = COUNCILS.find((x) => x.slug === slug)!;
      expect(c.kind, slug).toBe("local");
      expect(councilEvent(slug), `${slug} has a History event: its picture is that one`).toBeUndefined();
      for (const native of [false, true]) {
        const picture = councilPicture(slug, native)!;
        // The website's file, asked of the website in the apps: History's way, not carried as the seven's are.
        expect(picture.src, slug).toBe(native ? `${SITE_URL}${own.hero}` : own.hero);
        expect(CARRIED_HISTORY, slug).not.toContain(own.hero.replace(/\.jpg$/, ".avif"));
        // Its AVIF and its preview, made by scripts/history-media.mjs.
        expect(picture.avif, slug).toBe((native ? SITE_URL : "") + own.hero.replace(/\.jpg$/, ".avif"));
        expect(picture.preview, slug).toMatch(/^data:image\/webp;base64,/);
        // Credited where History's pictures are: the photographer and the licence in the line at its foot.
        expect(picture.credit, slug).toContain(own.license);
        if (own.credit) expect(picture.credit, slug).toContain(own.credit);
        const own_books = councilBooks(c, native).filter((b) => b.key.startsWith(`councils/${slug}/`));
        expect(own_books.length, slug).toBeGreaterThan(0);
        for (const b of own_books) expect(b.cover?.src, b.key).toBe(picture.src);
        expect(shelfCouncil(c, native, "50% 5%").picture, slug).toEqual({ src: picture.src, focus: "50% 5%", credit: picture.credit });
      }
      for (const file of [own.hero, own.hero.replace(/\.jpg$/, ".avif")]) expect(fs.existsSync(`public${file}`), file).toBe(true);
      const meta = await sharp(`public${own.hero}`).metadata();
      expect([meta.width, meta.height], slug).toEqual([own.width, own.height]);
      // A CC BY or CC BY-SA photograph's maker is on the Credits page too, as St Victorinus's is.
      if (isCcLicence(own.license)) expect(creditFor(own.hero)?.photographer, slug).toBe(own.credit);
      expect(own.evidenceUrl, slug).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });

  it("gives a Father with no page the face his slug names among the covers, linking nowhere", () => {
    const orange = COUNCILS.find((c) => c.slug === "orange-529")!;
    const [web] = fatherFaces(orange, false);
    expect(web.name).toBe("St. Caesarius of Arles");
    expect(getSaint("caesarius-of-arles")).toBeFalsy();
    expect(web.href).toBeUndefined();
    expect(web.picture).toMatchObject({ src: "/covers/authors/caesarius-of-arles.v1.jpg", focusY: 38, across: COVER_FACES["caesarius-of-arles"][0] });
    // In the apps it is the website's, as St Augustine's portrait is at Carthage (419): a local council's faces are not carried.
    expect(fatherFaces(orange, true)[0].picture?.src).toBe(`${SITE_URL}/covers/authors/caesarius-of-arles.v1.jpg`);
  });

  it("names what each waits for, and every permission is on the list for Admin's letters", () => {
    const list = fs.readFileSync("docs/1.9-build/ICON-PERMISSIONS.md", "utf8");
    for (const [slug, why] of Object.entries(HEADS)) {
      expect(why, slug).toMatch(KIND);
      const c = COUNCILS.find((x) => x.slug === slug)!;
      if (why.startsWith("permission:")) expect(list, slug).toContain(`## ${c.byname}`);
    }
    for (const [place, why] of Object.entries(FATHERS)) {
      expect(why, place).toMatch(KIND);
      const name = place.slice(place.indexOf(": ") + 2).replace(/^Sts?\.\s+/, "St ");
      if (why.startsWith("permission:")) expect(list, place).toContain(`## ${name}`);
    }
    for (const [slug, why] of Object.entries(NOT_HIS_FACE)) expect(why.trim(), slug).toBeTruthy();
  });
});
