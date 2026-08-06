// Generates the Sign in with Apple CLIENT SECRET.
//
// Supabase's Apple provider asks for a "Secret Key (for OAuth)" and rejects the
// .p8 file with "Secret key should be a JWT". That is not a bug and not a
// mistake in the .p8: Apple's client secret IS a JWT, signed with ES256 using
// the .p8 as the private key. The .p8 is the pen, not the letter.
//
// It EXPIRES. Apple caps the lifetime at six months, and when it lapses every
// web Sign in with Apple stops working with an invalid_client error and nothing
// else changes to explain why. That is the whole reason this is a committed
// script rather than a one-off: in six months someone has to do this again, and
// they should not have to work out how from scratch.
//
// Usage:
//   node scripts/apple-client-secret.mjs --p8 <path to AuthKey_XXXX.p8>
//
// Optional:
//   --key-id <id>      defaults to the id in the filename (AuthKey_<id>.p8)
//   --team-id <id>     defaults to Purify's team
//   --client-id <id>   defaults to the Services ID (the WEB half)
//   --months <n>       defaults to 6, which is Apple's maximum
//
// The JWT is written to .apple-client-secret.jwt (gitignored) and copied to the
// clipboard. It is deliberately NEVER printed: it is a bearer credential for
// your Apple team, and a terminal scrollback is a bad place to keep one.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const TEAM_ID = "KFBT4D3T4L";
// The Services ID, not the bundle id. This secret signs the WEB OAuth flow;
// native sign-in uses an ID token and never needs a client secret.
const CLIENT_ID = "net.purifyapp.purify.web";
const MAX_MONTHS = 6; // Apple rejects anything longer.

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const p8Path = arg("p8");
if (!p8Path) {
  console.error(
    "✗ --p8 is required.\n" +
      "  e.g. node scripts/apple-client-secret.mjs --p8 ~/Downloads/AuthKey_ABC123XYZ.p8",
  );
  process.exit(1);
}
if (!fs.existsSync(p8Path)) {
  console.error(`✗ no such file: ${p8Path}`);
  process.exit(1);
}

// Apple names the download AuthKey_<KEYID>.p8, so the id is already in hand.
const fromName = path.basename(p8Path).match(/AuthKey_([A-Z0-9]+)\.p8$/i)?.[1];
const keyId = arg("key-id", fromName);
if (!keyId) {
  console.error(
    "✗ could not read the Key ID from the filename; pass --key-id explicitly.",
  );
  process.exit(1);
}

const teamId = arg("team-id", TEAM_ID);
const clientId = arg("client-id", CLIENT_ID);
const months = Math.min(Number(arg("months", String(MAX_MONTHS))), MAX_MONTHS);

let privateKey;
try {
  privateKey = crypto.createPrivateKey(fs.readFileSync(p8Path, "utf8"));
} catch (e) {
  console.error(
    `✗ ${path.basename(p8Path)} is not a readable private key: ${e.message}\n` +
      "  Apple's key is a PKCS#8 PEM beginning -----BEGIN PRIVATE KEY-----.",
  );
  process.exit(1);
}
if (privateKey.asymmetricKeyType !== "ec") {
  console.error(
    `✗ expected an EC key, got ${privateKey.asymmetricKeyType}. This is not an Apple auth key.`,
  );
  process.exit(1);
}

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const now = Math.floor(Date.now() / 1000);
const exp = now + Math.round(months * 30.4 * 24 * 60 * 60);

const header = { alg: "ES256", kid: keyId };
const payload = {
  iss: teamId,
  iat: now,
  exp,
  aud: "https://appleid.apple.com",
  sub: clientId,
};

const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
// ES256 JWTs need the raw R||S signature, not the DER wrapper Node emits by
// default. Without ieee-p1363 Apple answers invalid_client and says no more.
const signature = crypto.sign("sha256", Buffer.from(signingInput), {
  key: privateKey,
  dsaEncoding: "ieee-p1363",
});
const jwt = `${signingInput}.${b64url(signature)}`;

const outPath = path.join(process.cwd(), ".apple-client-secret.jwt");
fs.writeFileSync(outPath, jwt, { mode: 0o600 });

let clipboard = false;
try {
  // Windows. `clip` reads stdin; the trailing newline it would add is stripped
  // by Supabase anyway, but avoid it to keep the file and clipboard identical.
  execFileSync("clip", { input: jwt });
  clipboard = true;
} catch {
  try {
    execFileSync("pbcopy", { input: jwt });
    clipboard = true;
  } catch {
    /* no clipboard tool; the file is still written */
  }
}

console.log("✓ Apple client secret generated");
console.log(`  key id     ${keyId}`);
console.log(`  team id    ${teamId}`);
console.log(`  client id  ${clientId}   (the Services ID, for the web flow)`);
console.log(`  expires    ${new Date(exp * 1000).toISOString().slice(0, 10)}  (${months} months, Apple's maximum)`);
console.log(`  length     ${jwt.length} characters`);
console.log(`  written to ${outPath}  (gitignored, 0600)`);
console.log(
  clipboard
    ? "  copied to the clipboard: paste it into Supabase > Auth > Providers > Apple > Secret Key"
    : "  clipboard unavailable, open the file above and copy it by hand",
);
console.log(
  "\n  NOT printed here on purpose. It is a bearer credential for your Apple\n" +
    "  team, and terminal scrollback is a bad place to keep one.",
);
