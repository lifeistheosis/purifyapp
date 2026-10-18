import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  BACK_FALLBACK_MS,
  backOutcome,
  OWN_HEADER_PATTERNS,
  shouldShowBack,
  TAB_ROOTS,
} from "../backBar";

/**
 * The back bar's exclusion list must match the tree.
 *
 * NativeBackBar hides itself on routes that already show a MobileTopBar, or
 * the reader gets two stacked headers. That list is hand-written, so it rots:
 * a new page with its own header ships a doubled chevron, and a stale pattern
 * silently strips the back button off a page that needs one, which is the
 * exact bug the component exists to fix. Both directions are asserted here.
 *
 * THE SCAN WALKS LAYOUTS, NOT JUST PAGES. That is not defensive padding, it
 * is the case that already existed and was already missed once: the five
 * /account routes get their bar from account/(signed)/layout.tsx, and nothing
 * in their own page files says so. A page-only scan called them ordinary and
 * would have stacked a second bar on all five.
 */

const APP = path.join(process.cwd(), "app", "(app)");

// NOTE if this suite ever fails with a surprisingly small page count: a native
// export (npm run build:android / build:ios) MOVES eight directories out of the
// tree for the duration of the build, app/api and app/(app)/shop/seller among
// them. Run vitest while one is in flight and the scan sees a partial tree.
// None of the excluded routes live in a stashed directory, so the exclusion
// assertions still hold, but the count floor below is what would go first.

/**
 * A JSX mount, not a mention. Half this repo's files discuss the bar in prose.
 *
 * AccountTopBar is the one component allowed to stand for the bar (1.6): the
 * account layout mounts it, and it is a MobileTopBar whose name and way back
 * follow the address, which a layout cannot know. The last test of this
 * block holds it to drawing a MobileTopBar on every path.
 */
const MOUNTS = /<(MobileTopBar|AccountTopBar)[\s/>]/;
const STANDS_FOR_THE_BAR = "AccountTopBar.tsx";

function read(file: string): string {
  return fs.readFileSync(file, "utf8");
}

/** Every page.tsx under app/(app), with its route and its layout chain. */
function routes(): { file: string; route: string; ownHeader: boolean }[] {
  const out: { file: string; route: string; ownHeader: boolean }[] = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
        continue;
      }
      if (entry.name !== "page.tsx") continue;

      // The layout chain: this page's directory up to app/(app) inclusive.
      // A layout anywhere on it renders on this route.
      const chain: string[] = [p];
      let d = dir;
      for (let hop = 0; hop < 40; hop++) {
        const l = path.join(d, "layout.tsx");
        if (fs.existsSync(l)) chain.push(l);
        if (path.resolve(d) === path.resolve(APP)) break;
        d = path.dirname(d);
      }

      const rel = path.relative(APP, p).replace(/\\/g, "/");
      const route =
        "/" +
        rel
          .replace(/\/?page\.tsx$/, "")
          // Route groups are organisational and contribute no URL segment.
          // Dropping them is what turns account/(signed)/profile into
          // /account/profile, which is the path shouldShowBack actually sees.
          .split("/")
          .filter((seg) => seg && !/^\(.*\)$/.test(seg))
          .join("/");

      out.push({
        file: rel,
        route: route === "/" ? "/" : route.replace(/\/+$/, ""),
        ownHeader: chain.some((f) => MOUNTS.test(read(f))),
      });
    }
  };

  walk(APP);
  return out;
}

/** Dynamic segments filled in, so the route can be run through the real regexes. */
function concrete(route: string): string {
  return route.replace(/\[\[?\.{3}?[^\]]+\]\]?/g, "x").replace(/\[[^\]]+\]/g, "x");
}

const PAGES = routes();

describe("NativeBackBar exclusions vs the tree", () => {
  it("scanned a real tree and resolved the layout chain", () => {
    // Every assertion below passes vacuously on an empty scan, and a scan that
    // silently stopped finding layouts would pass the first test and fail the
    // reader. Both facts are pinned.
    expect(PAGES.length).toBeGreaterThan(50);
    expect(PAGES.filter((p) => p.ownHeader).length).toBeGreaterThanOrEqual(10);
    // The account group is the layout-inherited case specifically.
    expect(PAGES.find((p) => p.route === "/account/profile")?.ownHeader).toBe(true);
  });

  it("no route gets two stacked headers", () => {
    const doubled = PAGES.filter((p) => p.ownHeader && shouldShowBack(concrete(p.route))).map(
      (p) => `${p.file}  (route ${concrete(p.route)})`,
    );
    expect(
      doubled,
      "These routes already show a MobileTopBar, from the page or a layout " +
        "above it, so NativeBackBar must not render a second bar. Add a " +
        "pattern to OWN_HEADER_PATTERNS in lib/nav/backBar.ts:\n  " +
        doubled.join("\n  "),
    ).toEqual([]);
  });

  it("no pattern excludes a route that has no header of its own", () => {
    const stale: string[] = [];
    for (const re of OWN_HEADER_PATTERNS) {
      const hit = PAGES.filter((p) => re.test(concrete(p.route)));
      if (hit.length === 0) {
        stale.push(`${re} matches no route at all, so it is dead`);
        continue;
      }
      for (const p of hit) {
        if (!p.ownHeader) {
          stale.push(`${re} excludes ${p.file}, which renders no MobileTopBar`);
        }
      }
    }
    expect(
      stale,
      "A stale exclusion leaves a page with no way back, which is the bug " +
        "NativeBackBar exists to fix:\n  " +
        stale.join("\n  "),
    ).toEqual([]);
  });

  it("only pages and layouts mount the bar, which is what makes the scan sound", () => {
    // The scan reads page and layout files. A component that mounted
    // MobileTopBar would be invisible to it and the exclusion list would go
    // quietly wrong, so that assumption is itself held here rather than
    // trusted.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx$/.test(e.name) && e.name !== "MobileTopBar.tsx" && e.name !== STANDS_FOR_THE_BAR) {
          if (MOUNTS.test(read(p))) offenders.push(path.relative(process.cwd(), p));
        }
      }
    };
    walk(path.join(process.cwd(), "components"));
    expect(
      offenders,
      "These components render MobileTopBar. The exclusion scan only reads " +
        "pages and layouts, so it cannot see them. Either mount the bar from " +
        "the page/layout instead, or teach routes() to follow imports:\n  " +
        offenders.join("\n  "),
    ).toEqual([]);
  });

  it("the one component that stands for the bar draws it on every path", () => {
    // The scan counts <AccountTopBar /> as a bar. That is only true while the
    // component cannot return anything else: a `return null` here would leave
    // a screen with neither bar, since the back bar steps aside for it.
    const source = read(path.join(process.cwd(), "components", "account", STANDS_FOR_THE_BAR))
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const body = source.slice(source.indexOf("export function AccountTopBar()"));
    const returns = [...body.matchAll(/\breturn\s+([^;]+);/g)].map((m) => m[1].trim());
    expect(returns.length).toBeGreaterThanOrEqual(2);
    for (const r of returns) expect(r.startsWith("<MobileTopBar "), r).toBe(true);
    // And every address it names is one the back bar steps aside for.
    const named = [...source.matchAll(/path: "([^"]+)"/g)].map((m) => m[1]);
    expect(named.length).toBeGreaterThanOrEqual(6);
    for (const route of named) expect(shouldShowBack(route), route).toBe(false);
  });
});

describe("backOutcome, the floor under router.back()", () => {
  it("stays put when the stack actually moved", () => {
    expect(backOutcome(true)).toBe("stay");
  });

  it("goes home when nothing moved, instead of leaving a dead chevron", () => {
    // This is the whole reason the helper exists. At the bottom of a Capacitor
    // WebView's stack, back() is a silent no-op, and a chevron that does
    // nothing is the reported complaint restated rather than answered.
    expect(backOutcome(false)).toBe("home");
  });

  it("is not history.length in disguise", () => {
    // Guarding the SHAPE of the fix, not just its values. history.length is the
    // size of the stack and never its position, and it never shrinks: after
    // deep-link -> deeper -> back, it reads 2 while the reader sits at index 0,
    // so a length test says "go back" into a no-op. backOutcome takes an
    // OBSERVED move, so there is no length to be fooled by. If someone
    // reintroduces a numeric signature here, this fails to compile.
    expect(backOutcome.length).toBe(1);
    expect(typeof backOutcome(false)).toBe("string");
  });

  it("waits long enough not to lose the race it must not lose", () => {
    // The deadline is only ever spent when the reader really was at the bottom.
    // Too short and a traversal delayed by a busy main thread gets overtaken:
    // the reader is thrown to Today exactly as the page they asked for arrives.
    // Too long and the bottom case feels dead. 400ms sits well past any
    // same-document traversal and well inside the reader's patience.
    expect(BACK_FALLBACK_MS).toBeGreaterThanOrEqual(250);
    expect(BACK_FALLBACK_MS).toBeLessThanOrEqual(1000);
  });
});

describe("shouldShowBack", () => {
  it("hides on every tab root, where back is meaningless", () => {
    for (const root of ["/", "/bible", "/discover", "/prayers", "/account"]) {
      expect(shouldShowBack(root), `${root} is a tab root`).toBe(false);
    }
  });

  it("knows the same tabs the bar draws", () => {
    // The list of tab roots is hand-written, in another file than the bar's
    // tabs, and nothing held the two together: when the bar went from six
    // tabs to five on 2026-10-13 it was left behind, so the You tab wore a
    // chevron and the shop and Chat, tapped into from Discover, had none.
    // Read from the bar's own source, so the next change to the tabs fails
    // here until this list follows.
    const bar = fs.readFileSync(path.join(process.cwd(), "components", "nav", "MobileTabBar.tsx"), "utf8");
    const tabs = [...bar.matchAll(/\n\s+key: "[a-z]+",[\s\S]*?\n\s+href: "([^"]+)",/g)].map((m) => m[1]);
    expect(tabs.length).toBe(5);
    expect([...TAB_ROOTS].sort()).toEqual([...tabs].sort());
  });

  it("does NOT show on /account, which is a tab again", () => {
    // You came back as the fifth tab on 2026-10-13. A chevron on a tab's own
    // screen leads out of the tab the reader just chose.
    expect(shouldShowBack("/account")).toBe(false);
    expect(shouldShowBack("/account/")).toBe(false);
  });

  it("SHOWS on the shop and Chat, which stopped being tab roots", () => {
    // They are tiles on Discover from 2026-10-13: tapped into like any other
    // destination, so each needs a way back. If this ever flips, the reader
    // who taps Shop from Discover can only leave by tab, which is the
    // complaint this bar was built to answer.
    for (const tile of ["/shop", "/shop/", "/community", "/community/"]) {
      expect(shouldShowBack(tile), tile).toBe(true);
    }
  });

  it("shows on an ordinary inner page, which is the whole point", () => {
    expect(shouldShowBack("/saints")).toBe(true);
    expect(shouldShowBack("/councils/nicaea-325")).toBe(true);
    expect(shouldShowBack("/bible/john/1/commentary")).toBe(true);
    expect(shouldShowBack("/shop/eikon")).toBe(true);
  });

  it("hides where a MobileTopBar already is", () => {
    expect(shouldShowBack("/bible/john/3")).toBe(false);
    // A saint's own page carries its bar from 1.7: clear over his picture,
    // solid with his name once it scrolls away, and the same way back.
    expect(shouldShowBack("/saints/john-chrysostom")).toBe(false);
    expect(shouldShowBack("/saints/john-chrysostom/")).toBe(false);
    expect(shouldShowBack("/saints/basil/on-the-spirit")).toBe(false);
    expect(shouldShowBack("/privacy")).toBe(false);
    expect(shouldShowBack("/terms")).toBe(false);
    expect(shouldShowBack("/settings")).toBe(false);
  });

  it("hides on all six account routes, whose bar comes from their layout", () => {
    for (const r of ["data", "eikon-box", "notifications", "profile", "security", "sessions"]) {
      expect(shouldShowBack(`/account/${r}`), `/account/${r}`).toBe(false);
    }
  });

  it("hides on the account routes OUTSIDE that layout too, which mount their own bar from 1.8", () => {
    // /account/developer and /account/export are siblings of the (signed)
    // group, not members of it. They wore this bar, a chevron with no name,
    // until 1.8; now each page mounts the bar every screen under You wears.
    expect(shouldShowBack("/account/developer")).toBe(false);
    expect(shouldShowBack("/account/export")).toBe(false);
  });

  it("hides on what Settings and Saved open, which wear the same bar from 1.8", () => {
    for (const r of ["/about", "/support", "/faq", "/whats-new", "/florilegium", "/support/", "/florilegium/"]) {
      expect(shouldShowBack(r), r).toBe(false);
    }
    // The support form beneath Support is the website's, and keeps this bar.
    expect(shouldShowBack("/support/contact")).toBe(true);
  });

  it("treats a trailing slash as the same route", () => {
    // Without the trim, "/bible/" misses the tab-root check and gains a
    // chevron the real "/bible" does not have.
    expect(shouldShowBack("/bible/")).toBe(false);
    expect(shouldShowBack("/account/")).toBe(false);
    expect(shouldShowBack("/settings/")).toBe(false);
  });

  it("does not confuse a tab root with a page beneath it", () => {
    expect(shouldShowBack("/account")).toBe(false);
    expect(shouldShowBack("/bible")).toBe(false);
    expect(shouldShowBack("/bible/john")).toBe(true);
    expect(shouldShowBack("/discover")).toBe(false);
    expect(shouldShowBack("/discover/anything")).toBe(true);
  });

  it("keeps hiding on the account routes that carry their own header", () => {
    // Whether /account is a tab root and whether its (signed) children have a
    // header of their own are independent: the children inherit a bar from
    // account/(signed)/layout.tsx either way, and conflating the two stacks
    // two bars there or leaves none.
    for (const r of ["data", "eikon-box", "notifications", "profile", "security", "sessions"]) {
      expect(shouldShowBack(`/account/${r}`), `/account/${r}`).toBe(false);
    }
  });

  it("does not throw on an empty pathname", () => {
    // usePathname() can be null on the first native paint; the component
    // coalesces to "" and this must be a quiet false, not a crash.
    expect(shouldShowBack("")).toBe(false);
  });
});
