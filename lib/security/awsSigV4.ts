import "server-only";

import { createHash, createHmac } from "node:crypto";

// Signing a request to Amazon Web Services (Signature Version 4), for the one
// call the server makes there: the automatic check of a campaign's picture
// (lib/campaigns/pictureCheckRekognition.ts).
//
// WHY BY HAND. The service's own kit is some sixty packages for what is one
// signed POST. The signature is a fixed, published recipe: four lines hashed,
// a key derived from the secret by four keyed hashes, and one more keyed
// hash. It is written here with Node's own crypto and held to the service's
// published examples (lib/security/__tests__/awsSigV4.test.ts): the test
// suite's "get-vanilla" and "post-vanilla" requests, and the signing key of
// the documentation's own worked example. A signer that reproduces those
// three values to the last hex digit is the service's signer.
//
// THE SECRET never leaves this function except as the keyed hashes made from
// it. It is not logged, not returned and not put in any header; the access
// key's id is, as the recipe requires, and an id alone opens nothing.

export type AwsKey = { accessKeyId: string; secretAccessKey: string };

const sha256Hex = (data: string | Uint8Array): string => createHash("sha256").update(data).digest("hex");
const keyed = (key: string | Uint8Array, data: string): Buffer => createHmac("sha256", key).update(data, "utf8").digest();

/** A time as the recipe writes it: 20150830T123600Z. */
export function amzDate(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** The key a day's requests to one service in one region are signed with. */
export function signingKey(secretAccessKey: string, day: string, region: string, service: string): Buffer {
  return keyed(keyed(keyed(keyed(`AWS4${secretAccessKey}`, day), region), service), "aws4_request");
}

export type SignInput = {
  key: AwsKey;
  region: string;
  /** The service's signing name, such as "rekognition". */
  service: string;
  method: "GET" | "POST";
  host: string;
  /** Its path, already encoded. "/" for the services that take everything in the body. */
  path?: string;
  /** The headers to sign besides host and x-amz-date, by any letter case. Every x-amz header sent must be among them. */
  headers?: Readonly<Record<string, string>>;
  body?: string | Uint8Array;
  now: Date;
};

/**
 * The headers of a signed request: those given, with `host`, `x-amz-date`
 * and `authorization` added. Every header returned was signed, except
 * `authorization` itself, which is the signature.
 *
 * No query string: the one caller has none, and a query would need the
 * recipe's own sorting and encoding, which is not written here. A path that
 * carries one is refused instead of signed wrongly.
 */
export function signRequest(input: SignInput): Record<string, string> {
  const path = input.path ?? "/";
  if (!path.startsWith("/") || /[?#\s]/.test(path)) throw new Error("awsSigV4: a path with a query is not signed here");
  const stamp = amzDate(input.now);
  const day = stamp.slice(0, 8);

  const all: Record<string, string> = {};
  for (const [name, value] of Object.entries(input.headers ?? {})) {
    const lower = name.toLowerCase();
    if (lower === "authorization") throw new Error("awsSigV4: the authorization header is made here");
    // A value's inner runs of spaces count as one, and its ends are trimmed, as the recipe has it.
    all[lower] = value.trim().replace(/\s+/g, " ");
  }
  all.host = input.host;
  all["x-amz-date"] = stamp;

  const names = Object.keys(all).sort();
  const canonicalHeaders = names.map((n) => `${n}:${all[n]}\n`).join("");
  const signedHeaders = names.join(";");
  const canonicalRequest = [input.method, path, "", canonicalHeaders, signedHeaders, sha256Hex(input.body ?? "")].join("\n");

  const scope = `${day}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256Hex(canonicalRequest)].join("\n");
  const signature = keyed(signingKey(input.key.secretAccessKey, day, input.region, input.service), stringToSign).toString("hex");

  return {
    ...all,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.key.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}
