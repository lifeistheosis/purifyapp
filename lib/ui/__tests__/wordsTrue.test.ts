import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PLUS_ROWS, PRO_ROWS } from "@/lib/premium/plusRows";

/**
 * The pre-build gate, part 4: the words (docs/1.9-build/notes/build-93.md,
 * "The pre-build gate"; CLAUDE.md, "No test build reaches him until it passes
 * the pre-build gate", item 4). No line a reader can read names a feature the
 * app no longer has, or promises what is not so: what is free, what is Plus.
 *
 * Build 93 carried two such lines to his phone: "Nothing in this app is
 * locked behind a payment" on Support this work, a year after Plus, and "Those
 * from the prayer wall leave your prayers now." after the wall went (notes 10
 * and 14). Nothing read the words for truth.
 *
 * What it reads: every catalog (a key is read where the code draws it), and
 * the words written into the pages, the legal texts, the emails and the
 * board message, comments left out. Not the patch notes: an old note saying
 * the prayer wall came is history, and true.
 *
 * A line known to break a rule, and owned, stands in WAITING with its owner
 * and the note that has it, so the suite stays green while the gate shows
 * it. The gate passes only when WAITING is empty; an entry whose line is
 * gone fails here until it is taken off.
 *
 * What would go wrong if this broke: a reader is told something that is not
 * so (that signing in syncs their notes, that nothing is counted, that the
 * wall is there), in the voice that signs "Edgar, the Purify Team".
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

type Rule = { id: string; says: string; why: string; pattern: RegExp };

export const RULES: readonly Rule[] = [
  // Features the app no longer has.
  { id: "prayer-wall", says: "names the prayer wall", why: "the wall went to the Vault in 1.9 (88931feae); campaigns took its place", pattern: /prayer wall|Gebetswand/i },
  { id: "coffee", says: "names Buy Me a Coffee", why: "Support this work names Plus and the EIKON shop since 1.9 (a22707708)", pattern: /buy\s*me\s*a\s*coffee/i },
  { id: "magic-link", says: "says sign-in is by an emailed link", why: "sign-in is an email and a password, or Google or Apple (components/auth/SignInForm.tsx)", pattern: /magic link/i },
  // Promises that stopped being true.
  { id: "nothing-locked", says: "says nothing is locked or paywalled", why: "Purify Plus, sold since 1.8 (docs/1.9-build/free-and-plus.md)", pattern: /locked behind a payment|nothing is paywalled/i },
  { id: "plus-planned", says: "says Plus is still to come", why: "Plus has been sold since 1.8", pattern: /is planned for after the mobile launch|subscription when it arrives/i },
  {
    id: "no-analytics",
    says: "says nothing is counted",
    why: "the app keeps anonymous counts; the Privacy page says what they are and that they are never joined to an account",
    pattern: /no analytics(?! tied| joined)|analytics layer|keine Analytik,(?! die mit deiner Konto)|Analytik-Schicht/i,
  },
  { id: "no-notifications", says: "says no notification ever comes", why: "prayer reminders come when a reader turns them on (the Privacy page)", pattern: /no notifications pulling|keine Benachrichtigungen, die/i },
  {
    id: "sync-on-sign-in",
    says: "promises sync on signing in alone",
    why: "highlights, notes and bookmarks go to every device with Purify Plus (every file in lib/sync/ asks canSync); a free account carries the days prayed and the names carried (docs/1.9-build/free-and-plus.md)",
    pattern: new RegExp(
      [
        "sign in to sync",
        "signing in syncs",
        "account exists for sync",
        "signing in exists to keep your reading synchroni[sz]ed",
        "so they sync across every device you sign in on",
        "pushed to your account on first sign-in",
        "sync your highlights, notes, bookmarks",
        "signing in adds one thing, keeping them synchroni[sz]ed",
        "sync across devices with email",
        "local data is syncing",
        "^sync across devices \\(optional\\)$",
        // The German Privacy page's same lines.
        "Anmeldung gibt es, damit dein Lesen",
        "damit sie sich auf jedem Ger\u00e4t abgleichen",
        "bei der ersten Anmeldung in dein Konto",
        "Wenn du dich anmeldest, um deine Markierungen",
      ].join("|"),
      "im",
    ),
  },
  {
    id: "settings-stay",
    says: "says reader settings have no server table",
    why: "with Purify Plus the reading settings travel (supabase/migrations/20261110012059_user_kept.sql, the Privacy page's paragraph on what travels with Plus)",
    pattern: /no server table yet|noch keine Servertabelle|keine Servertabelle/i,
  },
];

type TrueLine = { key: string; rule: string; why: string };

/** Lines that use a rule's words and say what is so, each with its reason. */
export const TRUE_LINES: readonly TrueLine[] = [
  { key: "signin.invalidCredentials", rule: "magic-link", why: "it speaks of the magic-link era to a reader who signed up then, and tells them how to set a password" },
  { key: "ui.welcomeYourLocalDataIs", rule: "sync-on-sign-in", why: "the banner is drawn only where canSync() is true, Purify Plus or a supporter (components/profile/PostSignInBridge.tsx)" },
];

type Waiting = { rule: string; key?: string; file?: string; owner: string; note: string };

/** Known, owned, and in hand. The gate passes only when this is empty. */
export const WAITING: readonly Waiting[] = [
  // The Privacy page, English and German: its lines on signing in (the arbiter's A and B, and (j)) and
  // Buy Me a Coffee among its third parties, waiting on his yes through the arbiter.
  { rule: "sync-on-sign-in", file: "components/legal/PrivacyText.tsx", owner: "Admin", note: "the arbiter's A and B and words-h2-h3.md (j), on his yes" },
  { rule: "settings-stay", file: "components/legal/PrivacyText.tsx", owner: "Admin", note: "the arbiter's A, on his yes" },
  { rule: "coffee", file: "components/legal/PrivacyText.tsx", owner: "Admin", note: "words-h2-h3.md (j), on his yes" },
];

// ── What a reader reads ─────────────────────────────────────────────────

/** Code without its comments: what it draws and says. */
const drawn = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/([^:"'`\\])\/\/[^\n"'`]*$/gm, "$1");

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (name === "__tests__" || name === "node_modules") continue;
    if (statSync(join(ROOT, rel)).isDirectory()) files(rel, out);
    else if (/\.(tsx?|json)$/.test(name)) out.push(rel);
  }
  return out;
}

/** The pages, components, emails and the board message: reader-facing code, the admin and the API left out. */
const READER_FILES = [
  ...files("app").filter((f) => !/^app\/(api|admin)\//.test(f) && !/\/admin\//.test(f) && f.endsWith(".tsx")),
  ...files("components").filter((f) => !/^components\/admin\//.test(f) && f.endsWith(".tsx")),
  ...files("lib/email").filter((f) => /\.tsx?$/.test(f)),
  "data/changelog/board.json",
];

/** Every key the code names, so a key in a catalog that nothing draws is not read as shown. */
const CODE = [...files("app"), ...files("components"), ...files("lib").filter((f) => !f.startsWith("lib/i18n/messages/"))]
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => read(f))
  .join("\n");
const isDrawn = (key: string) => CODE.includes(`"${key}"`) || CODE.includes(`'${key}'`) || CODE.includes(`\`${key}\``);

const CATALOGS = readdirSync(join(ROOT, "lib/i18n/messages"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ lang: f.replace(/\.json$/, ""), words: JSON.parse(read(`lib/i18n/messages/${f}`)) as Record<string, string> }));

type Hit = { rule: string; key?: string; file?: string; sample: string; langs?: string[] };

function hits(): Hit[] {
  const out = new Map<string, Hit>();
  for (const rule of RULES) {
    for (const { lang, words } of CATALOGS) {
      for (const [key, value] of Object.entries(words)) {
        if (typeof value !== "string" || !rule.pattern.test(value) || !isDrawn(key)) continue;
        if (TRUE_LINES.some((t) => t.key === key && t.rule === rule.id)) continue;
        const id = `${rule.id}|key|${key}`;
        const h = out.get(id) ?? { rule: rule.id, key, sample: value.slice(0, 90), langs: [] };
        h.langs!.push(lang);
        out.set(id, h);
      }
    }
    for (const file of READER_FILES) {
      // JSX wraps its words across lines; they are read as one run of words.
      const text = drawn(read(file)).replace(/\s+/g, " ");
      const flags = [...new Set(`${rule.pattern.flags.replace("g", "")}m`)].join("");
      const m = text.match(new RegExp(rule.pattern.source, flags));
      if (m) out.set(`${rule.id}|file|${file}`, { rule: rule.id, file, sample: m[0] });
    }
  }
  return [...out.values()];
}

const HITS = hits();
const waitingFor = (h: Hit) => WAITING.find((w) => w.rule === h.rule && ((h.key && w.key === h.key) || (h.file && w.file === h.file)));

describe("the words: nothing a reader reads names what is gone or promises what is not so", () => {
  for (const rule of RULES) {
    it(`no line ${rule.says} (${rule.why})`, () => {
      const open = HITS.filter((h) => h.rule === rule.id && !waitingFor(h)).map((h) => (h.key ? `${h.key} [${h.langs!.join(", ")}]: "${h.sample}"` : `${h.file}: "${h.sample}"`));
      expect(open, `${rule.says}: mend it, or name it in WAITING with its owner and note`).toEqual([]);
    });
  }

  it("every line still waiting still says it (a mended one comes off the list)", () => {
    const stale = WAITING.filter((w) => !HITS.some((h) => h.rule === w.rule && ((w.key && h.key === w.key) || (w.file && h.file === w.file)))).map(
      (w) => `${w.rule} ${w.key ?? w.file} (${w.owner})`,
    );
    expect(stale).toEqual([]);
  });

  it("every true line still uses the words it is allowed (one that stops comes off the list)", () => {
    for (const t of TRUE_LINES) {
      const rule = RULES.find((r) => r.id === t.rule)!;
      expect(CATALOGS.some(({ words }) => typeof words[t.key] === "string" && rule.pattern.test(words[t.key])), t.key).toBe(true);
    }
  });

  it("knows each rule: a line made to break it is caught", () => {
    const samples: Record<string, string> = {
      "prayer-wall": "Those from the prayer wall leave your prayers now.",
      coffee: "Buy Me a Coffee, only on /support",
      "magic-link": "Sign-in is by an emailed magic link.",
      "nothing-locked": "Nothing in this app is locked behind a payment.",
      "plus-planned": "An optional layer called Purify Plus is planned for after the mobile launch.",
      "no-analytics": "There is no analytics layer.",
      "no-notifications": "no notifications pulling you back",
      "sync-on-sign-in": "Signing in syncs your local highlights.",
      "settings-stay": "Reader settings stay on this device for now (no server table yet).",
    };
    for (const rule of RULES) expect(rule.pattern.test(samples[rule.id]), rule.id).toBe(true);
    expect(RULES.find((r) => r.id === "sync-on-sign-in")!.pattern.test("Die Anmeldung gibt es, damit dein Lesen auf allen deinen Ger\u00e4ten bleibt.")).toBe(true);
    expect(RULES.find((r) => r.id === "no-analytics")!.pattern.test("Keine Analytik, die mit deiner Konto-Identit\u00e4t verkn\u00fcpft wird.")).toBe(false);
    // And the true lines beside them pass.
    expect(RULES.find((r) => r.id === "no-analytics")!.pattern.test("+ Still no ads, no analytics tied to identity, no selling.")).toBe(false);
  });
});

// ── What is free, and what is Plus ──────────────────────────────────────

const LIST = read("docs/1.9-build/free-and-plus.md");
const section = (title: string) => {
  const at = LIST.indexOf(`\n## ${title}\n`);
  expect(at, `docs/1.9-build/free-and-plus.md has "## ${title}"`).toBeGreaterThanOrEqual(0);
  const rest = LIST.slice(at + title.length + 5);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
};
const named = (text: string) => [...text.matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1]);
const en = CATALOGS.find((c) => c.lang === "en")!.words;

describe("docs/1.9-build/free-and-plus.md, checked against the code", () => {
  it("names exactly the Plus rows the paywall draws", () => {
    expect(named(section("Purify Plus")).sort()).toEqual(PLUS_ROWS.map((r) => en[r.name]).sort());
  });

  it("names exactly the Pro rows", () => {
    expect(named(section("Purify Pro")).sort()).toEqual(PRO_ROWS.map((r) => en[r.name]).sort());
  });

  it("names only catalog keys that exist", () => {
    const keys = [...LIST.matchAll(/\(([a-z]+(?:\.[A-Za-z]+)+)(?:, ([a-z]+(?:\.[A-Za-z]+)+))?\)/g)].flatMap((m) => [m[1], m[2]].filter(Boolean));
    expect(keys.length).toBeGreaterThan(5);
    for (const k of keys) expect(en[k], k).toBeTruthy();
  });

  it("the days prayed and the names carried go with a free account, and the rest of sync is Plus", () => {
    // Free with an account: neither the client nor the route asks for Plus.
    expect(read("lib/prayers/sync.ts")).not.toMatch(/canSync|entitlement/i);
    expect(drawn(read("app/api/prayer/sync/route.ts"))).not.toMatch(/canSync|getEntitlements|deriveEntitlements|plusEnforcedFor/);
    // Plus: every sync module asks before it carries anything.
    const helpers = ["gate.ts", "tombstones.ts", "keptMerge.ts"];
    const modules = readdirSync(join(ROOT, "lib/sync")).filter((f) => f.endsWith(".ts") && !helpers.includes(f));
    expect(modules.length).toBeGreaterThan(4);
    for (const f of modules) expect(read(`lib/sync/${f}`), f).toMatch(/canSync(Places)?\(/);
  });
});
