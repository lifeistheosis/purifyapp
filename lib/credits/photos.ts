import { FIGURES } from "@/lib/readAloud/covers";
import { COUNCIL_COVERS, FEELING_COVERS } from "@/lib/reading/authorCovers";
import { COVER_ART, WORK_ART } from "@/lib/reading/coverArt";

/**
 * The photographs Purify's pictures are made from that their makers share
 * under a Creative Commons licence asking to be named (1.9, the owner's yes
 * to his page's 99, relayed by the arbiter on 2026-11-10: "CC BY and CC
 * BY-SA photographs are now allowed, each photographer named on a credits
 * page"). Every other picture in the app is public domain or CC0 and needs
 * no credit (docs/licensing/).
 *
 * Read from the pictures' own registries, so nothing is written twice (the
 * shape Updates asked for): the reading room's covers and doors
 * (lib/reading/coverArt.ts, authorCovers.ts) and the Bible's read-aloud
 * covers (lib/readAloud/covers.ts). A picture whose licence is CC BY or CC
 * BY-SA carries `credit`, the photographer as its Commons page asks to be
 * credited, beside the licence and the page it was read on; this lists every
 * one. The work photographed must itself be old enough to be free: a
 * photograph of a contemporary icon is never used, since the painter's
 * rights are not the photographer's to give. Under CC BY-SA, Purify's crop
 * is shared under the same licence, as the page says.
 * lib/credits/__tests__/photos.test.ts holds every such picture to a credit.
 */

export const CC_LICENCES = {
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "CC BY 2.5": "https://creativecommons.org/licenses/by/2.5/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
  "CC BY-SA 2.5": "https://creativecommons.org/licenses/by-sa/2.5/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
} as const;

export type CcLicence = keyof typeof CC_LICENCES;

export const isCcLicence = (license: string): license is CcLicence => Object.hasOwn(CC_LICENCES, license);

export type PhotoCredit = {
  /** Purify's file made from the photograph: a cover under /covers/. */
  file: string;
  /** The work photographed, in the registry's words. */
  work: string;
  /** The photographer, as the file's page asks to be credited. */
  photographer: string;
  licence: CcLicence;
  /** The file's page on Wikimedia Commons. */
  source: string;
};

/** A picture in one of the registries, as far as a credit needs it. */
type Registered = { file: string; work: string; license: string; credit?: string; evidenceUrl: string };

function registered(): Registered[] {
  const out: Registered[] = [];
  for (const art of [...Object.values(COVER_ART), ...Object.values(WORK_ART), ...Object.values(COUNCIL_COVERS), ...Object.values(FEELING_COVERS)]) {
    if (art.kind === "streamed") out.push(art);
  }
  for (const figure of Object.values(FIGURES)) if (figure) out.push(figure);
  return out;
}

/** Every credited photograph, once each, in the registries' order. */
export function photoCredits(): PhotoCredit[] {
  const seen = new Set<string>();
  const out: PhotoCredit[] = [];
  for (const r of registered()) {
    if (!isCcLicence(r.license) || seen.has(r.file)) continue;
    seen.add(r.file);
    out.push({ file: r.file, work: r.work, photographer: r.credit ?? "", licence: r.license, source: r.evidenceUrl });
  }
  return out;
}

/** The credit for one of Purify's files, if its picture is a credited photograph. */
export function creditFor(file: string): PhotoCredit | undefined {
  return photoCredits().find((c) => c.file === file);
}
