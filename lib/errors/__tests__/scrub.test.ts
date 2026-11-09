// What an error report may keep (A10): the page as a path, and a message with
// nothing in it that could name or reach a person.

import { describe, expect, it } from "vitest";

import { cleanVersion, pathOnly, scrubMessage } from "../scrub";

describe("pathOnly", () => {
  it("keeps the path and drops the query and the hash", () => {
    expect(pathOnly("/bible/john/1?q=love#v3")).toBe("/bible/john/1");
    expect(pathOnly("https://purifyapp.net/shop/eikon?email=a@b.com")).toBe("/shop/eikon");
    expect(pathOnly("https://localhost")).toBe("/");
  });

  it("refuses what is not a path", () => {
    expect(pathOnly("")).toBeNull();
    expect(pathOnly(null)).toBeNull();
    expect(pathOnly("javascript:alert(1)")).toBeNull();
    expect(pathOnly("bible/john")).toBeNull();
  });

  it("scrubs an account id or an email written into a path", () => {
    expect(pathOnly("/u/3f1c2b8e-1d2a-4f5b-9c7d-0a1b2c3d4e5f/notes")).toBe("/u/<id>/notes");
    expect(pathOnly("/unsubscribe/someone@example.com")).toBe("/unsubscribe/<email>");
  });
});

describe("scrubMessage", () => {
  it("removes emails, long numbers, account ids and tokens", () => {
    const m = scrubMessage(
      "Failed for someone.else@example.org, order 4242 4242 4242, user 3f1c2b8e-1d2a-4f5b-9c7d-0a1b2c3d4e5f, token eyJhbGciOi.eyJzdWIi.sig, phone +1 555-123-4567",
    );
    expect(m).toBe("Failed for <email>, order <number>, user <id>, token <token>, phone <number>");
  });

  it("keeps short numbers, which name nothing", () => {
    expect(scrubMessage("HTTP 503 after 12 tries")).toBe("HTTP 503 after 12 tries");
  });

  it("takes an Error or a string, folds its lines, and cuts it to 300", () => {
    expect(scrubMessage(new Error("boom\n  at line"))).toBe("boom at line");
    const long = scrubMessage("x".repeat(500));
    expect(long?.length).toBe(300);
    expect(long?.endsWith("…")).toBe(true);
    expect(scrubMessage("   ")).toBeNull();
    expect(scrubMessage(undefined)).toBeNull();
  });
});

describe("cleanVersion", () => {
  it("keeps a version and nothing else", () => {
    expect(cleanVersion("1.9")).toBe("1.9");
    expect(cleanVersion("1.8.2")).toBe("1.8.2");
    expect(cleanVersion("1.9; DROP")).toBeNull();
    expect(cleanVersion(19)).toBeNull();
  });
});
