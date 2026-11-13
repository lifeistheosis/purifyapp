// The gate cuts its export with the store builds' own switches (the arbiter,
// 2026-11-13, on a gap the Fable fresh-eyes chat found): read from the store
// workflows at run time, never a recorded subset.
//
// Until then the gate's recorded recipe (docs/1.9-build/notes/gate-run-1.md,
// scripts/lib/sells-plus.mjs) set only the two Plus values. Both store
// workflows (.github/workflows/android-apk.yml, ios-release.yml) hardcode
// NEXT_PUBLIC_SHOP_ENABLED and NEXT_PUBLIC_COMMUNITY_ENABLED to "1", so every
// store build carries the shop inside the app and Community open, while every
// page of the shop in the gate's export was Next's 404 and Community stood in
// its unopened state: the shop inside the app was never gated.
//
// What it does:
//   storeSwitches(platform)  the NEXT_PUBLIC values of the store workflow's own
//                            export step, each as the store build has it: a
//                            value written in the workflow, or one it takes
//                            from a secret
//   gateSwitches(platform)   the gate's export's values: every value written in
//                            the workflow, as written; for each from a secret,
//                            the gate's stand-in below, named with its reason
//                            (a secret no stand-in names refuses the export)
//   checkStoreExport(out)    refuse to walk an export the store would not
//                            build (one cut without the store's switches)
//
// lib/build/__tests__/gateSwitches.test.ts fails when the gate's switches and a
// store workflow's disagree, or a workflow takes a value from a secret the gate
// has not named.

import fs from "node:fs";
import path from "node:path";

/** Each store workflow, and how its export step is told from the others. */
export const WORKFLOWS = {
  android: { file: ".github/workflows/android-apk.yml", step: /native-build\.mjs --platform android|npm run build:android/ },
  ios: { file: ".github/workflows/ios-release.yml", step: /native-build\.mjs --platform ios|npm run build:ios/ },
};

/**
 * What the gate puts where a store build reads a secret, and why. `value: null` leaves it unset.
 * `from: "main web"` is read from purifyapp.net's own scripts at the export (CLAUDE.md, "The public
 * key for an export, always").
 */
export const STAND_INS = {
  NEXT_PUBLIC_SUPABASE_URL: { from: "main web", why: "the main web's public address, read from purifyapp.net's own scripts (his standing word, \"yes key always\")" },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: { from: "main web", why: "the main web's public anon key, read from purifyapp.net's own scripts and checked to be the anon role (his standing word, \"yes key always\"); printed and written nowhere" },
  NEXT_PUBLIC_SITE_URL: { value: "https://purifyapp.net", why: "the main web, which the store builds talk to (CLAUDE.md)" },
  NEXT_PUBLIC_PLUS_ENFORCED_ANDROID: { value: "1", why: "the release position: the Android app sells Plus" },
  NEXT_PUBLIC_PLUS_ENFORCED_NATIVE: { value: null, why: "the legacy name of the Android switch above, which stands for it (lib/entitlements/entitlements.ts)" },
  NEXT_PUBLIC_PLUS_ENFORCED_IOS: { value: "1", why: "the release position: the iPhone app sells Plus" },
  NEXT_PUBLIC_REVENUECAT_ANDROID_KEY: { value: "walk", why: "a stand-in key, so the export sells Plus as the store's does and no purchase can be made (scripts/lib/sells-plus.mjs)" },
  NEXT_PUBLIC_REVENUECAT_IOS_KEY: { value: "walk", why: "a stand-in key, as Android's" },
  NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID: { value: null, why: "Google sign-in's own client id, which the gate cannot read: the walks are signed out" },
  NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID: { value: null, why: "as the web client id" },
  NEXT_PUBLIC_APPLE_SIGNIN_ENABLED: { value: "1", why: "the iPhone workflow refuses a build without it" },
  NEXT_PUBLIC_CAMPAIGNS_ENABLED: { value: null, why: "no longer read by the app at all: campaigns follow the constant in lib/campaigns/flags.ts" },
  NEXT_PUBLIC_EIKON_BOX_ENABLED: { value: null, why: "the EIKON Box's switch, read by lib/eikonBox/flags.ts; the store's secret cannot be read here, so the gate walks its safe default (unset: the member screens say opening soon). If the store's secret is 1, the Box's member screens are not gated", unknown: true },
};

/**
 * The store build's branch of a workflow expression: `${{ inputs.website == 'test web' && A || B }}`
 * is B in a store build; `${{ secrets.X }}` is the secret X; a quoted or bare value is itself.
 */
function storeBranch(raw) {
  const v = raw.trim();
  const expr = /^\$\{\{\s*(.*?)\s*\}\}$/.exec(v);
  if (!expr) return { kind: "written", value: v.replace(/^(["'])(.*)\1$/, "$2") };
  let body = expr[1];
  const test = /^inputs\.website\s*==\s*'test web'\s*&&\s*(.+?)\s*\|\|\s*(.+)$/.exec(body);
  if (test) body = test[2].trim();
  const secret = /^secrets\.([A-Z0-9_]+)$/.exec(body);
  if (secret) return { kind: "secret", secret: secret[1] };
  const quoted = /^'(.*)'$/.exec(body);
  if (quoted) return { kind: "written", value: quoted[1] };
  return { kind: "expression", expression: expr[1] };
}

/** The NEXT_PUBLIC values of a store workflow's export step, as the store build has them. */
export function storeSwitches(platform, root = process.cwd()) {
  const wf = WORKFLOWS[platform];
  if (!wf) throw new Error(`no store workflow for ${platform}`);
  const lines = fs.readFileSync(path.join(root, wf.file), "utf8").split("\n");
  // The export step: the one whose run line builds the export.
  const runAt = lines.findIndex((l) => /^\s*run:/.test(l) && wf.step.test(l));
  if (runAt < 0) throw new Error(`${wf.file}: no step builds the export (${wf.step})`);
  const stepIndent = (() => {
    for (let i = runAt; i >= 0; i--) {
      const m = /^(\s*)- name:/.exec(lines[i]);
      if (m) return m[1].length;
    }
    return 0;
  })();
  const envAt = lines.findIndex((l, i) => i > runAt - 12 && /^\s*env:\s*$/.test(l) && (/^(\s*)/.exec(l)[1].length > stepIndent));
  if (envAt < 0) throw new Error(`${wf.file}: the export step has no env block`);
  const envIndent = /^(\s*)/.exec(lines[envAt])[1].length;
  const out = [];
  for (let i = envAt + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim() || /^\s*#/.test(l)) continue;
    const indent = /^(\s*)/.exec(l)[1].length;
    if (indent <= envIndent) break;
    const m = /^\s*([A-Z0-9_]+):\s*(.*?)\s*$/.exec(l);
    if (!m) continue;
    if (!m[1].startsWith("NEXT_PUBLIC_")) continue;
    out.push({ name: m[1], raw: m[2], ...storeBranch(m[2]) });
  }
  if (!out.length) throw new Error(`${wf.file}: the export step's env block names no NEXT_PUBLIC value`);
  return out;
}

/**
 * The gate's export's values for a platform: { env, said }. `env` holds what the build is given
 * (null: unset; "main web": read at the export); `said` is a line for each value, matched or
 * stood in for, with its reason. Throws on a value the gate cannot account for.
 */
export function gateSwitches(platform, root = process.cwd()) {
  const env = {};
  const said = [];
  const refused = [];
  for (const s of storeSwitches(platform, root)) {
    if (s.kind === "written") {
      env[s.name] = s.value === "" ? null : s.value;
      said.push(`${s.name}=${JSON.stringify(s.value)}: as the store workflow writes it`);
    } else if (s.kind === "secret") {
      const stand = STAND_INS[s.name];
      if (!stand) {
        refused.push(`${s.name} (secret ${s.secret})`);
        continue;
      }
      env[s.name] = stand.from === "main web" ? "main web" : stand.value;
      said.push(`${s.name}: the store reads the secret ${s.secret}; the gate uses ${stand.from === "main web" ? "the main web's own value" : stand.value === null ? "nothing (unset)" : JSON.stringify(stand.value)}: ${stand.why}`);
    } else refused.push(`${s.name} (${s.expression})`);
  }
  if (refused.length) throw new Error(`the store workflow for ${platform} takes values the gate has not named a stand-in for: ${refused.join(", ")}. Name each in STAND_INS, scripts/lib/store-switches.mjs.`);
  return { env, said };
}

/** Whether an export's page was built as Next's 404 (the shop with its switch off). */
function builtAsNotFound(out, page) {
  const file = path.join(out, page, "index.txt");
  return fs.existsSync(file) && fs.readFileSync(file, "utf8").includes("NEXT_HTTP_ERROR_FALLBACK;404");
}

/**
 * Refuse to walk an export the store would not build: the store workflows open the shop inside
 * the app, so an export whose shop is a 404 was cut without the store's switches.
 */
export function checkStoreExport(out, root = process.cwd()) {
  const shop = storeSwitches("android", root).find((s) => s.name === "NEXT_PUBLIC_SHOP_ENABLED");
  if (shop?.kind === "written" && /^(1|true|yes)$/i.test(shop.value) && builtAsNotFound(out, "shop")) {
    throw new Error(`${out} was not cut with the store's switches: its shop is a 404, and the store's is open. Cut it with node scripts/gate/export.mjs`);
  }
}

/**
 * Where the gate's export and a store workflow disagree: a value either workflow writes that the
 * gate's export (cut as Android's, which the walks stand in for both phones) does not use as
 * written. Empty when they agree.
 */
export function disagreements(root = process.cwd()) {
  const out = [];
  const gate = gateSwitches("android", root).env;
  for (const platform of Object.keys(WORKFLOWS)) {
    for (const s of storeSwitches(platform, root)) {
      if (s.kind !== "written") continue;
      const want = s.value === "" ? null : s.value;
      const used = s.name in gate ? gate[s.name] : null;
      if (used !== want) out.push(`${WORKFLOWS[platform].file} writes ${s.name}=${JSON.stringify(s.value)}; the gate's export uses ${used === null ? "nothing" : JSON.stringify(used)}`);
    }
  }
  return out;
}
