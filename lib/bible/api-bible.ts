import "server-only";
import { recordApiBibleCall } from "./apiUsage";

/**
 * API.Bible (American Bible Society) fetch layer for the LICENSED translations
 * (NKJV, NIV, NLT). Public-domain texts (KJV, Brenton LXX, WEB) never touch
 * this file, they load from local JSON.
 *
 * Compliance, per the ABS / Biblica agreements:
 * - Display cap: never request more than 2 chapters / 25 verses per call.
 * We only ever fetch ONE chapter, which is within the cap.
 * - No persistence of licensed text: callers must use a SHORT cache
 * (`revalidate` hours, far under the 30-day max) and never write it to
 * git/DB. Because nothing is durably stored, the 30-day refresh and the
 * 72-hour termination purge are satisfied automatically.
 * - Content integrity: the API HTML is rendered as delivered, footnotes
 * included; callers must not modify it or overlay Strong's/interlinear.
 * - Attribution + FUMS are emitted by the caller (ScriptureAttribution + Fums)
 * using the `copyright` and `fumsId` returned here.
 *
 * Dormant until configured: returns `null` unless BIBLE_API_KEY and the
 * translation's bibleId env var are set, so the public-domain site is
 * unaffected until the licensed translations are switched on.
 */

const API_ROOT = "https://rest.api.bible/v1";

// App translation id -> env var holding that translation's API.Bible bibleId.
const BIBLE_ID_ENV: Record<string, string> = {
 niv: "BIBLE_ID_NIV",
 nkjv: "BIBLE_ID_NKJV",
 nlt: "BIBLE_ID_NLT",
};

export function isLicensed(transId: string): boolean {
 return transId in BIBLE_ID_ENV;
}

export function bibleIdFor(transId: string): string | undefined {
 const envName = BIBLE_ID_ENV[transId];
 return envName ? process.env[envName] : undefined;
}

/** True only when the key + this translation's bibleId are configured. */
export function isApiConfigured(transId: string): boolean {
 return Boolean(process.env.BIBLE_API_KEY && bibleIdFor(transId));
}

// App book slug -> USFM book code used by API.Bible (66-book canon; the
// deuterocanon is not in these Protestant translations and stays on Brenton).
const USFM: Record<string, string> = {
 genesis: "GEN", exodus: "EXO", leviticus: "LEV", numbers: "NUM", deuteronomy: "DEU",
 joshua: "JOS", judges: "JDG", ruth: "RUT", "1-samuel": "1SA", "2-samuel": "2SA",
 "1-kings": "1KI", "2-kings": "2KI", "1-chronicles": "1CH", "2-chronicles": "2CH",
 ezra: "EZR", nehemiah: "NEH", esther: "EST", job: "JOB", psalms: "PSA",
 proverbs: "PRO", ecclesiastes: "ECC", "song-of-solomon": "SNG", isaiah: "ISA",
 jeremiah: "JER", lamentations: "LAM", ezekiel: "EZK", daniel: "DAN", hosea: "HOS",
 joel: "JOL", amos: "AMO", obadiah: "OBA", jonah: "JON", micah: "MIC", nahum: "NAM",
 habakkuk: "HAB", zephaniah: "ZEP", haggai: "HAG", zechariah: "ZEC", malachi: "MAL",
 matthew: "MAT", mark: "MRK", luke: "LUK", john: "JHN", acts: "ACT", romans: "ROM",
 "1-corinthians": "1CO", "2-corinthians": "2CO", galatians: "GAL", ephesians: "EPH",
 philippians: "PHP", colossians: "COL", "1-thessalonians": "1TH", "2-thessalonians": "2TH",
 "1-timothy": "1TI", "2-timothy": "2TI", titus: "TIT", philemon: "PHM", hebrews: "HEB",
 james: "JAS", "1-peter": "1PE", "2-peter": "2PE", "1-john": "1JN", "2-john": "2JN",
 "3-john": "3JN", jude: "JUD", revelation: "REV",
};

export type LicensedChapter = {
 html: string;
 copyright: string;
 /** FUMS tracking token to feed the <Fums> component (required by the license). */
 fumsToken: string | null;
 reference: string;
 verseCount: number;
};

/**
 * Fetch a single chapter of a licensed translation. One chapter only (within
 * the display cap). Returns null when not configured, the book isn't in the
 * translation, or the request fails (caller falls back gracefully).
 */
export async function fetchLicensedChapter(
 transId: string,
 bookSlug: string,
 chapter: number,
): Promise<LicensedChapter | null> {
 if (!isApiConfigured(transId)) return null;
 const usfm = USFM[bookSlug];
 if (!usfm) return null; // e.g. deuterocanon, not in these translations
 const bibleId = bibleIdFor(transId)!;
 const chapterId = `${usfm}.${chapter}`;
 const url =
 `${API_ROOT}/bibles/${bibleId}/chapters/${chapterId}` +
 `?content-type=html&include-notes=true&include-titles=true` +
 `&include-verse-numbers=true&include-verse-spans=false&fums-version=3`;
 try {
 const res = await fetch(url, {
 headers: { "api-key": process.env.BIBLE_API_KEY! },
 // Short cache: well under the 30-day max; nothing persisted to disk/DB.
 next: { revalidate: 60 * 60 * 6 },
 });
 if (!res.ok) return null;
 // Counted here, after a 2xx, so a refusal or an outage is not billed against
 // the quota in our own books. Deduplicated inside recordApiBibleCall on the
 // same six-hour key the fetch cache uses, so this counts real requests to
 // API.Bible rather than readers opening a cached chapter.
 recordApiBibleCall(bibleId, chapterId);
 const json = await res.json();
 const d = json?.data;
 if (!d?.content) return null;
 return {
 html: d.content as string,
 copyright: (d.copyright as string) ?? "",
 fumsToken: (json?.meta?.fumsToken as string) ?? null,
 reference: (d.reference as string) ?? `${bookSlug} ${chapter}`,
 verseCount: typeof d.verseCount === "number" ? d.verseCount : 0,
 };
 } catch {
 return null;
 }
}
