import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { checkNotificationCopy, isDoctrinal, MAX_BODY, MAX_TITLE } from "../doctrine";
import {
  COMMUNITY_PUSH_KEYS,
  NOTIFICATION_COPY,
  REMINDER_PUSH_KEYS,
  broadcastTemplates,
  campaignCopy,
  communityPushCopy,
  eikonBoxAnnouncement,
  reminderCopy,
} from "../copy";

/**
 * The test CONTRIBUTING.md has been claiming exists since 2026-08-10.
 *
 * Three layers, and the third is the one that matters. Layer one checks the
 * predicate does what it says. Layer two runs it over every row in the table.
 * Layer three greps the tree for a notification string living anywhere but the
 * table, which is what stops a sixth payload quietly appearing in a file
 * nobody thought to look at. Before this file there were five payloads, four
 * of them unchecked, and they had drifted apart precisely because each was
 * written where it was needed rather than where the rule was.
 */

describe("checkNotificationCopy", () => {
  const ok = { title: "Evening prayer", body: "Open the evening rule when you lie down." };

  it("passes copy that names an hour and stops", () => {
    expect(checkNotificationCopy(ok)).toEqual([]);
    expect(isDoctrinal(ok)).toBe(true);
  });

  it("refuses a digit anywhere, which is every count and every countdown", () => {
    const v = checkNotificationCopy({ ...ok, body: "3 days left." });
    expect(v.map((x) => x.clause)).toContain("no digits");
  });

  it("refuses an exclamation mark, including the fullwidth and inverted forms", () => {
    // A rule a keyboard layout can step around is not a rule.
    for (const mark of ["!", "！", "¡"]) {
      expect(
        checkNotificationCopy({ ...ok, body: `Come and pray${mark}` }).map((x) => x.clause),
      ).toContain("no exclamation marks");
    }
  });

  it("refuses manufactured urgency", () => {
    for (const body of ["Last chance to pray.", "This offer expires tonight.", "Hurry back."]) {
      expect(checkNotificationCopy({ ...ok, body }).map((x) => x.clause)).toContain("no urgency");
    }
  });

  it("refuses pressure mechanics, including the string that actually shipped", () => {
    // "Someone is waiting on your prayers today." was live in production until
    // 2026-08-22. It is the reason "waiting on you" is on the list.
    for (const body of [
      "Someone is waiting on you today.",
      "Don't lose your streak.",
      "You haven't prayed since Tuesday.",
      "You are behind this week.",
    ]) {
      expect(checkNotificationCopy({ ...ok, body }).length).toBeGreaterThan(0);
    }
  });

  it("refuses praise", () => {
    expect(
      checkNotificationCopy({ ...ok, body: "Well done on your prayers." }).map((x) => x.clause),
    ).toContain("no praise");
  });

  it("refuses copy a lock screen would truncate", () => {
    expect(
      checkNotificationCopy({ title: "x".repeat(MAX_TITLE + 1), body: "y" }).map((x) => x.clause),
    ).toContain("title length");
    expect(
      checkNotificationCopy({ title: "x", body: "y".repeat(MAX_BODY + 1) }).map((x) => x.clause),
    ).toContain("body length");
  });

  it("refuses an empty title", () => {
    expect(checkNotificationCopy({ title: "   ", body: "y" }).map((x) => x.clause)).toContain(
      "title required",
    );
  });

  it("reports every violation at once, not the first", () => {
    // An author fixing one word per round trip gives up and writes something
    // worse than what they started with.
    const v = checkNotificationCopy({ title: "Hurry", body: "3 days left!" });
    expect(v.length).toBeGreaterThanOrEqual(3);
  });
});

describe("the copy table", () => {
  it.each(Object.values(NOTIFICATION_COPY))("$key clears the bar", (row) => {
    expect(checkNotificationCopy(row)).toEqual([]);
  });

  it("gives every row a written rationale", () => {
    // Not machine-checkable, and that is the point: somebody has to say why
    // this one earns a lock screen. A one-word rationale is a missing one.
    for (const row of Object.values(NOTIFICATION_COPY)) {
      expect(row.rationale.length, row.key).toBeGreaterThan(40);
    }
  });

  it("keeps the campaign id out of the visible text and in the URL", () => {
    const c = campaignCopy("mothers-surgery-abc-123");
    expect(`${c.title} ${c.body}`).not.toContain("abc-123");
    expect(`${c.title} ${c.body}`).not.toMatch(/\d/);
    expect(c.url).toContain("mothers-surgery-abc-123");
  });

  it("escapes the id into the deep link", () => {
    expect(campaignCopy("a b&c").url).toBe("/campaigns/detail?id=a%20b%26c");
  });

  it("routes each rule to its own page", () => {
    expect(reminderCopy("morning").url).toBe("/prayers/morning");
    expect(reminderCopy("evening").url).toBe("/prayers/evening");
  });

  it("offers only templates that clear the bar", () => {
    for (const t of broadcastTemplates()) expect(checkNotificationCopy(t)).toEqual([]);
  });
});

describe("community notifications (lib/community/push.ts)", () => {
  const KINDS = ["reply", "mention", "follow", "name_day", "prayed", "gift", "question", "answer", "approved"] as const;
  const LANGS = ["ar", "bg", "de", "el", "en", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"];
  const catalog = (lang: string) =>
    JSON.parse(readFileSync(join(REPO, "lib", "i18n", "messages", `${lang}.json`), "utf8")) as Record<string, string>;

  it("say what happened without naming anyone, and link to the post or the person", () => {
    // Since 2026-11-01 (the owner's word): the name stays in the inbox, inside
    // the app, and the lock screen, read by whoever is in the room, says only
    // what happened.
    expect(communityPushCopy("reply", "post-uuid")).toEqual({
      title: "Someone replied to your post",
      body: "It is in Community.",
      url: "/community#post-post-uuid",
    });
    expect(communityPushCopy("prayed", "maria.p").url).toBe("/community#@maria.p");
    expect(communityPushCopy("mention", null).url).toBe("/community#conversations");
    expect(communityPushCopy("gift", null)).toMatchObject({ body: "It is in your account.", url: "/account" });
  });

  it("take no name at all, so none can reach a lock screen", () => {
    expect(communityPushCopy.length).toBeLessThanOrEqual(3);
    expect(readFileSync(join(REPO, "lib", "community", "push.ts"), "utf8")).not.toMatch(/actor_name/);
    for (const row of Object.values(NOTIFICATION_COPY)) expect(row.title, row.key).not.toContain("{name}");
  });

  it("are in all 21 languages, each its own, and every one clears the bar", () => {
    const en = catalog("en");
    for (const lang of LANGS) {
      const words = catalog(lang);
      for (const kind of KINDS) {
        const keys = COMMUNITY_PUSH_KEYS[kind];
        expect(words[keys.title], `${lang} ${kind}`).toBeTruthy();
        expect(words[keys.body], `${lang} ${kind}`).toBeTruthy();
        if (lang !== "en") expect(words[keys.title], `${lang} ${kind}`).not.toBe(en[keys.title]);
        const c = communityPushCopy(kind, "x", words);
        expect(checkNotificationCopy(c), `${lang} ${kind}`).toEqual([]);
        // The reader's own words, not the English fallback.
        expect(c.title, `${lang} ${kind}`).toBe(words[keys.title]);
        expect(`${c.title} ${c.body}`.includes(String.fromCharCode(0x2014)), `${lang} ${kind}`).toBe(false);
      }
    }
  });

  it("leave the prayer reminders in the reader's language too, from the cards' own lines", () => {
    // The welcome questions show the reminders as cards in the reader's words
    // (components/onboarding/RemindersOn.tsx); the lock screen now says the
    // same, in all 21 languages, each clearing the bar.
    for (const lang of LANGS) {
      const words = catalog(lang);
      for (const kind of ["morning", "evening"] as const) {
        const c = reminderCopy(kind, words);
        expect(checkNotificationCopy(c), `${lang} ${kind}`).toEqual([]);
        expect(c.title, `${lang} ${kind}`).toBe(words[REMINDER_PUSH_KEYS[kind].title]);
        expect(c.body, `${lang} ${kind}`).toBe(words[REMINDER_PUSH_KEYS[kind].body]);
        expect(c.url).toBe(kind === "morning" ? "/prayers/morning" : "/prayers/evening");
      }
    }
    // English is the rows' own words, and a missing or loud translation gives way to them.
    expect(reminderCopy("morning", catalog("en"))).toEqual(reminderCopy("morning"));
    expect(reminderCopy("evening", {}).title).toBe("Evening prayer");
    const loud = { "onboard.reminders.morningTitle": "Pray now!", "onboard.reminders.morningBody": "3 left." };
    expect(reminderCopy("morning", loud).title).toBe("Morning prayer");
  });

  it("are the English rows' own words in English", () => {
    const en = catalog("en");
    for (const kind of KINDS) {
      expect(communityPushCopy(kind, "x", en), kind).toEqual(communityPushCopy(kind, "x"));
    }
  });

  it("fall back to English for a translation that is missing or breaks the bar", () => {
    expect(communityPushCopy("reply", "x", {}).title).toBe("Someone replied to your post");
    const loud = { "push.community.reply": "Hurry, 3 replies!", "push.community.body": "Now." };
    expect(communityPushCopy("reply", "x", loud).title).toBe("Someone replied to your post");
  });
});

/* ── Layer three: nothing outside the table may hold a payload string ───── */

const REPO = join(__dirname, "..", "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      walk(full, out);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

/** `title: "..."` / `body: "..."`, which is the shape every payload builder uses. */
const LITERAL = /\b(title|body)\s*:\s*"([^"]{2,})"/g;

describe("no notification string lives outside the table", () => {
  it("finds none under lib/push except copy.ts", () => {
    const offenders: string[] = [];
    for (const file of walk(join(REPO, "lib", "push"))) {
      if (file.endsWith(`${"copy"}.ts`)) continue;
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(LITERAL)) {
        offenders.push(`${file.slice(REPO.length + 1)}: ${m[1]}: "${m[2]}"`);
      }
    }
    // A new sender is exactly how the five payloads that preceded this file
    // came to differ from one another. Put the words in copy.ts.
    expect(offenders).toEqual([]);
  });

  it("holds the service-worker fallback to the same bar", () => {
    // public/sw.js cannot import from lib/, so its one string is hardcoded.
    // It is read here rather than excused, so it cannot drift.
    const sw = readFileSync(join(REPO, "public", "sw.js"), "utf8");
    const title = /title:\s*"([^"]*)"/.exec(sw);
    expect(title, "sw.js no longer declares a fallback title").not.toBeNull();
    expect(checkNotificationCopy({ title: title![1], body: "" })).toEqual([]);
  });

  it("holds every route that broadcasts to readers to the bar", () => {
    // The admin broadcast was the first sender of free text the check did not
    // reach; the EIKON Box announcement, to every Pro member's lock screen,
    // was the second (until 2026-11-01). A route that broadcasts runs the
    // same predicate the table is read against, or it fails here.
    const routes = walk(join(REPO, "app", "api")).filter((f) => f.endsWith("route.ts"));
    const senders = routes.filter((f) => /import\s*\{[^}]*\bbroadcast\b[^}]*\}\s*from\s*"@\/lib\/push\/send"/.test(readFileSync(f, "utf8")));
    expect(senders.length).toBeGreaterThanOrEqual(2);
    for (const file of senders) {
      const src = readFileSync(file, "utf8");
      expect(src, file.slice(REPO.length + 1)).toContain("checkNotificationCopy(");
      // Checked before anything is sent.
      expect(src.indexOf("checkNotificationCopy("), file.slice(REPO.length + 1)).toBeLessThan(src.indexOf("await broadcast("));
    }
  });

  it("offers ready-made EIKON Box words that clear the bar as they stand", () => {
    for (const name of ["The Nativity box", "Box 12", "Hurry!", "", "  The   Theophany box "]) {
      const words = eikonBoxAnnouncement(name);
      expect(checkNotificationCopy(words), name).toEqual([]);
      expect(words.url).toBe("/account/eikon-box");
    }
    expect(eikonBoxAnnouncement("The Nativity box").title).toBe("The Nativity box is open");
    expect(eikonBoxAnnouncement("Box 12").title).toBe("The EIKON Box is open");
    // No date and no count in what is offered.
    expect(eikonBoxAnnouncement("The Nativity box").body).not.toMatch(/\d/);
  });

  it("leaves the admin broadcast route with no copy of its own", () => {
    const route = readFileSync(
      join(REPO, "app", "api", "admin", "push", "send", "route.ts"),
      "utf8",
    );
    expect([...route.matchAll(LITERAL)].map((m) => m[0])).toEqual([]);
  });
});
