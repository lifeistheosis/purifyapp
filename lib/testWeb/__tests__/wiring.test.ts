// The test web's rules are obeyed where they have to be (lib/testWeb/rules.ts;
// docs/1.9-build/notes/test-web.md). Read as text, as other tests here read
// the workflows and next.config.ts.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("the Android workflow keeps a test web build out of the stores", () => {
  const yml = read(".github/workflows/android-apk.yml");

  it("asks which website, with the main web as the default", () => {
    expect(yml).toMatch(/website:\s*\n\s*description:[^\n]*\n\s*type: choice\s*\n\s*options:\s*\n\s*- main web\s*\n\s*- test web\s*\n\s*default: main web/);
  });

  it("says it is the test web, with the test web's values, only when asked", () => {
    expect(yml).toContain("NEXT_PUBLIC_TEST_WEB: ${{ inputs.website == 'test web' && '1' || '' }}");
    expect(yml).toContain("node scripts/native-build.mjs --platform android ${{ inputs.website == 'test web' && '--test-web' || '' }}");
    for (const name of ["TEST_WEB_SUPABASE_URL", "TEST_WEB_SUPABASE_ANON_KEY", "TEST_WEB_SITE_URL"]) {
      for (const line of yml.split("\n").filter((l) => l.includes(`secrets.${name}`))) {
        expect(line, name).toContain("inputs.website == 'test web' &&");
      }
    }
  });

  it("makes no AAB for the test web, and publishes its APK under its own release only", () => {
    const gradle = yml.slice(yml.indexOf('if [ "${{ inputs.website }}" = "test web" ]; then'), yml.indexOf("fi\n", yml.indexOf("assembleDebug")));
    const testBranch = gradle.slice(0, gradle.indexOf("else"));
    expect(testBranch).toContain("assembleRelease");
    expect(testBranch).not.toContain("bundleRelease");
    expect(testBranch).not.toContain("assembleDebug");
    // The store's release is never written by a test web run.
    const storePublish = yml.slice(yml.indexOf("- name: Publish to the android-release release"));
    expect(storePublish.slice(0, 200)).toContain("if: ${{ inputs.website != 'test web' }}");
    const testPublish = yml.slice(yml.indexOf("- name: Publish the test web's APK to its own release"));
    expect(testPublish).toContain("if: ${{ inputs.website == 'test web' }}");
    expect(testPublish).toContain("tag_name: android-test-web");
    expect(testPublish).toContain("purify-test-web.apk");
    expect(testPublish).not.toContain(".aab");
  });

  it("refuses the remote wrapper for the test web", () => {
    expect(yml).toContain("if: ${{ inputs.website == 'test web' && !inputs.local_first }}");
  });
});

describe("the build script refuses a wrong build before it touches anything", () => {
  const script = read("scripts/native-build.mjs");

  it("checks the build against the rules first", () => {
    const check = script.indexOf("appBuildProblems(process.env, { testWeb: TEST_WEB })");
    expect(check).toBeGreaterThan(0);
    expect(script).toContain('import { appBuildProblems } from "../lib/testWeb/rules.ts";');
    // Before the out/ folder is wiped and before anything is stashed.
    expect(check).toBeLessThan(script.indexOf("STASH_DIR"));
    expect(check).toBeLessThan(script.indexOf("rmSync"));
  });

  it("never prints the test web's address, since this repository's logs are public", () => {
    expect(script).not.toMatch(/console\.log\([^)]*NEXT_PUBLIC_SITE_URL/);
  });
});

describe("the website obeys the rules", () => {
  it("asks for the password before anything else, and marks every answer noindex on the test web", () => {
    const proxy = read("proxy.ts");
    const gate = proxy.indexOf("testWebGate(request.nextUrl.pathname");
    expect(gate).toBeGreaterThan(0);
    expect(gate).toBeLessThan(proxy.indexOf("refFromUrl("));
    expect(proxy).toContain('response.headers.set("X-Robots-Tag", "noindex, nofollow")');
  });

  it("refuses to start a test web that breaks a rule", () => {
    const inst = read("instrumentation.ts");
    expect(inst).toMatch(/export async function register\(\)[\s\S]*testWebStartProblems\(\)[\s\S]*throw new Error/);
  });

  it("shuts robots, empties the sitemap and keeps its pages out of search on the test web", () => {
    expect(read("app/robots.ts")).toContain('if (isTestWeb()) return { rules: [{ userAgent: "*", disallow: "/" }] };');
    expect(read("app/sitemap.ts")).toContain("if (isTestWeb()) return [];");
    expect(read("app/layout.tsx")).toContain("robots: { index: false, follow: false }");
  });

  it("sends mail through the one sender, which keeps to the test web's rule", () => {
    const send = read("lib/email/send.ts");
    expect(send).toContain("testWebMayEmail(a, env)");
    expect(send.indexOf("testWebMayEmail(a, env)")).toBeLessThan(send.indexOf("suppressedAmong(all"));
  });
});
