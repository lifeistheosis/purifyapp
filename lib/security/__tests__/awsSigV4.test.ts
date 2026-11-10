import { describe, expect, it } from "vitest";

import { amzDate, signRequest, signingKey } from "@/lib/security/awsSigV4";

/**
 * The signer the picture check calls Amazon with (lib/security/awsSigV4.ts),
 * held to the service's own published examples.
 *
 * What would go wrong if this broke: every picture's check would be refused
 * by the service ("the request signature we calculated does not match"), the
 * check would fail closed, and no picture could be added at all. Nothing
 * unsafe, but pictures would be dark with a key that is right.
 *
 * The values below are not ours. They are the service's: the example key
 * pair of its documentation (never a real key), the two plainest requests of
 * its Signature Version 4 test suite, and the signing key of the worked
 * example in its guide. A signer that reproduces all three to the last hex
 * digit computes what the service computes.
 */

const EXAMPLE = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY" };
const AT = new Date("2015-08-30T12:36:00.000Z");

describe("the time and the key", () => {
  it("writes a time as the recipe does", () => {
    expect(amzDate(AT)).toBe("20150830T123600Z");
    expect(amzDate(new Date("2026-01-02T03:04:05.678Z"))).toBe("20260102T030405Z");
  });

  it("derives the signing key of the guide's worked example", () => {
    expect(signingKey(EXAMPLE.secretAccessKey, "20150830", "us-east-1", "iam").toString("hex")).toBe("c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9");
  });
});

describe("the service's own test suite", () => {
  const vanilla = { key: EXAMPLE, region: "us-east-1", service: "service", host: "example.amazonaws.com", now: AT };

  it("get-vanilla", () => {
    const signed = signRequest({ ...vanilla, method: "GET" });
    expect(signed.authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
    );
    expect(signed).toMatchObject({ host: "example.amazonaws.com", "x-amz-date": "20150830T123600Z" });
  });

  it("post-vanilla", () => {
    expect(signRequest({ ...vanilla, method: "POST" }).authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=5da7c1a2acd57cee7505fc6676e4e544621c30862966e37dddb68e92efbe5d6b",
    );
  });
});

describe("what is signed", () => {
  const base = { key: EXAMPLE, region: "us-east-1", service: "rekognition", host: "rekognition.us-east-1.amazonaws.com", now: AT, method: "POST" as const };
  const signatureOf = (h: Record<string, string>) => /Signature=([0-9a-f]{64})$/.exec(h.authorization)?.[1];

  it("every header handed to it, in lower case and in order, and the body", () => {
    const signed = signRequest({ ...base, headers: { "X-Amz-Target": "RekognitionService.DetectModerationLabels", "Content-Type": "application/x-amz-json-1.1" }, body: "{}" });
    expect(signed.authorization).toContain("SignedHeaders=content-type;host;x-amz-date;x-amz-target,");
    expect(signed.authorization).toContain("Credential=AKIDEXAMPLE/20150830/us-east-1/rekognition/aws4_request,");
    expect(Object.keys(signed).sort()).toEqual(["authorization", "content-type", "host", "x-amz-date", "x-amz-target"]);
    // A change to the body, to a header, to the region, to the day or to the secret changes the signature.
    const first = signatureOf(signed);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    const same = { ...base, headers: { "X-Amz-Target": "RekognitionService.DetectModerationLabels", "Content-Type": "application/x-amz-json-1.1" } };
    expect(signatureOf(signRequest({ ...same, body: "{}" }))).toBe(first);
    expect(signatureOf(signRequest({ ...same, body: "{ }" }))).not.toBe(first);
    expect(signatureOf(signRequest({ ...same, body: "{}", headers: { ...same.headers, "X-Amz-Target": "RekognitionService.DetectLabels" } }))).not.toBe(first);
    expect(signatureOf(signRequest({ ...same, body: "{}", region: "eu-west-1", host: "rekognition.eu-west-1.amazonaws.com" }))).not.toBe(first);
    expect(signatureOf(signRequest({ ...same, body: "{}", now: new Date("2015-08-31T12:36:00.000Z") }))).not.toBe(first);
    expect(signatureOf(signRequest({ ...same, body: "{}", key: { ...EXAMPLE, secretAccessKey: `${EXAMPLE.secretAccessKey}x` } }))).not.toBe(first);
  });

  it("bytes as they are sent, the same as their text", () => {
    const text = signRequest({ ...base, body: '{"a":"é"}' });
    const bytes = signRequest({ ...base, body: new TextEncoder().encode('{"a":"é"}') });
    expect(signatureOf(bytes)).toBe(signatureOf(text));
  });

  it("never carries the secret, in any header", () => {
    const signed = signRequest({ ...base, body: "{}" });
    expect(JSON.stringify(signed)).not.toContain(EXAMPLE.secretAccessKey);
  });

  it("refuses what it does not sign: a query, and an authorization header of the caller's", () => {
    expect(() => signRequest({ ...base, path: "/?Action=ListUsers" })).toThrow();
    expect(() => signRequest({ ...base, path: "no-slash" })).toThrow();
    expect(() => signRequest({ ...base, headers: { Authorization: "Bearer x" } })).toThrow();
  });
});
