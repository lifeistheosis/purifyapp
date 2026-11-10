import "server-only";

// The automatic check a picture passes before any person sees it.
//
// NO SERVICE IS CHOSEN YET, and that is the whole of this file's meaning
// today. His yes to item 121 has pictures "checked first", and waits for two
// things that are his: the service that does the checking, and a lawyer's
// word on what the law says must be reported and kept (the notes, 3.5 and
// 8.3). Until both are in, PICTURE_CHECK is null, and with it null no picture
// is accepted at all (lib/campaigns/pictures.ts, addPicture), whatever the
// pictures' own switch says (lib/campaigns/parts.ts). So turning that switch
// on by mistake opens nothing: there are two locks, and this is the second.
//
// WHAT A SERVICE HAS TO ANSWER, when one is wired in here:
//
//   clear    Nothing found. The picture is stored, held, and waits for a
//            moderator, who looks at every picture while campaigns are new.
//   refuse   Nudity, violence, or anything else the rules do not allow. The
//            picture is not stored. Its writer is told it cannot be used.
//   report   A known illegal image. The picture is never shown to anyone and
//            the team is told at once. WHAT MUST THEN BE KEPT, AND WHO MUST
//            BE TOLD, IS THE LAWYER'S ANSWER, and the branch that handles
//            this verdict (addPicture) says so where it stands: it is not to
//            be relied on until that answer is written into it.
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

/** The service. None yet: see above. */
export const PICTURE_CHECK: PictureCheck | null = null;

let check: PictureCheck | null = PICTURE_CHECK;

/** The check in force, or null when no service is wired in. */
export function pictureCheck(): PictureCheck | null {
  return check;
}

/** Test seam: a check as a case needs it. Never called by the app. */
export function __setPictureCheck(next: PictureCheck | null): void {
  check = next;
}
