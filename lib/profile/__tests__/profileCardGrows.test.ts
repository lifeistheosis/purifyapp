/**
 * The profile card grows on a transform, never by moving in layout (Updates
 * 25's walk, the profile card's jumps). Placed by its foot, the card's top
 * moved in layout by the whole of what the profile added when it came: the
 * browser reported 240px in one frame, then 46, 40, 34 and 28px a frame as its
 * height was handed over. Placed by its top and lifted by its own height, its
 * top stays put in layout and the growth is the lift's. And the status line,
 * the one row of the face the feed did not know, now comes with the feed, so
 * it no longer pushes the rows under it down when the profile arrives. So
 * does the name the writer goes by now (the arbiter's call, 2026-11-13): a
 * post keeps the name its writer had when posting, and ivan.rizevski's card
 * heading, "IvanTheHumbleSinner", moved 62px sideways when the profile came.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { authorsNow, nameOf, statusOf } from "@/lib/community/authorStatus";
import { BUILT_IN_TERMS } from "@/lib/moderation/terms";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const VIEWER = read("components/community/profile/ProfileViewer.tsx");

type Answer = { data: unknown[] | null; error: { code?: string; message?: string } | null };

/** A stand-in for the admin client: answers each select by its column list, and records what was asked. */
function admin(answers: Record<string, Answer>) {
  const asked: { cols: string; handles: string[] }[] = [];
  const client = {
    from(table: string) {
      // The mask's own list (lib/moderation/server.ts): none of the team's words, so the built-in list stands.
      if (table === "community_filter_terms") {
        const none = { order: () => none, range: () => Promise.resolve({ data: [], error: null }) };
        return { select: () => none };
      }
      expect(table).toBe("profiles");
      return {
        select(cols: string) {
          return {
            in(col: string, handles: string[]) {
              expect(col).toBe("handle");
              asked.push({ cols, handles });
              return Promise.resolve(answers[cols] ?? { data: [], error: null });
            },
          };
        },
      };
    },
  };
  return { client: client as never, asked };
}

describe("the profile card grows on a transform", () => {
  it("is placed by its top and lifted by its own height, centred on a wide screen by half of it", () => {
    const dialog = /className="fixed inset-0 z-\[80\] ([^"]*)"/.exec(VIEWER)?.[1] ?? "";
    expect(dialog.split(" ")).toContain("items-start");
    expect(dialog).not.toMatch(/items-end|items-center/);
    const panel = /ref=\{panelRef\}\s*data-profile-card\s*className=\{cn\(\s*"([^"]*)"/.exec(VIEWER)?.[1] ?? "";
    for (const cls of ["top-full", "-translate-y-full", "md:top-1/2", "md:-translate-y-1/2"]) expect(panel.split(" ")).toContain(cls);
  });

  it("draws the status line from the feed, not when the profile comes", () => {
    expect(VIEWER).toMatch(/status: seed\.status \?\? null,/);
    expect(read("components/community/profile/ProfileHoverCard.tsx")).toMatch(/status: target\.seed\.status \?\? null,/);
    const client = read("components/community/CommunityClient.tsx");
    expect(client).toMatch(/status: post\.author_status \?\? null,/);
    expect(client).toMatch(/status: r\.author_status \?\? null,/);
    for (const route of ["app/api/community/posts/route.ts", "app/api/community/posts/[id]/replies/route.ts"]) {
      const src = read(route);
      expect(src).toContain("author_status: statusOf(row, authors),");
      expect(src).toMatch(/const authors = await authorsNow\(admin, /);
    }
  });
});

describe("authorsNow: the writers' status lines, as their public profiles give them", () => {
  it("gives a public profile's line, none for a private one, in one read for the whole list", async () => {
    const { client, asked } = admin({
      "handle, display_name, status_text, profile_private": {
        data: [
          { handle: "anna", status_text: "Lord, have mercy", profile_private: false },
          { handle: "basil", status_text: "Hidden away", profile_private: true },
          { handle: "chris", status_text: null, profile_private: null },
          { handle: "dora", status_text: "", profile_private: false },
        ],
        error: null,
      },
    });
    const rows = [{ author_handle: "anna" }, { author_handle: "basil" }, { author_handle: "anna" }, { author_handle: "chris" }, { author_handle: "dora" }, { author_handle: null }];
    const got = await authorsNow(client, rows);
    expect([...got.statuses]).toEqual([["anna", "Lord, have mercy"]]);
    expect(asked).toEqual([{ cols: "handle, display_name, status_text, profile_private", handles: ["anna", "basil", "chris", "dora"] }]);
    expect(statusOf({ author_handle: "anna" }, got)).toBe("Lord, have mercy");
    expect(statusOf({ author_handle: "basil" }, got)).toBeNull();
    expect(statusOf({ author_handle: null }, got)).toBeNull();
  });

  it("reads every profile as public before profile_private exists, as buildProfile does", async () => {
    const { client, asked } = admin({
      "handle, display_name, status_text, profile_private": { data: null, error: { code: "42703", message: 'column profiles.profile_private does not exist' } },
      "handle, display_name, status_text": { data: [{ handle: "anna", display_name: "Anna", status_text: "Glory to God" }], error: null },
    });
    const got = await authorsNow(client, [{ author_handle: "anna" }]);
    expect([...got.statuses]).toEqual([["anna", "Glory to God"]]);
    expect([...got.names]).toEqual([["anna", "Anna"]]);
    expect(asked.map((a) => a.cols)).toEqual(["handle, display_name, status_text, profile_private", "handle, display_name, status_text"]);
  });

  it("gives nobody a line on any other error, and asks nothing of a list with no handles", async () => {
    const failing = admin({ "handle, display_name, status_text, profile_private": { data: null, error: { code: "500", message: "down" } } });
    const down = await authorsNow(failing.client, [{ author_handle: "anna", author_name: "Anna of old" }]);
    expect(down.statuses.size + down.names.size).toBe(0);
    // The post's own name stands.
    expect(nameOf({ author_handle: "anna", author_name: "Anna of old" }, down)).toBe("Anna of old");
    const empty = admin({});
    const none = await authorsNow(empty.client, [{ author_handle: null }, {}]);
    expect(none.statuses.size + none.names.size).toBe(0);
    expect(empty.asked).toEqual([]);
  });
});

describe("authorsNow: the name a writer goes by now, as the card shows it", () => {
  const COLS = "handle, display_name, status_text, profile_private";

  it("gives a public profile's name in place of the post's, and a private profile keeps the post's own", async () => {
    const { client, asked } = admin({
      [COLS]: {
        data: [
          { handle: "ivan.rizevski", display_name: "IvanTheHumbleSinner", status_text: null, profile_private: false },
          { handle: "basil", display_name: "Basil the Hidden", status_text: null, profile_private: true },
          { handle: "chris", display_name: "   ", status_text: null, profile_private: null },
          { handle: "dora", display_name: null, status_text: null, profile_private: false },
          { handle: "eli", display_name: "  Elias of Ohio  ", status_text: null, profile_private: false },
        ],
        error: null,
      },
    });
    const rows = [
      { author_handle: "ivan.rizevski", author_name: "Ivan" },
      { author_handle: "basil", author_name: "Basil" },
      { author_handle: "chris", author_name: "Chris" },
      { author_handle: "dora", author_name: "Dora" },
      { author_handle: "eli", author_name: "Eli" },
      { author_handle: null, author_name: "No handle yet" },
    ];
    const got = await authorsNow(client, rows);
    // One read for the list: the same one that gives the status lines.
    expect(asked).toEqual([{ cols: COLS, handles: ["ivan.rizevski", "basil", "chris", "dora", "eli"] }]);
    expect(rows.map((r) => nameOf(r, got))).toEqual(["IvanTheHumbleSinner", "Basil", "Chris", "Dora", "Elias of Ohio", "No handle yet"]);
  });

  it("masks a listed word and cuts the name to 80, as identity() gives it to the card", async () => {
    const [word] = BUILT_IN_TERMS.find(([term, flags]) => flags.startsWith("t") && /^[a-z]{4,}$/i.test(term)) ?? [""];
    expect(word, "a listed word to try").toBeTruthy();
    const long = "A".repeat(120);
    const { client } = admin({
      [COLS]: {
        data: [
          { handle: "anna", display_name: `Brother ${word}`, status_text: null, profile_private: false },
          { handle: "long", display_name: long, status_text: null, profile_private: false },
        ],
        error: null,
      },
    });
    const got = await authorsNow(client, [{ author_handle: "anna" }, { author_handle: "long" }]);
    const masked = String(nameOf({ author_handle: "anna", author_name: "Anna" }, got));
    expect(masked.startsWith("Brother ")).toBe(true);
    expect(masked.toLowerCase()).not.toContain(word.toLowerCase());
    expect(nameOf({ author_handle: "long" }, got)).toBe("A".repeat(80));
  });

  it("is what both lists serve as the writer's name", () => {
    for (const route of ["app/api/community/posts/route.ts", "app/api/community/posts/[id]/replies/route.ts"]) {
      expect(read(route), route).toContain("author_name: nameOf(row, authors),");
      expect(read(route), route).not.toContain("author_name: row.author_name,");
    }
  });
});
