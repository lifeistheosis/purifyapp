import { describe, expect, it } from "vitest";

import {
  isMotionPreference,
  resolveReducedMotion,
  surfaceForPath,
  type MotionPreference,
  type MotionSurface,
} from "../motionPreference";

/**
 * The rule this pins is the asymmetry, and the asymmetry is the whole feature.
 *
 * Both defaults read as obviously right in prose and are trivial to invert in
 * code, because the two branches differ by one word. Getting it backwards
 * would suppress the odometer on the one surface built to show it, and would
 * silently override a reader's accessibility setting on the surface that must
 * honour it. Neither failure is visible on the machine that writes it: this
 * developer's Windows animation setting is off, so the "wrong" behaviour looks
 * exactly like the right one from here.
 */

const CASES: {
  preference: MotionPreference;
  surface: MotionSurface;
  osReduce: boolean;
  reduced: boolean;
  why: string;
}[] = [
  // The admin panel: motion unless explicitly silenced.
  {
    preference: "os",
    surface: "admin",
    osReduce: true,
    reduced: false,
    why: "the operator's OS hint does not still their own dashboard",
  },
  {
    preference: "os",
    surface: "admin",
    osReduce: false,
    reduced: false,
    why: "nothing is asking for calm",
  },
  {
    preference: "off",
    surface: "admin",
    osReduce: false,
    reduced: true,
    why: "an explicit off outranks the admin default",
  },

  // The site: the OS decides unless a reader opts in.
  {
    preference: "os",
    surface: "site",
    osReduce: true,
    reduced: true,
    why: "a reader who asked their system for calm asked this app too",
  },
  {
    preference: "os",
    surface: "site",
    osReduce: false,
    reduced: false,
    why: "no hint, so motion",
  },
  {
    preference: "on",
    surface: "site",
    osReduce: true,
    reduced: false,
    why: "an explicit on outranks the OS, which is the point of an override",
  },
  {
    preference: "off",
    surface: "site",
    osReduce: false,
    reduced: true,
    why: "an explicit off outranks a quiet OS",
  },
];

describe("who decides", () => {
  for (const c of CASES) {
    it(`${c.surface}, pref ${c.preference}, os ${c.osReduce ? "reduce" : "no-pref"}: ${c.why}`, () => {
      expect(
        resolveReducedMotion({
          preference: c.preference,
          surface: c.surface,
          osReduce: c.osReduce,
        }),
      ).toBe(c.reduced);
    });
  }

  it("consults the OS on the site and never on the panel", () => {
    // Stated as a property rather than a row, because this is the sentence
    // the whole module exists to be: flipping osReduce must move the site
    // answer and must not move the admin one.
    const at = (surface: MotionSurface, osReduce: boolean) =>
      resolveReducedMotion({ preference: "os", surface, osReduce });

    expect(at("site", true)).not.toBe(at("site", false));
    expect(at("admin", true)).toBe(at("admin", false));
  });
});

describe("which surface a path is", () => {
  it("claims the panel and everything under it", () => {
    for (const p of ["/admin", "/admin/", "/admin/shell-preview", "/admin/support"]) {
      expect(surfaceForPath(p), p).toBe("admin");
    }
  });

  it("does not claim a reader's page for containing the word", () => {
    // A saint, a shop product or a community post can carry "admin" in its
    // slug. A reader is not an operator because of what they are reading, and
    // a substring match would have quietly overridden their OS setting.
    for (const p of [
      "/",
      "/saints/administer",
      "/shop/icons/admin-desk-icon",
      "/community/posts/admin-question",
      "/bible/john/1",
    ]) {
      expect(surfaceForPath(p), p).toBe("site");
    }
  });
});

describe("reading a stored value", () => {
  it("accepts only the three it wrote", () => {
    for (const v of ["os", "on", "off"]) expect(isMotionPreference(v)).toBe(true);
    // Anything else is storage that another version, another tab, or a person
    // with devtools left behind. It must fall back, not throw and not coerce.
    for (const v of ["", "true", "1", null, undefined, 0, {}]) {
      expect(isMotionPreference(v), String(v)).toBe(false);
    }
  });
});
