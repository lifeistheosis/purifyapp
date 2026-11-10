// The test web, for the website and the apps (rules: lib/testWeb/rules.ts;
// record: docs/1.9-build/notes/test-web.md).
//
// Each value is read by its own name, so a page built for the browser or the
// apps carries the public ones (Next writes a NEXT_PUBLIC_ value into the code
// only where it is named in full). The rest are the server's alone and are
// absent in the browser, which the rules allow for.

import { isTestWebEnv, testWebProblems, type TestWebEnv } from "./rules";

export { MAIN_SUPABASE_REF, MAIN_WEB_ORIGIN, TEST_WEB_FLAG } from "./rules";

/** The settings the rules read, each by its own name. */
export function testWebEnv(): TestWebEnv {
  return {
    NEXT_PUBLIC_TEST_WEB: process.env.NEXT_PUBLIC_TEST_WEB,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    OWNER_EMAILS: process.env.OWNER_EMAILS,
    TEST_WEB_PASSWORD: process.env.TEST_WEB_PASSWORD,
  };
}

/**
 * This is the test web, safely: its own database, its own address, no live
 * payment key. False on the main web whatever its settings say. What only the
 * test web may do (campaigns open to every account there, its password, its
 * noindex) asks this.
 */
export function isTestWeb(): boolean {
  return isTestWebEnv(testWebEnv());
}

/** What stops the test web from starting; empty everywhere else. */
export function testWebStartProblems(): string[] {
  return testWebProblems(testWebEnv());
}

/** The words that mark the test web where the version is shown. Its owner's, so not translated. */
export const TEST_WEB_LABEL = "Test web";
