import { readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __setPictureCheck, pictureCheck } from "@/lib/campaigns/pictureCheck";
import {
  CHECK_MAX_BYTES,
  CHECK_MIN_EDGE,
  NOTICE_AT,
  PICTURE_CHECK_ENV,
  REFUSED,
  REFUSE_AT,
  __resetRekognitionWarning,
  readLabels,
  rekognitionCheck,
  rekognitionConfig,
  verdictOf,
  type ModerationLabel,
} from "@/lib/campaigns/pictureCheckRekognition";
import { signRequest } from "@/lib/security/awsSigV4";

/**
 * The automatic check of a campaign's picture
 * (lib/campaigns/pictureCheckRekognition.ts), against a stand-in that
 * answers as the service's documentation says the service does. No key
 * exists yet, so nothing here calls the service; the first real picture is
 * that proof, added on the main web after the merge (no test web for 1.9:
 * docs/1.9-build/OWNER-STEPS.md, P5).
 *
 * What would go wrong if these broke: a picture of nudity or of violence
 * stored and put in front of a moderator, or of a reader; a picture passed
 * because the service was down, or because its answer was not understood; a
 * wedding or a hospital photograph refused by a machine with nobody asked;
 * the key, or who uploaded a picture, sent somewhere it should not go; a
 * picture sent to an address the server did not choose.
 */

// The example key pair of the service's own documentation. Never a real key.
const KEY = { accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", region: "us-east-1" };
const AT = new Date("2026-11-10T21:00:00.000Z");

const label = (Name: string, Confidence: number, ParentName = "", TaxonomyLevel: number | null = null): ModerationLabel => ({ Name, ParentName, Confidence, TaxonomyLevel });

let photo: Buffer;
let sent: { url: string; init: RequestInit }[];

/** A stand-in for the service: it answers what a case says, and keeps what it was sent. */
function service(answer: { status?: number; body: unknown } | (() => Promise<Response>)): typeof fetch {
  return (async (url: RequestInfo | URL, init?: RequestInit) => {
    sent.push({ url: String(url), init: init ?? {} });
    if (typeof answer === "function") return answer();
    return new Response(typeof answer.body === "string" ? answer.body : JSON.stringify(answer.body), { status: answer.status ?? 200 });
  }) as typeof fetch;
}
const check = (answer: Parameters<typeof service>[0], over: { timeoutMs?: number } = {}) => rekognitionCheck(KEY, { fetch: service(answer), now: () => AT, ...over });
const NOTHING = { body: { ModerationLabels: [], ModerationModelVersion: "7.0" } };

beforeEach(async () => {
  sent = [];
  photo ??= await sharp({ create: { width: 320, height: 240, channels: 3, background: "#335577" } }).jpeg().toBuffer();
  __resetRekognitionWarning();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  __setPictureCheck(undefined);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("the key", () => {
  const env = (over: Record<string, string | undefined> = {}) => ({
    [PICTURE_CHECK_ENV.id]: KEY.accessKeyId,
    [PICTURE_CHECK_ENV.secret]: KEY.secretAccessKey,
    [PICTURE_CHECK_ENV.region]: KEY.region,
    ...over,
  });

  it("is all three values, or no key", () => {
    expect(rekognitionConfig(env())).toEqual(KEY);
    // Nothing set: no key, and nothing to say about it.
    expect(rekognitionConfig({})).toBeNull();
    expect(console.warn).not.toHaveBeenCalled();
    // Any one missing: no key.
    for (const name of Object.values(PICTURE_CHECK_ENV)) {
      __resetRekognitionWarning();
      expect(rekognitionConfig(env({ [name]: "" })), name).toBeNull();
      expect(rekognitionConfig(env({ [name]: undefined })), name).toBeNull();
    }
    // Spaces around a pasted value are not part of it.
    expect(rekognitionConfig(env({ [PICTURE_CHECK_ENV.region]: " us-east-1\n" }))).toEqual(KEY);
  });

  it("takes a region only in the shape of a region: it is part of the address a picture is sent to", () => {
    for (const region of ["us-east-1", "eu-central-1", "ap-southeast-2", "us-gov-west-1"]) {
      expect(rekognitionConfig(env({ [PICTURE_CHECK_ENV.region]: region }))?.region, region).toBe(region);
    }
    for (const region of ["us-east-1.example.com", "us-east-1/", "example.com#", "us-east-1@example.com", "US-EAST-1", "us east 1", "useast1", "x", "us-east-1.amazonaws.com.example.com/"]) {
      __resetRekognitionWarning();
      expect(rekognitionConfig(env({ [PICTURE_CHECK_ENV.region]: region })), region).toBeNull();
    }
    // And the check itself will not be made for one, whoever asks.
    expect(() => rekognitionCheck({ ...KEY, region: "us-east-1.example.com" })).toThrow();
  });

  it("says a half-set key once, by the names of what is wrong and never by a value", () => {
    expect(rekognitionConfig(env({ [PICTURE_CHECK_ENV.secret]: "short" }))).toBeNull();
    expect(rekognitionConfig(env({ [PICTURE_CHECK_ENV.secret]: "short" }))).toBeNull();
    expect(console.warn).toHaveBeenCalledTimes(1);
    const line = String(vi.mocked(console.warn).mock.calls[0][0]);
    expect(line).toContain(PICTURE_CHECK_ENV.secret);
    expect(line).not.toContain(PICTURE_CHECK_ENV.id);
    expect(line).not.toContain("short");
    expect(line).not.toContain(KEY.accessKeyId);
  });

  it("is what decides whether this server has a check at all", () => {
    for (const name of Object.values(PICTURE_CHECK_ENV)) vi.stubEnv(name, "");
    __setPictureCheck(undefined);
    expect(pictureCheck()).toBeNull();
    vi.stubEnv(PICTURE_CHECK_ENV.id, KEY.accessKeyId);
    vi.stubEnv(PICTURE_CHECK_ENV.secret, KEY.secretAccessKey);
    // Two of three: still none.
    __setPictureCheck(undefined);
    expect(pictureCheck()).toBeNull();
    vi.stubEnv(PICTURE_CHECK_ENV.region, KEY.region);
    __setPictureCheck(undefined);
    expect(typeof pictureCheck()).toBe("function");
  });

  it("is in no file of the repository: the names are read from the environment and nowhere set", () => {
    const adapter = readFileSync(join(process.cwd(), "lib/campaigns/pictureCheckRekognition.ts"), "utf8");
    expect(adapter.startsWith('import "server-only";')).toBe(true);
    // No key id of the service's shape is written in it.
    expect(adapter).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(adapter).not.toMatch(/NEXT_PUBLIC_/);
  });

  // His word of 2026-11-11: no test web for 1.9. Until that day the steps
  // sent the key to the test web's service, and the first real picture with it.
  it("is put where this code reads it: his steps name the same three, on the main web's service, saved with a deploy", () => {
    const steps = readFileSync(join(process.cwd(), "docs/1.9-build/OWNER-STEPS.md"), "utf8");
    const pictures = steps.slice(steps.indexOf("### Pictures. What campaigns need"), steps.indexOf("### 23. "));
    const step7 = pictures.slice(pictures.indexOf("\n7. Render"), pictures.indexOf("**P2. "));
    for (const name of Object.values(PICTURE_CHECK_ENV)) expect(step7, name).toContain(`\`${name}\``);
    expect(step7.replace(/\s+/g, " ")).toContain("the **purifyapp** web service (the main web, purifyapp.net)");
    // The key is read once after the server starts (pictureCheck), so a save with no deploy is not seen.
    expect(step7).toContain("**Save and deploy**");
    expect(readFileSync(join(process.cwd(), "lib/campaigns/pictureCheck.ts"), "utf8")).toContain("fromKey ??= { check: rekognitionCheckFromEnv() };");
    // And the first real picture is added on the main web, after the merge.
    const p5 = pictures.slice(pictures.indexOf("**P5. "));
    expect(p5.startsWith("**P5. The first real picture, on the main web")).toBe(true);
    expect(p5).toContain("`CAMPAIGN_PARTS.pictures`");
    for (const part of [step7, p5]) expect(part).not.toMatch(/test web/i);
  });
});

describe("what is sent", () => {
  it("is one signed POST to the service in the key's region, carrying the picture and nothing else", async () => {
    await check(NOTHING)(photo, "image/jpeg");
    expect(sent).toHaveLength(1);
    const { url, init } = sent[0];
    expect(url).toBe("https://rekognition.us-east-1.amazonaws.com/");
    expect(init.method).toBe("POST");
    // A redirect is never followed: the picture goes to the address that was signed, or nowhere.
    expect(init.redirect).toBe("error");
    const headers = init.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/x-amz-json-1.1");
    expect(headers["x-amz-target"]).toBe("RekognitionService.DetectModerationLabels");
    expect(headers["x-amz-date"]).toBe("20261110T210000Z");
    expect(headers.authorization).toContain(`Credential=${KEY.accessKeyId}/20261110/us-east-1/rekognition/aws4_request,`);
    expect(headers.authorization).toContain("SignedHeaders=content-type;host;x-amz-date;x-amz-target,");
    // The host header is the address's own, which is what was signed: none is set by hand.
    expect(Object.keys(headers).sort()).toEqual(["authorization", "content-type", "x-amz-date", "x-amz-target"]);

    const body = JSON.parse(String(init.body)) as { Image: { Bytes: string }; MinConfidence: number };
    expect(Object.keys(body).sort()).toEqual(["Image", "MinConfidence"]);
    expect(Object.keys(body.Image)).toEqual(["Bytes"]);
    expect(Buffer.from(body.Image.Bytes, "base64").equals(photo)).toBe(true);
    expect(body.MinConfidence).toBe(NOTICE_AT);
  });

  it("is signed as the signer signs: the signature is the one the service would compute for this very request", async () => {
    await check(NOTHING)(photo, "image/jpeg");
    const { init } = sent[0];
    const again = signRequest({
      key: KEY,
      region: "us-east-1",
      service: "rekognition",
      method: "POST",
      host: "rekognition.us-east-1.amazonaws.com",
      headers: { "content-type": "application/x-amz-json-1.1", "x-amz-target": "RekognitionService.DetectModerationLabels" },
      body: String(init.body),
      now: AT,
    });
    expect((init.headers as Record<string, string>).authorization).toBe(again.authorization);
  });

  it("never carries the secret", async () => {
    await check(NOTHING)(photo, "image/jpeg");
    expect(JSON.stringify(sent[0].init.headers)).not.toContain(KEY.secretAccessKey);
    expect(String(sent[0].init.body)).not.toContain(KEY.secretAccessKey);
    expect(sent[0].url).not.toContain(KEY.secretAccessKey);
  });

  it("goes to the key's own region", async () => {
    await rekognitionCheck({ ...KEY, region: "eu-central-1" }, { fetch: service(NOTHING), now: () => AT })(photo, "image/jpeg");
    expect(sent[0].url).toBe("https://rekognition.eu-central-1.amazonaws.com/");
    expect((sent[0].init.headers as Record<string, string>).authorization).toContain("/eu-central-1/rekognition/aws4_request,");
  });
});

describe("what is not sent at all", () => {
  it("anything but the JPEG the server makes", async () => {
    const png = await sharp({ create: { width: 320, height: 240, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();
    await expect(check(NOTHING)(png, "image/png")).rejects.toThrow();
    // Bytes that are not what they are called.
    await expect(check(NOTHING)(png, "image/jpeg")).rejects.toThrow();
    await expect(check(NOTHING)(Buffer.from("not a picture"), "image/jpeg")).rejects.toThrow();
    await expect(check(NOTHING)(Buffer.alloc(0), "image/jpeg")).rejects.toThrow();
    // A true JPEG that is called something else was not made by the server either.
    await expect(check(NOTHING)(photo, "image/png")).rejects.toThrow();
    await expect(check(NOTHING)(photo, "image/webp")).rejects.toThrow();
    await expect(check(NOTHING)(photo, "")).rejects.toThrow();
    expect(sent).toEqual([]);
  });

  it("a picture past the size the service takes", async () => {
    // A true JPEG, and too large: noise at full quality does not shrink.
    const side = 2000;
    const noise = Buffer.alloc(side * side * 3);
    for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24;
    const large = await sharp(noise, { raw: { width: side, height: side, channels: 3 } }).jpeg({ quality: 100, chromaSubsampling: "4:4:4" }).toBuffer();
    expect(large.byteLength).toBeGreaterThan(CHECK_MAX_BYTES);
    expect((await sharp(large).metadata()).format).toBe("jpeg");
    await expect(check(NOTHING)(large, "image/jpeg")).rejects.toThrow();
    expect(sent).toEqual([]);
  });

  it("a picture too small for the service to read: it is refused here", async () => {
    const tiny = await sharp({ create: { width: CHECK_MIN_EDGE - 1, height: 240, channels: 3, background: "#335577" } }).jpeg().toBuffer();
    expect(await check(NOTHING)(tiny, "image/jpeg")).toMatchObject({ verdict: "refuse" });
    const edge = await sharp({ create: { width: CHECK_MIN_EDGE, height: CHECK_MIN_EDGE, channels: 3, background: "#335577" } }).jpeg().toBuffer();
    expect(await check(NOTHING)(edge, "image/jpeg")).toMatchObject({ verdict: "clear" });
    expect(sent).toHaveLength(1);
  });
});

describe("the judgment", () => {
  it("nothing found is clear, and says which model looked", () => {
    expect(verdictOf([], "7.0")).toEqual({ verdict: "clear", detail: "Rekognition 7.0: nothing found" });
    expect(verdictOf([])).toEqual({ verdict: "clear", detail: "Rekognition: nothing found" });
  });

  it("refuses nudity, sexual content, violence that is shown, and hate symbols", () => {
    const cases: ModerationLabel[][] = [
      [label("Explicit", 97, "", 1), label("Explicit Nudity", 97, "Explicit", 2), label("Exposed Female Nipple", 97, "Explicit Nudity", 3)],
      [label("Explicit", 88, "", 1), label("Explicit Sexual Activity", 88, "Explicit", 2)],
      [label("Explicit", 70, "", 1), label("Sex Toys", 70, "Explicit", 2)],
      [label("Non-Explicit Nudity of Intimate parts and Kissing", 90, "", 1), label("Non-Explicit Nudity", 90, "Non-Explicit Nudity of Intimate parts and Kissing", 2), label("Implied Nudity", 90, "Non-Explicit Nudity", 3)],
      [label("Non-Explicit Nudity of Intimate parts and Kissing", 81, "", 1), label("Non-Explicit Nudity", 81, "Non-Explicit Nudity of Intimate parts and Kissing", 2), label("Partially Exposed Female Breast", 81, "Non-Explicit Nudity", 3)],
      [label("Non-Explicit Nudity of Intimate parts and Kissing", 75, "", 1), label("Obstructed Intimate Parts", 75, "Non-Explicit Nudity of Intimate parts and Kissing", 2), label("Obstructed Male Genitalia", 75, "Obstructed Intimate Parts", 3)],
      [label("Violence", 93, "", 1), label("Graphic Violence", 93, "Violence", 2), label("Blood & Gore", 93, "Graphic Violence", 3)],
      [label("Violence", 66, "", 1), label("Graphic Violence", 66, "Violence", 2), label("Self-Harm", 66, "Graphic Violence", 3)],
      [label("Hate Symbols", 99, "", 1), label("Nazi Party", 99, "Hate Symbols", 2)],
      [label("Hate Symbols", 71, "", 1)],
    ];
    for (const labels of cases) {
      const got = verdictOf(labels, "7.0");
      expect(got.verdict, JSON.stringify(labels.map((l) => l.Name))).toBe("refuse");
      // The record names the most particular kind it found, and the service.
      expect(got.detail).toContain(labels[labels.length - 1].Name);
      expect(got.detail.startsWith("Rekognition 7.0 refused: ")).toBe(true);
    }
  });

  it("leaves to a moderator what a person should decide, with a note of what was noticed", () => {
    const cases: [string, ModerationLabel[]][] = [
      // A wedding.
      ["Kissing on the Lips 92", [label("Non-Explicit Nudity of Intimate parts and Kissing", 92, "", 1), label("Kissing on the Lips", 92, "Non-Explicit Nudity of Intimate parts and Kissing", 2)]],
      // A patient in a hospital bed, a child at the sea.
      ["Exposed Male Nipple 85", [label("Non-Explicit Nudity of Intimate parts and Kissing", 85, "", 1), label("Non-Explicit Nudity", 85, "Non-Explicit Nudity of Intimate parts and Kissing", 2), label("Exposed Male Nipple", 85, "Non-Explicit Nudity", 3)]],
      ["Bare Back 77", [label("Non-Explicit Nudity of Intimate parts and Kissing", 77, "", 1), label("Non-Explicit Nudity", 77, "Non-Explicit Nudity of Intimate parts and Kissing", 2), label("Bare Back", 77, "Non-Explicit Nudity", 3)]],
      ["Female Swimwear or Underwear 90", [label("Swimwear or Underwear", 90, "", 1), label("Female Swimwear or Underwear", 90, "Swimwear or Underwear", 2)]],
      // A soldier someone is praying for.
      ["Weapons 96", [label("Violence", 96, "", 1), label("Weapons", 96, "Violence", 2)]],
      // A funeral.
      ["Corpses 88", [label("Visually Disturbing", 88, "", 1), label("Death and Emaciation", 88, "Visually Disturbing", 2), label("Corpses", 88, "Death and Emaciation", 3)]],
      ["Air Crash 80", [label("Visually Disturbing", 80, "", 1), label("Crashes", 80, "Visually Disturbing", 2), label("Air Crash", 80, "Crashes", 3)]],
      ["Drinking 70", [label("Alcohol", 70, "", 1), label("Alcohol Use", 70, "Alcohol", 2), label("Drinking", 70, "Alcohol Use", 3)]],
      ["Smoking 65", [label("Drugs & Tobacco", 65, "", 1), label("Drugs & Tobacco Paraphernalia & Use", 65, "Drugs & Tobacco", 2), label("Smoking", 65, "Drugs & Tobacco Paraphernalia & Use", 3)]],
      ["Middle Finger 99", [label("Rude Gestures", 99, "", 1), label("Middle Finger", 99, "Rude Gestures", 2)]],
      ["Gambling 60", [label("Gambling", 60, "", 1)]],
    ];
    for (const [noticed, labels] of cases) {
      expect(verdictOf(labels, "7.0"), noticed).toEqual({ verdict: "clear", detail: `Rekognition 7.0 noticed: ${noticed}` });
    }
  });

  it("refuses only when the service is sure enough, and tells the moderator of anything less", () => {
    expect(REFUSE_AT).toBeGreaterThanOrEqual(NOTICE_AT);
    const at = (c: number) => verdictOf([label("Explicit", c, "", 1), label("Explicit Nudity", c, "Explicit", 2)], "7.0");
    expect(at(REFUSE_AT).verdict).toBe("refuse");
    expect(at(99.9).verdict).toBe("refuse");
    // Under the line: not refused by a machine, and the moderator is warned before they look.
    expect(at(REFUSE_AT - 0.1)).toEqual({ verdict: "clear", detail: `Rekognition 7.0 noticed: Explicit Nudity ${Math.round(REFUSE_AT - 0.1)}` });
  });

  it("refuses a kind it has no name for when the kind over it is refused", () => {
    // A name the service adds later under Explicit Nudity, with only its parent to go by.
    expect(verdictOf([label("A Kind Added Later", 90, "Explicit Nudity", 3)]).verdict).toBe("refuse");
    // And two levels down, by the answer's own chain.
    expect(verdictOf([label("Graphic Violence", 40, "Violence", 2), label("Newer", 90, "Graphic Violence", 3)]).verdict).toBe("refuse");
    expect(verdictOf([label("Hate Symbols", 30, "", 1), label("Middle", 30, "Hate Symbols", 2), label("Deeper", 90, "Middle", 3)]).verdict).toBe("refuse");
    // A name it does not know, under nothing refused, goes to the moderator.
    expect(verdictOf([label("Something New", 90, "", 1)], "8.0")).toEqual({ verdict: "clear", detail: "Rekognition 8.0 noticed: Something New 90" });
    // A chain that turns on itself ends.
    expect(verdictOf([label("A", 90, "B", 2), label("B", 90, "A", 2)]).verdict).toBe("clear");
  });

  it("never answers report: it knows no list of known illegal images", () => {
    const everything = [...REFUSED].map((name) => label(name, 99));
    expect(verdictOf(everything).verdict).toBe("refuse");
    for (const name of REFUSED) expect(verdictOf([label(name, 99)]).verdict, name).toBe("refuse");
    const adapter = readFileSync(join(process.cwd(), "lib/campaigns/pictureCheckRekognition.ts"), "utf8");
    expect(adapter).not.toMatch(/verdict: "report"/);
  });

  it("keeps the note short enough for the record, most sure first", () => {
    const many = ["Alcohol", "Gambling", "Rude Gestures", "Swimwear or Underwear", "Visually Disturbing"].map((n, i) => label(n, 95 - i, "", 1));
    const got = verdictOf(many, "7.0");
    expect(got.detail).toBe("Rekognition 7.0 noticed: Alcohol 95, Gambling 94, Rude Gestures 93");
    expect(got.detail.length).toBeLessThanOrEqual(120);
  });

  it("the list of what is refused is the service's own names, and holds none of what a person decides", () => {
    for (const name of ["Explicit", "Explicit Nudity", "Explicit Sexual Activity", "Sex Toys", "Implied Nudity", "Obstructed Intimate Parts", "Graphic Violence", "Self-Harm", "Blood & Gore", "Hate Symbols", "Nazi Party", "White Supremacy", "Extremist"]) {
      expect(REFUSED.has(name), name).toBe(true);
    }
    for (const name of ["Non-Explicit Nudity of Intimate parts and Kissing", "Non-Explicit Nudity", "Kissing on the Lips", "Bare Back", "Exposed Male Nipple", "Swimwear or Underwear", "Violence", "Weapons", "Visually Disturbing", "Death and Emaciation", "Corpses", "Emaciated Bodies", "Crashes", "Alcohol", "Drugs & Tobacco", "Rude Gestures", "Gambling"]) {
      expect(REFUSED.has(name), name).toBe(false);
    }
  });
});

describe("the service's answer", () => {
  it("is read as the documentation gives it", async () => {
    const body = {
      ModerationLabels: [
        { Confidence: 99.2, Name: "Explicit", ParentName: "", TaxonomyLevel: 1 },
        { Confidence: 99.2, Name: "Explicit Nudity", ParentName: "Explicit", TaxonomyLevel: 2 },
      ],
      ModerationModelVersion: "7.0",
      ContentTypes: [{ Confidence: 99.9, Name: "Illustrated" }],
    };
    expect(await check({ body })(photo, "image/jpeg")).toEqual({ verdict: "refuse", detail: "Rekognition 7.0 refused: Explicit Nudity 99" });
    expect(await check(NOTHING)(photo, "image/jpeg")).toEqual({ verdict: "clear", detail: "Rekognition 7.0: nothing found" });
  });

  it("that is not that shape is no answer: the check throws, which is never a pass", async () => {
    for (const body of ["", "<html>", "null", "[]", "{}", '{"ModerationLabels":null}', '{"ModerationLabels":{}}', '{"ModerationLabels":[{"Name":"Explicit"}]}', '{"ModerationLabels":[{"Confidence":99}]}', '{"ModerationLabels":[null]}', '{"ModerationLabels":[{"Name":"","Confidence":99}]}']) {
      await expect(check({ body })(photo, "image/jpeg"), body).rejects.toThrow();
    }
    expect(() => readLabels({ ModerationLabels: [{ Name: "Explicit", Confidence: Number.NaN }] })).toThrow();
    // A model version that is not a version is left out of the record, never written into it.
    expect(readLabels({ ModerationLabels: [], ModerationModelVersion: "7.0<script>" }).model).toBeNull();
  });

  it("that is an error is no pass either, whatever the error", async () => {
    for (const [status, type] of [
      [400, "AccessDeniedException"],
      [400, "InvalidParameterException"],
      [400, "ProvisionedThroughputExceededException"],
      [400, "UnrecognizedClientException"],
      [403, "InvalidSignatureException"],
      [500, "ThrottlingException"],
      [500, "InternalServerError"],
      [503, ""],
    ] as const) {
      await expect(check({ status, body: { __type: type, Message: "User: arn:aws:iam::123456789012:user/someone is not authorized" } })(photo, "image/jpeg"), `${status} ${type}`).rejects.toThrow();
    }
    // The log says the status and the error's own name, and never its message, which names the account.
    const lines = vi.mocked(console.warn).mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.includes("400 AccessDeniedException"))).toBe(true);
    expect(lines.join("\n")).not.toContain("123456789012");
    expect(lines.join("\n")).not.toContain(KEY.secretAccessKey);
    expect(lines.join("\n")).not.toContain(KEY.accessKeyId);
  });

  it("that says the picture can never be read refuses it, since trying again would not help", async () => {
    for (const type of ["InvalidImageFormatException", "ImageTooLargeException", "com.amazonaws.rekognition#InvalidImageFormatException"]) {
      expect(await check({ status: 400, body: { __type: type, Message: "x" } })(photo, "image/jpeg"), type).toMatchObject({ verdict: "refuse" });
    }
  });

  it("that never comes is no pass: a network failure and a service that does not answer in time", async () => {
    await expect(
      check(async () => {
        throw new TypeError("fetch failed");
      })(photo, "image/jpeg"),
    ).rejects.toThrow();
    // The service hangs: the call is given up, and the wait is ended by the check's own clock.
    const hanging = rekognitionCheck(KEY, {
      now: () => AT,
      timeoutMs: 20,
      fetch: ((_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        })) as typeof fetch,
    });
    await expect(hanging(photo, "image/jpeg")).rejects.toThrow();
  });
});
