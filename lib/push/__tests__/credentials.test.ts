import { describe, expect, it } from "vitest";

import { describeShape, normalizePem, parseP8, parseServiceAccount } from "../credentials";

// A fake key: the right shape, no real secret. 128 base64 characters.
const BODY = "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg" + "A".repeat(80);
const PEM = `-----BEGIN PRIVATE KEY-----\n${BODY.slice(0, 64)}\n${BODY.slice(64)}\n-----END PRIVATE KEY-----\n`;

const account = {
  type: "service_account",
  project_id: "purify-app",
  client_email: "firebase-adminsdk@purify-app.iam.gserviceaccount.com",
  private_key: PEM,
};

describe("parseServiceAccount", () => {
  it("reads the file pasted as it is", () => {
    const r = parseServiceAccount(JSON.stringify(account));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.private_key).toBe(PEM);
  });

  it("reads base64 of the file, the old required shape", () => {
    expect(parseServiceAccount(Buffer.from(JSON.stringify(account)).toString("base64")).ok).toBe(true);
  });

  it("repairs a key whose escaped line breaks became real ones in a one-line field", () => {
    const broken = JSON.stringify(account).replace(/\\n/g, "\n");
    expect(parseServiceAccount(broken).ok).toBe(true);
  });

  it("forgives surrounding quotes", () => {
    expect(parseServiceAccount(`'${JSON.stringify(account)}'`).ok).toBe(true);
  });

  it("names what is wrong without ever repeating a value", () => {
    const noKey = parseServiceAccount(JSON.stringify({ ...account, private_key: undefined }));
    expect(noKey.ok).toBe(false);
    if (!noKey.ok) expect(noKey.reason).toContain("private_key");

    const junk = parseServiceAccount("purify-app-firebase.json");
    expect(junk.ok).toBe(false);
    if (!junk.ok) {
      // The message now names the shape it found, which is more use than
      // "neither of the two things it should be".
      expect(junk.reason).toContain("file name or a path");
      expect(junk.reason).not.toContain("purify-app-firebase");
    }

    const wrongType = parseServiceAccount(JSON.stringify({ ...account, type: "authorized_user" }));
    expect(wrongType.ok).toBe(false);
  });

  it("recognises google-services.json, the file most often pasted by mistake", () => {
    const appConfig = { project_info: { project_id: "purify-app" }, client: [{}], configuration_version: "1" };
    const r = parseServiceAccount(JSON.stringify(appConfig));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("google-services.json");
  });
});

describe("parseP8", () => {
  it("reads the .p8 file as it is, and base64 of it", () => {
    expect(parseP8(PEM)).toEqual({ ok: true, value: PEM });
    expect(parseP8(Buffer.from(PEM).toString("base64"))).toEqual({ ok: true, value: PEM });
  });

  it("rebuilds a key flattened onto one line with spaces or literal \\n", () => {
    const spaced = PEM.replace(/\n/g, " ");
    expect(parseP8(spaced)).toEqual({ ok: true, value: PEM });
    const escaped = PEM.replace(/\n/g, "\\n");
    expect(parseP8(escaped)).toEqual({ ok: true, value: PEM });
  });

  it("says so, without the value, when it is not a key", () => {
    const r = parseP8("AuthKey_ABC123.p8");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).not.toContain("ABC123");
    expect(parseP8(undefined).ok).toBe(false);
  });

  it("normalizePem refuses a body that is not base64", () => {
    expect(normalizePem("-----BEGIN PRIVATE KEY-----\nnot base64 !!\n-----END PRIVATE KEY-----")).toBeNull();
  });
});

describe("describeShape", () => {
  it("names the single-line paste, which is the one that keeps happening", () => {
    const shape = describeShape("-----BEGIN PRIVATE KEY-----");
    expect(shape).toContain("only the first line");
    expect(shape).toContain("base64");
  });

  it("names a file name pasted in place of a file", () => {
    expect(describeShape("AuthKey_ABC1234567.p8")).toContain("file name or a path");
    expect(describeShape("C:\Users\Edgar\Downloads\AuthKey.p8")).toContain("file name or a path");
  });

  it("names a value that is simply too short", () => {
    expect(describeShape("ABC1234567")).toContain("too short");
  });

  it("never repeats the value back", () => {
    const secret = `-----BEGIN PRIVATE KEY-----
SUPERSECRETMATERIAL
`;
    const shape = describeShape(secret);
    expect(shape).not.toContain("SUPERSECRETMATERIAL");
  });

  it("puts the reason in the parse failure", () => {
    const r = parseP8("-----BEGIN PRIVATE KEY-----");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("only the first line");
  });
});
