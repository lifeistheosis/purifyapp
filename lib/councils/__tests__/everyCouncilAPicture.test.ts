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

import { describe, expect, it } from "vitest";

import { councilBooks } from "@/lib/councils/books";
import { COUNCILS } from "@/lib/councils/councils";
import { fatherFaces } from "@/lib/councils/fathers";
import { councilPicture } from "@/lib/councils/page";
import { iconRightsFor } from "@/lib/saints/iconRights";
import { getSaint } from "@/lib/saints/saints";

/** Councils whose head has no picture, by slug. */
const HEADS: Record<string, string> = {
  // The local councils: none has a picture History shows (lib/councils/page.ts,
  // councilEvent), so each head is its words alone and its books plates.
  "carthage-256": "search: Updates 45, build 97 note 4",
  "antioch-268": "search: Updates 45, build 97 note 4",
  "ancyra-314": "search: Updates 45, build 97 note 4",
  "neocaesarea-315": "search: Updates 45, build 97 note 4",
  "gangra": "search: Updates 45, build 97 note 4",
  "antioch-341": "search: Updates 45, build 97 note 4",
  "sardica": "search: Updates 45, build 97 note 4",
  "laodicea": "search: Updates 45, build 97 note 4",
  "constantinople-394": "search: Updates 45, build 97 note 4",
  "carthage-419": "search: Updates 45, build 97 note 4",
  "orange-529": "search: Updates 45, build 97 note 4",
  "jerusalem-1672": "search: Updates 45, build 97 note 4",
};

/** Fathers with no face on a council's page, as "<council slug>: <his name as the council names him>". */
const FATHERS: Record<string, string> = {
  // St Nectarius's settled icon is a scene of his council (NOT_HIS_FACE).
  // The other four have no page in Purify, so no picture of them has been
  // looked for until now.
  "first-constantinople: St. Nectarius of Constantinople": "search: Updates 45, build 97 note 4",
  "constantinople-394: St. Nectarius of Constantinople": "search: Updates 45, build 97 note 4",
  "antioch-268: Firmilian of Caesarea": "search: Updates 45, build 97 note 4",
  "antioch-268: Malchion": "search: Updates 45, build 97 note 4",
  "orange-529: St. Caesarius of Arles": "search: Updates 45, build 97 note 4",
  "jerusalem-1672: Dositheos II, Patriarch of Jerusalem": "search: Updates 45, build 97 note 4",
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
