/**
 * The profile card grows on a transform, never by moving in layout (Updates
 * 25's walk, the profile card's jumps). Placed by its foot, the card's top
 * moved in layout by the whole of what the profile added when it came: the
 * browser reported 240px in one frame, then 46, 40, 34 and 28px a frame as its
 * height was handed over. Placed by its top and lifted by its own height, its
 * top stays put in layout and the growth is the lift's. And the status line,
 * the one row of the face the feed did not know, now comes with the feed, so
 * it no longer pushes the rows under it down when the profile arrives.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { authorStatuses, statusOf } from "@/lib/community/authorStatus";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const VIEWER = read("components/community/profile/ProfileViewer.tsx");

type Answer = { data: unknown[] | null; error: { code?: string; message?: string } | null };

/** A stand-in for the admin client: answers each select by its column list, and records what was asked. */
function admin(answers: Record<string, Answer>) {
  const asked: { cols: string; handles: string[] }[] = [];
  const client = {
    from(table: string) {
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
      expect(src).toContain("author_status: statusOf(row, statuses),");
      expect(src).toMatch(/const statuses = await authorStatuses\(admin, /);
    }
  });
});

describe("authorStatuses: the writers' status lines, as their public profiles give them", () => {
  it("gives a public profile's line, none for a private one, in one read for the whole list", async () => {
    const { client, asked } = admin({
      "handle, status_text, profile_private": {
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
    const got = await authorStatuses(client, rows);
    expect([...got]).toEqual([["anna", "Lord, have mercy"]]);
    expect(asked).toEqual([{ cols: "handle, status_text, profile_private", handles: ["anna", "basil", "chris", "dora"] }]);
    expect(statusOf({ author_handle: "anna" }, got)).toBe("Lord, have mercy");
    expect(statusOf({ author_handle: "basil" }, got)).toBeNull();
    expect(statusOf({ author_handle: null }, got)).toBeNull();
  });

  it("reads every profile as public before profile_private exists, as buildProfile does", async () => {
    const { client, asked } = admin({
      "handle, status_text, profile_private": { data: null, error: { code: "42703", message: 'column profiles.profile_private does not exist' } },
      "handle, status_text": { data: [{ handle: "anna", status_text: "Glory to God" }], error: null },
    });
    expect([...(await authorStatuses(client, [{ author_handle: "anna" }]))]).toEqual([["anna", "Glory to God"]]);
    expect(asked.map((a) => a.cols)).toEqual(["handle, status_text, profile_private", "handle, status_text"]);
  });

  it("gives nobody a line on any other error, and asks nothing of a list with no handles", async () => {
    const failing = admin({ "handle, status_text, profile_private": { data: null, error: { code: "500", message: "down" } } });
    expect((await authorStatuses(failing.client, [{ author_handle: "anna" }])).size).toBe(0);
    const empty = admin({});
    expect((await authorStatuses(empty.client, [{ author_handle: null }, {}])).size).toBe(0);
    expect(empty.asked).toEqual([]);
  });
});
