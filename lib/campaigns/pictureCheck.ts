import "server-only";

import { rekognitionCheckFromEnv } from "./pictureCheckRekognition";

// The automatic check a picture passes before any person sees it.
//
// THE SERVICE IS CHOSEN, AND ONLY ITS KEY IS MISSING. His "rec yes to all"
// of 2026-11-10: Amazon's content moderation for nudity and violence, with
// PhotoDNA for known illegal images added when Microsoft approves it. The
// first is written (./pictureCheckRekognition.ts) and is in force on a
// server whose environment carries its key. With no key there is no check,
// and with no check no picture is accepted at all (lib/campaigns/pictures.ts,
// addPicture), whatever the pictures' own switch says (lib/campaigns/parts.ts).
// So there are still two locks, and both are his: the key, pasted into the
// server by his hand, and the switch, turned in the code once his other
// steps are done (the registration with NCMEC and the Copyright Office's
// agent; docs/1.9-build/OWNER-STEPS.md).
//
// WHAT A SERVICE HAS TO ANSWER:
//
//   clear    Nothing found that the rules do not allow. The picture is
//            stored, held, and waits for a moderator, who looks at every
//            picture while campaigns are new. What the service noticed
//            short of a refusal is kept beside it for the moderator.
//   refuse   Nudity, violence, or anything else the rules do not allow. The
//            picture is not stored. Its writer is told it cannot be used.
//   report   A known illegal image. The picture is never shown to anyone and
//            the team is told at once. NO SERVICE WIRED HERE ANSWERS THIS
//            YET: the one that would is PhotoDNA. What must then be kept,
//            and who must be told, is to be written from the guidance for
//            providers of NCMEC's CyberTipline once Purify is registered
//            there, and the branch that handles this verdict (addPicture)
//            says so where it stands: it is not to be relied on until then.
//
// The check is given the picture as the server made it again from its
// pixels, which is the picture that would be stored. It is never given who
// uploaded it.

export type PictureVerdict = {
  verdict: "clear" | "refuse" | "report";
  /** A few words for the moderators' record: the service's own category, never a description of a person. */
  detail: string;
};

export type PictureCheck = (bytes: Buffer, contentType: string) => Promise<PictureVerdict>;

/** A test's own check, or null for none. Undefined: whatever this server's environment gives. */
let override: PictureCheck | null | undefined;
/** The service for the key in the environment, made once: a server's environment does not change while it runs. */
let fromKey: { check: PictureCheck | null } | null = null;

/** The check in force, or null when no key is set on this server. */
export function pictureCheck(): PictureCheck | null {
  if (override !== undefined) return override;
  fromKey ??= { check: rekognitionCheckFromEnv() };
  return fromKey.check;
}

/**
 * Test seam: a check as a case needs it, null for none, or undefined to go
 * back to what the environment gives (read afresh). Never called by the app.
 */
export function __setPictureCheck(next: PictureCheck | null | undefined): void {
  override = next;
  fromKey = null;
}
