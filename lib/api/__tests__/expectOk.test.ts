// A destructive action may only report success when the server said so.
//
// The case that matters is not a 500. It is a 200. The Android app is a
// static export served from https://localhost with app/api stashed out of the
// tree, so the shell itself can answer an API request with the SPA fallback:
// status 200, an HTML body, `res.ok === true`. Under the old
// `if (!res.ok) throw` check that path printed "Signed out of all other
// devices" while every other session stayed live.
//
// So the first test below is the important one.

import { describe, expect, it } from "vitest";

import { NotConfirmedError, expectOk } from "../expectOk";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function html(status = 200): Response {
  return new Response("<!doctype html><html><body>Purify</body></html>", {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

describe("expectOk", () => {
  it("rejects the SPA fallback: HTTP 200 carrying HTML", async () => {
    await expect(expectOk(html(200))).rejects.toBeInstanceOf(NotConfirmedError);
  });

  it("rejects a 200 whose JSON body does not say ok", async () => {
    await expect(expectOk(json({}))).rejects.toBeInstanceOf(NotConfirmedError);
    await expect(expectOk(json({ ok: false }))).rejects.toBeInstanceOf(
      NotConfirmedError,
    );
    // Truthy but not true: an API that starts returning ok:"yes" must not
    // silently count as confirmation.
    await expect(expectOk(json({ ok: "yes" }))).rejects.toBeInstanceOf(
      NotConfirmedError,
    );
  });

  it("rejects a 200 with a body that is not JSON at all", async () => {
    const broken = new Response("not json", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    await expect(expectOk(broken)).rejects.toBeInstanceOf(NotConfirmedError);
  });

  it("surfaces the server's own error message when it sends one", async () => {
    await expect(
      expectOk(json({ error: "Not signed in." }, 401)),
    ).rejects.toThrow("Not signed in.");
  });

  it("falls back to the status when an error body carries no message", async () => {
    await expect(expectOk(json({}, 500))).rejects.toThrow("500");
  });

  it("resolves only on a JSON body that explicitly says ok: true", async () => {
    await expect(expectOk(json({ ok: true }))).resolves.toBeUndefined();
  });

  it("returns nothing, so a caller cannot branch on a boolean and forget the else", async () => {
    // The signature is Promise<void> on purpose: `if (ok) {...}` with no else
    // is exactly how a silent failure gets reported as a success.
    await expect(expectOk(json({ ok: true }))).resolves.toBeUndefined();
  });
});
