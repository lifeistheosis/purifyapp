// Verified clergy: who may carry the seal, and how it reads.
//
// A reader asks from their profile (rank, jurisdiction, parish, and how the
// team can check), the team verifies by hand in the admin console, and the
// seal then stands beside their name on every post, reply and profile
// (20261005000000_community_three.sql, clergy_verifications). Nothing is automatic:
// a seal that confers standing in a church is decided by a person.
//
// Pure: the routes, the feed and the editor share the ranks.

export const CLERGY_RANKS = ["bishop", "priest", "deacon", "monastic"] as const;
export type ClergyRank = (typeof CLERGY_RANKS)[number];

/**
 * What a post or reply carries for its author: the rank, or "clergy" for a
 * seal granted before the rank was recorded.
 */
export type ClergyMark = ClergyRank | "clergy";

export function isClergyRank(v: unknown): v is ClergyRank {
  return typeof v === "string" && (CLERGY_RANKS as readonly string[]).includes(v);
}

export function isClergyMark(v: unknown): v is ClergyMark {
  return v === "clergy" || isClergyRank(v);
}

/** The seal's name, e.g. "Verified priest". */
export function clergyLabelKey(mark: ClergyMark): string {
  return `clergy.seal.${mark}`;
}

/** Clergy who answer questions in Ask a Priest, with their seal. Monastics answer too. */
export function answersQuestions(mark: ClergyMark | null | undefined): boolean {
  return isClergyMark(mark);
}

export type ClergyStatus = "none" | "requested" | "verified" | "declined";

/** A reader's own request, as their editor shows it. */
export type MyClergy = {
  status: ClergyStatus;
  rank: ClergyRank | null;
  jurisdiction: string | null;
  parish: string | null;
  /** The team's note back, on a decline. */
  note: string | null;
};

/** What anyone may see of a verified reader. */
export type PublicClergy = {
  rank: ClergyRank | null;
  jurisdiction: string | null;
  parish: string | null;
};

export const CLERGY_TEXT_MAX = 80;
export const CLERGY_EVIDENCE_MAX = 600;
