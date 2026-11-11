// Every saint a picture, but the named few still waiting for one (build 93
// note 12; the pre-build gate's part 3, CLAUDE.md: "no saint and no work
// stands without a picture unless it is on the named list of permissions
// awaited"). His words, 2026-11-11: "Ensure every single saint has a icon
// photo". The works have their own list (lib/reading/__tests__/
// coverArt.test.ts, WAITING); this is the saints' pages.
//
// A saint with no picture stands here by name with what he waits for:
//   permission  a modern icon, until its painter or monastery gives written
//               permission (docs/1.9-build/ICON-PERMISSIONS.md, Admin's
//               letters); the only kind the gate lets through
//   search      no free picture has passed yet, and the chat named is
//               looking (an old icon, or the oldest public-domain picture
//               whose freedom can be shown in its row)
//   his word    a picture found, waiting on the owner
// Each leaves this list in the commit that gives him his picture, and a
// saint with no picture who is not named here fails it.
//
// What would go wrong if this broke: a saint on the plain plate that no one
// is looking for, or a test build cut while a saint waits on a search
// rather than a permission.

import { describe, expect, it } from "vitest";

import { SAINTS } from "@/lib/saints/saints";

const WAITING: Record<string, string> = {
  // Modern saints, the owner's word of 2026-11-10 ("modern saints on the
  // plate until a painter or monastery gives written permission"); who to
  // write to is in docs/1.9-build/ICON-PERMISSIONS.md.
  "paisios-the-athonite": "permission: the Hesychasterion of St John the Theologian, Souroti",
  "porphyrios-of-kavsokalyvia": "permission: Efstathios Giannis, through the Church of Greece's Synodal Committee on Divine Worship",
  "silouan-the-athonite": "permission: the Monastery of St John the Baptist, Tolleshunt Knights (St Sophrony's icon of 1988)",
  "justin-popovic": "permission: the Eparchy of Valjevo",
  "cleopas-of-sihastria": "permission: the Romanian Patriarchate (the icon of 2024, Răzvan and Mihaela Bădescu)",
  "sofian-of-antim": "permission: the Romanian Patriarchate (the icon of 2024, Răzvan and Mihaela Bădescu)",
  "dumitru-staniloae": "permission: the Romanian Patriarchate (the icon of 2024, Răzvan and Mihaela Bădescu)",
  // Updates 2's search (build 93 note 12), at Commons' pace.
  "symeon-the-new-theologian": "permission: the Monastery of the Virgin Mary the Consolatory, Brownsburg-Chatham, Quebec (no older picture of him is free)",
  "mark-of-ephesus": "permission: Brian Whirledge, Goshen, Indiana, unless the owner takes the Eleon workshop's own CC BY icon (no clean free picture of him is older)",
  "xenia-of-petersburg": "permission: Holy Cross Monastery, Wayne, West Virginia (glorified in 1988; no picture of her is free)",
  // November's and December's saints are the November and December chat's
  // (docs/1.9-build/notes/november-saints.md, december-saints.md).
  "arsenius-of-prislop": "permission: the Diocese of Deva and Hunedoara (the Church's icon of 2025; its painter not named)",
  "iakovos-of-evia": "permission: Lydia Gourioti, iconographer",
  "sophrony-of-essex": "permission: the Monastery of St John the Baptist, Tolleshunt Knights (Sister Gabriela's icon)",
  "philoumenos-of-jacobs-well": "permission: the Holy Metropolis of Morphou (the icons of Hieromonk Ambrosios, 2009, and Michalis Koullepos, 1999)",
  "gabriel-of-georgia": "permission: the Georgian Patriarchate (no icon with a named painter found; its address not yet confirmed from its own site)",
  "theodota-mother-of-the-unmercenaries": "permission: the Byzantine and Christian Museum, Athens (to say which St Theodota its mural BXM 1371 is; no icon of her with a named maker found)",
  "marcian-of-cyrrhus": "permission: the Orthodox Church in America (the unsigned icon on its page for him)",
  "nicander-and-hermas": "permission: the Orthodox Church in America (the unsigned icon on its page for their day)",
  "lazarus-of-galesion": "permission: the Holy Metropolis of Oropos and Phyle (an unsigned icon; no address found yet)",
  "onesiphorus-and-porphyrius": "permission: the Ephorate of Antiquities of Thessaloniki City (a full-size photograph of the Rotunda's mosaic of the two)",
  "arsenius-of-cappadocia": "permission: the Hesychasterion of St John the Theologian, Souroti",
  "zacchaeus-and-alphaeus": "permission: no icon of them found yet, so no one to write to",
  "irenarchus-and-the-seven-women": "permission: the Orthodox Church in America (the unsigned icon on its page for him)",
  "elias-of-murom": "permission: the Orthodox Church in America (the unsigned icon on its page for him)",
  // January's saints (1.9): twenty took their pictures in the January chat's
  // pushes 2 and 3 (docs/1.9-build/notes/january-saints.md); these two have
  // none that passes. The icon oca.org shows on the Prophet Micaiah's day is
  // the Prophet Micah of the Twelve (filed under August 14, his scroll Micah
  // 5:2), another prophet's face, so it is not asked for.
  "prophet-micaiah": "search: the January chat found none (Weigel's engraving of 1695 shows him struck; oca.org's icon on his day is the Prophet Micah of the Twelve)",
  "george-the-chozebite": "permission: the Orthodox Church in America (the unsigned icon on its page for him, with St Domnica and St Helladius: a detail of him alone)",
};

/** The saints whose pages have no picture: no entry of the saint names one (a saint may stand in the registry more than once). */
function withoutPicture(): string[] {
  const has = new Map<string, boolean>();
  for (const s of SAINTS) has.set(s.slug, Boolean(has.get(s.slug)) || Boolean(s.iconUrl));
  return [...has].filter(([, pictured]) => !pictured).map(([slug]) => slug).sort();
}

describe("every saint", () => {
  it("has a picture, but the named few still waiting for one", () => {
    expect(withoutPicture()).toEqual(Object.keys(WAITING).sort());
    for (const [slug, why] of Object.entries(WAITING)) expect(why, slug).toMatch(/^(permission|search|his word): ./);
  });

  it("waits on a permission only where the list for Admin's letters names him", async () => {
    const fs = await import("node:fs");
    const list = fs.readFileSync("docs/1.9-build/ICON-PERMISSIONS.md", "utf8");
    const names = new Map(SAINTS.map((s) => [s.slug, s.name.replace(/^Sts?\. /, "")]));
    for (const [slug, why] of Object.entries(WAITING)) {
      if (!why.startsWith("permission:")) continue;
      expect(list, slug).toContain(`## St ${names.get(slug)}`);
    }
  });
});
