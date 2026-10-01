import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  HANDLE_COOLDOWN_MS,
  RESERVED_HANDLES,
  handleBase,
  handleChangeAllowed,
  handleProblem,
  handleSeed,
  normalizeHandle,
} from "../handle";

const SQL = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261001_profiles_badges.sql"),
  "utf8",
);

describe("normalizeHandle", () => {
  it("drops the @, the spaces and the capitals a reader types", () => {
    expect(normalizeHandle("  @@Edgar.J ")).toBe("edgar.j");
  });
});

describe("handleProblem", () => {
  it("accepts the shapes the database accepts", () => {
    for (const ok of ["abc", "edgar_j", "st.mary.of.egypt", "a1b2c3", "x".repeat(24)]) {
      expect(handleProblem(ok), ok).toBeNull();
    }
  });

  it("names what is wrong", () => {
    expect(handleProblem("ab")).toBe("length");
    expect(handleProblem("x".repeat(25))).toBe("length");
    expect(handleProblem("edgar-j")).toBe("chars");
    expect(handleProblem("Edgar")).toBe("chars");
    expect(handleProblem(".edgar")).toBe("dots");
    expect(handleProblem("edgar.")).toBe("dots");
    expect(handleProblem("ed..gar")).toBe("dots");
    expect(handleProblem("support")).toBe("reserved");
    expect(handleProblem("purify")).toBe("reserved");
  });

  it("holds the same rule as the database's check constraint", () => {
    // profiles_handle_format: one character class, no dot at either end,
    // never two dots in a row. If the SQL changes, this has to change with it.
    expect(SQL).toContain("handle ~ '^[a-z0-9_.]{3,24}$'");
    expect(SQL).toContain("handle !~ '^[.]'");
    expect(SQL).toContain("handle !~ '[.]$'");
    expect(SQL).toContain("handle !~ '[.][.]'");
  });
});

describe("handleBase", () => {
  it("reduces a display name the way profile_handle_base() does", () => {
    expect(handleBase("Edgar Jesus Augustin")).toBe("edgarjesusaugustin");
    expect(handleBase("St. Mary")).toBe("st.mary");
    expect(handleBase("...dots...")).toBe("dots");
  });

  it("cuts to 18 before trimming, so no handle starts life ending in a dot", () => {
    const base = handleBase("abcdefghijklmnopq.rstuvw");
    expect(base).toBe("abcdefghijklmnopq");
    expect(handleProblem(base)).toBeNull();
  });

  it("falls back to reader when too little survives or the name reads as official", () => {
    expect(handleBase("Γεώργιος")).toBe("reader");
    expect(handleBase("Ян")).toBe("reader");
    expect(handleBase(null)).toBe("reader");
    expect(handleBase("Support")).toBe("reader");
  });

  it("reserves the same names in SQL, bar the one the backfill gives to Purify itself", () => {
    const m = /when s\.b in \(([^)]*)\)/.exec(SQL);
    expect(m, "profile_handle_base's reserved list").not.toBeNull();
    const sqlList = new Set([...m![1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]));
    const expected = new Set([...RESERVED_HANDLES].filter((h) => h !== "purify"));
    expect([...sqlList].sort()).toEqual([...expected].sort());
  });
});

describe("handleSeed", () => {
  it("uses a name the reader chose, even one that matches their email", () => {
    expect(handleSeed("nikolai", "Nikolai", "nikolai@example.com")).toBe("Nikolai");
    expect(handleSeed("Maria", null, "maria.k@example.com")).toBe("Maria");
  });

  it("never seeds a handle from the email's local part standing in for a name", () => {
    // What a Google sign-in's profile holds until the reader picks a name.
    expect(handleSeed("maria.k.1987", null, "maria.k.1987@gmail.com")).toBeNull();
    expect(handleSeed("Maria.K.1987", "", "maria.k.1987@gmail.com")).toBeNull();
    expect(handleBase(handleSeed("maria.k.1987", null, "maria.k.1987@gmail.com"))).toBe("reader");
  });

  it("matches the database's profile_handle_seed()", () => {
    expect(SQL).toContain("create or replace function public.profile_handle_seed(display_name text, chosen text, email text)");
    expect(SQL).toContain("u.raw_user_meta_data->>'display_name'");
  });

  it("reserves the bare word every unnamed reader starts from", () => {
    expect(handleProblem("reader")).toBe("reserved");
  });
});

describe("handleChangeAllowed", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  it("allows a first change and one after the cooldown", () => {
    expect(handleChangeAllowed(null, now)).toBe(true);
    expect(handleChangeAllowed(new Date(now.getTime() - HANDLE_COOLDOWN_MS).toISOString(), now)).toBe(true);
  });
  it("refuses a second change inside the hour", () => {
    expect(handleChangeAllowed(new Date(now.getTime() - 60_000).toISOString(), now)).toBe(false);
  });
});
