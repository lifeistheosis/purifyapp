import "server-only";

import sharp from "sharp";

import { signRequest } from "@/lib/security/awsSigV4";

import type { PictureCheck, PictureVerdict } from "./pictureCheck";

// The automatic check of a campaign's picture: Amazon Rekognition's content
// moderation (DetectModerationLabels), the service he chose on 2026-11-10
// ("rec yes to all": an AWS account for the check). It looks at a picture
// for nudity, sexual content, violence and hate symbols before any person
// does.
//
// WHAT IT IS NOT. It knows no list of known illegal images, so it never
// answers "report". That is a second check of another kind (matching
// against a list kept by those the law names), which waits for Microsoft's
// approval of PhotoDNA and is not written yet. Every picture is also looked
// at by a moderator before anyone but its creator can see it, whatever this
// says (./pictures.ts).
//
// ONLY HIS KEY IS MISSING. With no key on the server there is no check, and
// with no check no picture is accepted (./pictureCheck.ts). The key is three
// values in the server's environment, never in the code and never in chat:
//
//   PICTURE_CHECK_AWS_ACCESS_KEY_ID
//   PICTURE_CHECK_AWS_SECRET_ACCESS_KEY
//   PICTURE_CHECK_AWS_REGION            such as us-east-1
//
// The key should be allowed one thing only, rekognition:DetectModerationLabels,
// so that a leaked key can look at pictures and do nothing else.
//
// IT FAILS CLOSED. A key that is half set or misshapen is no key. A picture
// that is not the JPEG the server made, a call that times out, an answer
// that is not 200, an answer that is not the shape the service documents:
// each is "the check could not answer", which addPicture treats as no pass
// and tells the reader to try again later. Nothing is stored either way.
//
// WHAT IS SENT. The picture's bytes, as the server made them again from its
// pixels (no EXIF, so no place and no device), and nothing else: not who
// uploaded it, not the campaign, not a name. The service's documentation is
// what the request and the answer are written to (the API reference's
// DetectModerationLabels page, read 2026-11-10); the taxonomy of labels is
// its three-level table of the same day.
//
// NOT YET PROVED AGAINST THE SERVICE ITSELF. No key exists as this is
// written, so the tests answer as the documentation says the service does
// (lib/campaigns/__tests__/pictureCheckRekognition.test.ts). The first real
// picture, with his key, is the proof that the service reads the JPEGs this
// server writes (they are progressive) and signs as tested. For 1.9 that is
// on the main web, in his own campaign after the merge, while campaigns are
// live for his account alone: he chose no test web on 2026-11-11
// (docs/1.9-build/OWNER-STEPS.md, P1 step 7 and P5).

export type RekognitionConfig = { accessKeyId: string; secretAccessKey: string; region: string };

/** The names the key is read from. */
export const PICTURE_CHECK_ENV = {
  id: "PICTURE_CHECK_AWS_ACCESS_KEY_ID",
  secret: "PICTURE_CHECK_AWS_SECRET_ACCESS_KEY",
  region: "PICTURE_CHECK_AWS_REGION",
} as const;

// A region is part of the address the picture is sent to, so it is held to
// the shape of a region and nothing else can be put there: us-east-1,
// eu-central-1, ap-southeast-2, us-gov-west-1.
const REGION = /^[a-z]{2}(?:-[a-z]{2,12}){1,3}-[0-9]$/;
const KEY_ID = /^[A-Z0-9]{16,128}$/;
const SECRET = /^[A-Za-z0-9/+=]{16,128}$/;

let warned = false;

/**
 * The key, read from the server's environment: all three values, each of
 * its own shape, or none. A key that is half there is said once in the log,
 * by the names of what is wrong and never by a value.
 */
export function rekognitionConfig(env: Readonly<Record<string, string | undefined>> = process.env): RekognitionConfig | null {
  const accessKeyId = (env[PICTURE_CHECK_ENV.id] ?? "").trim();
  const secretAccessKey = (env[PICTURE_CHECK_ENV.secret] ?? "").trim();
  const region = (env[PICTURE_CHECK_ENV.region] ?? "").trim();
  if (!accessKeyId && !secretAccessKey && !region) return null;
  const wrong = [
    KEY_ID.test(accessKeyId) ? null : PICTURE_CHECK_ENV.id,
    SECRET.test(secretAccessKey) ? null : PICTURE_CHECK_ENV.secret,
    REGION.test(region) ? null : PICTURE_CHECK_ENV.region,
  ].filter((name): name is NonNullable<typeof name> => name !== null);
  if (wrong.length > 0) {
    if (!warned) {
      warned = true;
      console.warn(`[campaigns] the picture check's key is not usable, so pictures stay closed: ${wrong.join(", ")} missing or misshapen`);
    }
    return null;
  }
  return { accessKeyId, secretAccessKey, region };
}

// ── What the service says, and what becomes of it ───────────────────────────

/** A label as the service returns one. */
export type ModerationLabel = { Name: string; ParentName: string; Confidence: number; TaxonomyLevel: number | null };

/** What the service is asked to mention at all: its own default. Below this it says nothing. */
export const NOTICE_AT = 50;
/** How sure the service must be of a refused kind for the picture to be refused with no person looking. */
export const REFUSE_AT = 60;

/**
 * The kinds that are refused, by the service's own names (its taxonomy of
 * 2026-11-10). The house rule a creator ticks is "nothing indecent or
 * violent" (campaigns.rules.pictures).
 *
 * Refused: everything under Explicit; nudity short of explicit that is
 * still not for a prayer page; an intimate part that is covered but is the
 * picture's subject; violence that is shown; and hate symbols.
 *
 * NOT refused, and passed to the moderator with a note of what was noticed:
 * a bare back or a man's bare chest (a patient in a hospital bed, a child at
 * the sea), a kiss (a wedding), swimwear, a weapon that is only carried (a
 * soldier someone is praying for), a body or a coffin (a funeral), a crash,
 * alcohol, tobacco, pills, a rude gesture, gambling. A person decides those.
 *
 * A label is also refused when the label over it is: so a kind the service
 * adds later under Explicit, Graphic Violence or Hate Symbols is refused
 * without this list knowing its name.
 */
export const REFUSED: ReadonlySet<string> = new Set([
  "Explicit",
  "Explicit Nudity",
  "Exposed Male Genitalia",
  "Exposed Female Genitalia",
  "Exposed Buttocks or Anus",
  "Exposed Female Nipple",
  "Explicit Sexual Activity",
  "Sex Toys",
  "Partially Exposed Buttocks",
  "Partially Exposed Female Breast",
  "Implied Nudity",
  "Obstructed Intimate Parts",
  "Obstructed Female Nipple",
  "Obstructed Male Genitalia",
  "Graphic Violence",
  "Weapon Violence",
  "Physical Violence",
  "Self-Harm",
  "Blood & Gore",
  "Explosions and Blasts",
  "Hate Symbols",
  "Nazi Party",
  "White Supremacy",
  "Extremist",
]);

/** Whether a label is of a refused kind: by its own name, or by a name over it in this answer. */
function refusedKind(label: ModerationLabel, parents: ReadonlyMap<string, string>): boolean {
  let name: string | undefined = label.Name;
  // The taxonomy is three levels deep; five steps is more than any chain, and a loop in a bad answer ends.
  for (let step = 0; name && step < 5; step++) {
    if (REFUSED.has(name)) return true;
    name = step === 0 ? label.ParentName || parents.get(name) : parents.get(name);
  }
  return false;
}

const said = (label: ModerationLabel) => `${label.Name} ${Math.round(label.Confidence)}`;

/**
 * The verdict on a picture from the labels the service returned. Pure: the
 * whole of the judgment is here and in REFUSED, and the tests walk it.
 */
export function verdictOf(labels: readonly ModerationLabel[], model: string | null = null): PictureVerdict {
  const by = model ? `Rekognition ${model}` : "Rekognition";
  const parents = new Map(labels.filter((l) => l.ParentName).map((l) => [l.Name, l.ParentName]));
  const sure = [...labels].sort((a, b) => b.Confidence - a.Confidence);
  const refused = sure.filter((l) => l.Confidence >= REFUSE_AT && refusedKind(l, parents));
  if (refused.length > 0) {
    // The most particular name it gave, which says most in fewest words.
    const worst = [...refused].sort((a, b) => (b.TaxonomyLevel ?? 0) - (a.TaxonomyLevel ?? 0) || b.Confidence - a.Confidence)[0];
    return { verdict: "refuse", detail: `${by} refused: ${said(worst)}` };
  }
  const noticed = sure.filter((l) => l.Confidence >= NOTICE_AT);
  if (noticed.length === 0) return { verdict: "clear", detail: `${by}: nothing found` };
  // A name that is over another in the list says nothing the lower one does not.
  const over = new Set(noticed.map((l) => l.ParentName).filter(Boolean));
  const particular = noticed.filter((l) => !over.has(l.Name));
  return { verdict: "clear", detail: `${by} noticed: ${particular.slice(0, 3).map(said).join(", ")}` };
}

/** The labels out of the service's answer, or a throw when it is not the answer the documentation describes. */
export function readLabels(answer: unknown): { labels: ModerationLabel[]; model: string | null } {
  if (!answer || typeof answer !== "object") throw new Error("picture check: no answer");
  const o = answer as { ModerationLabels?: unknown; ModerationModelVersion?: unknown };
  if (!Array.isArray(o.ModerationLabels)) throw new Error("picture check: an answer with no labels list");
  const labels = o.ModerationLabels.map((raw) => {
    const l = raw as { Name?: unknown; ParentName?: unknown; Confidence?: unknown; TaxonomyLevel?: unknown } | null;
    if (!l || typeof l.Name !== "string" || !l.Name || typeof l.Confidence !== "number" || !Number.isFinite(l.Confidence)) {
      throw new Error("picture check: a label that is not a label");
    }
    return {
      Name: l.Name.slice(0, 80),
      ParentName: typeof l.ParentName === "string" ? l.ParentName.slice(0, 80) : "",
      Confidence: l.Confidence,
      TaxonomyLevel: typeof l.TaxonomyLevel === "number" ? l.TaxonomyLevel : null,
    };
  });
  const model = typeof o.ModerationModelVersion === "string" && /^[0-9.]{1,12}$/.test(o.ModerationModelVersion) ? o.ModerationModelVersion : null;
  return { labels, model };
}

// ── The call ────────────────────────────────────────────────────────────────

/** What the service takes as bytes in a call: 5 MB, by its own limits page. */
export const CHECK_MAX_BYTES = 5 * 1024 * 1024;
/** The smallest picture it reads, on either side, by the same page. */
export const CHECK_MIN_EDGE = 80;
/** How long one check may take before it is held not to have answered. */
const TIMEOUT_MS = 10_000;

/** The service's errors that say this picture can never be read, however often it is sent. */
const NEVER_READABLE = new Set(["InvalidImageFormatException", "ImageTooLargeException"]);

/** The error's own name out of an answer that is not 200, for the log. Never its message, which can name the account. */
function errorName(text: string): string {
  try {
    const type = (JSON.parse(text) as { __type?: unknown }).__type;
    return typeof type === "string" ? (type.split("#").pop() ?? "").replace(/[^A-Za-z]/g, "").slice(0, 60) || "unknown" : "unknown";
  } catch {
    return "unknown";
  }
}

export type RekognitionDeps = { fetch?: typeof fetch; now?: () => Date; timeoutMs?: number };

/** The check, for a key. `deps` is the tests' seam: the service's answer as a case needs it, and the clock. */
export function rekognitionCheck(config: RekognitionConfig, deps: RekognitionDeps = {}): PictureCheck {
  if (!REGION.test(config.region)) throw new Error("picture check: not a region");
  const host = `rekognition.${config.region}.amazonaws.com`;
  return async (bytes, contentType) => {
    // Only the JPEG the server made: anything else was not made here, and is not sent anywhere.
    if (contentType !== "image/jpeg") throw new Error("picture check: not the JPEG the server makes");
    if (bytes.byteLength === 0 || bytes.byteLength > CHECK_MAX_BYTES) throw new Error("picture check: a size the service does not take");
    const meta = await sharp(bytes).metadata();
    if (meta.format !== "jpeg" || !meta.width || !meta.height) throw new Error("picture check: not the JPEG the server makes");
    // Too small for the service to read at all, and too small to be a picture of anything.
    if (meta.width < CHECK_MIN_EDGE || meta.height < CHECK_MIN_EDGE) return { verdict: "refuse", detail: "Too small to be checked" };

    const body = JSON.stringify({ Image: { Bytes: bytes.toString("base64") }, MinConfidence: NOTICE_AT });
    const { host: signedHost, ...headers } = signRequest({
      key: config,
      region: config.region,
      service: "rekognition",
      method: "POST",
      host,
      path: "/",
      headers: { "content-type": "application/x-amz-json-1.1", "x-amz-target": "RekognitionService.DetectModerationLabels" },
      body,
      now: (deps.now ?? (() => new Date()))(),
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? TIMEOUT_MS);
    let status: number;
    let text: string;
    try {
      // The address is the host that was signed and no other: a redirect is an error, never followed.
      const res = await (deps.fetch ?? fetch)(`https://${signedHost}/`, { method: "POST", headers, body, signal: controller.signal, redirect: "error", cache: "no-store" });
      status = res.status;
      text = await res.text();
    } finally {
      clearTimeout(timer);
    }
    if (status !== 200) {
      const name = errorName(text);
      console.warn(`[campaigns] the picture check answered ${status} ${name}`);
      if (status === 400 && NEVER_READABLE.has(name)) return { verdict: "refuse", detail: `Rekognition could not read it: ${name}` };
      throw new Error(`picture check: the service answered ${status}`);
    }
    let answer: unknown;
    try {
      answer = JSON.parse(text);
    } catch {
      throw new Error("picture check: an answer that is not JSON");
    }
    const { labels, model } = readLabels(answer);
    return verdictOf(labels, model);
  };
}

/** The check in force on this server: the service with the key in the environment, or none. */
export function rekognitionCheckFromEnv(env: Readonly<Record<string, string | undefined>> = process.env): PictureCheck | null {
  const config = rekognitionConfig(env);
  return config ? rekognitionCheck(config) : null;
}

/** Test seam: lets the one warning be said again. Never called by the app. */
export function __resetRekognitionWarning(): void {
  warned = false;
}
