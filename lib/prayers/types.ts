// Shared prayer content types. Imported by both the client reader
// (components/prayers/PrayerRuleReader.tsx) and the server-safe rule
// registry (lib/prayers/rules.ts), so it carries no "use client" or fs.
//
// Content rule (non-negotiable, enforced editorially): every `text` here is
// a verbatim public-domain Orthodox prayer. Nothing is generated, rewritten,
// or merged across translations. Where jurisdictions differ, each wording is
// kept as its own `PrayerVariant` with an explicit `source`, never blended.

/**
 * One jurisdiction's verbatim wording of a prayer. The reader renders a quiet
 * tab row when a prayer carries more than one, so the texts stay distinct and
 * each keeps its own attribution.
 */
export type PrayerVariant = {
 /** e.g. "Pan-Orthodox (common)", "ROCOR (Jordanville)", "OCA", "Antiochian", "Greek", "Serbian". */
 jurisdiction: string;
 /** Verbatim public-domain source, shown beneath the text. */
 source: string;
 /** The prayer text, verbatim. `\n\n` separates stanzas. */
 text: string;
 /** Optional rubric specific to this wording (overrides the prayer's). */
 instruction?: string;
 /** Optional refrain specific to this wording. */
 refrain?: string;
};

export type Prayer = {
 id: string;
 title: string;
 instruction?: string;
 /** Single verbatim text. Used when a prayer has one common wording. */
 text?: string;
 /**
  * Two or more jurisdiction wordings. When present the reader shows a
  * switcher and `text` is ignored. Never merge these into one.
  */
 variants?: PrayerVariant[];
 /** Optional MP3 path under /public. */
 audio?: string;
 /** For akathists: the refrain spoken after this stanza. */
 refrain?: string;
 /**
  * Where the faithful make the sign of the Cross (1.7): the opening words of
  * each line of `text` it is made at. The reader sets the app's drawn cross
  * beside that line. Only ever written where a rubric says so: this prayer's
  * own instruction or title, or, for a rule's first prayer, the rule's
  * opening rubric. Never invented (lib/prayers/__tests__/cross.test.ts).
  */
 cross?: string[];
 /**
  * A step brought in from another rule (Your rule, 1.7): the edition its
  * words come from, shown under it, since the rule it now stands in has no
  * one source of its own.
  */
 source?: string;
 /** ...and where it came from, so a bookmark names it in its own rule. */
 origin?: { ruleId: string; prayerId: string };
};

export type Rule = {
 id: string;
 title: string;
 subtitle?: string;
 intro: string;
 estimatedMinutes: number;
 /** Rule-level attribution; per-prayer variants may carry their own. */
 source: string;
 /** Rule-level jurisdiction label, shown in the header when set. */
 jurisdiction?: string;
 prayers: Prayer[];
 /** Optional refrain spoken after every odd-indexed stanza (akathist pattern). */
 refrain?: string;
 /**
  * Kind of rule, which controls headings and UI affordances. "custom" is a
  * reader's own rule, composed on the device (lib/prayers/myRule.ts).
  */
 kind?: "rule" | "akathist" | "hour" | "compline" | "custom";
};
