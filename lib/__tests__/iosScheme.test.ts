import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `iosScheme` must never be "https" or "http".
 *
 * Capacitor reads the value with no validation (CAPInstanceDescriptor.swift:90)
 * and passes it to `setURLSchemeHandler(_:forURLScheme:)`
 * (CAPBridgeViewController.swift:297). Apple's API raises
 * NSInvalidArgumentException for any scheme WKWebView already handles, and an
 * Objective-C exception cannot be caught from Swift, so the app terminates on
 * launch. Every device, every time, before anything renders.
 *
 * Capacitor's own typings say it outright: "Can't be set to schemes that the
 * WKWebView already handles, such as http or https"
 * (@capacitor/cli declarations.d.ts:545).
 *
 * This is not hypothetical. It shipped on main as the fix for the 1.0 build 12
 * rejection under guideline 2.1(a), on the correct diagnosis that
 * capacitor://localhost cannot back document.cookie, but with a remedy that
 * traded a sign-in failure for a launch crash. The session is persisted in
 * localStorage instead now, in lib/supabase/client.ts, which is scheme
 * independent.
 *
 * The reasoning that led there is genuinely tempting, which is why this is a
 * test and not a comment: a secure context really would fix cookies, and
 * nothing in the build output warns you. The crash only appears on a device.
 */
const ROOT = path.resolve(__dirname, "..", "..");
const CONFIG = path.join(ROOT, "capacitor.config.ts");

describe("capacitor iosScheme", () => {
  const source = fs.readFileSync(CONFIG, "utf8");

  it("is never set to a scheme WKWebView reserves", () => {
    // Match an actual assignment, not the prose explaining why not to.
    const assignment = source.match(/iosScheme\s*:\s*["'`]([^"'`]+)["'`]/);
    if (!assignment) return; // absent is correct: Capacitor defaults to "capacitor"
    const scheme = assignment[1].toLowerCase();
    expect(
      ["http", "https", "file", "about", "data", "blob", "ws", "wss", "ftp"],
      `capacitor.config.ts sets iosScheme to "${scheme}". WKWebView reserves ` +
        `that scheme and setURLSchemeHandler raises an uncatchable ` +
        `NSInvalidArgumentException, so the app crashes on launch. If you are ` +
        `here because the session does not persist on iOS, that is fixed in ` +
        `lib/supabase/client.ts, not by changing the scheme.`,
    ).not.toContain(scheme);
  });

  it("keeps androidScheme https, which is a real secure origin there", () => {
    expect(source).toMatch(/androidScheme\s*:\s*["'`]https["'`]/);
  });

  it("still allow-lists the iOS shell origin for CORS", () => {
    // Reverting iosScheme means iOS is back on capacitor://localhost, so the
    // CORS allow-list has to keep that entry or every authenticated API call
    // from the iPhone app is blocked by the browser before it is sent.
    const cors = fs.readFileSync(path.join(ROOT, "lib/api/cors.ts"), "utf8");
    expect(cors).toContain("capacitor://localhost");
    expect(cors).toContain("https://localhost");
  });
});
