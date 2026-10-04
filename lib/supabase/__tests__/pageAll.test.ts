// The three ways a list is read whole (lib/supabase/pageAll.ts), and the
// stand-in the other tests read from (./cappedApi.ts), held to behaving like
// the API it stands in for: 1,000 rows a request and not a word about the rest.

import { describe, expect, it } from "vitest";

import { pageAll, pageAllIn, pageAllSettled } from "../pageAll";
import { API_MAX_ROWS, cappedApi } from "./cappedApi";

const people = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${String(i).padStart(5, "0")}`, team: `t${i % 7}` }));

describe("the stand-in API", () => {
  it("gives back 1,000 rows however many are asked for, and no error", async () => {
    const { client } = cappedApi({ people: people(2300) });
    const asked = await client.from("people").select("id").limit(20_000);
    expect(asked.error).toBeNull();
    expect(asked.data).toHaveLength(API_MAX_ROWS);
    const unlimited = await client.from("people").select("id");
    expect(unlimited.data).toHaveLength(API_MAX_ROWS);
    const wide = await client.from("people").select("id").range(0, 4999);
    expect(wide.data).toHaveLength(API_MAX_ROWS);
  });

  it("counts in the database without the cap", async () => {
    const { client } = cappedApi({ people: people(2300) });
    const { count, data } = await client.from("people").select("id", { count: "exact", head: true });
    expect(count).toBe(2300);
    expect(data).toBeNull();
  });

  it("says a table that is not there is not there", async () => {
    const { client } = cappedApi({});
    const { data, error } = await client.from("nowhere").select("id");
    expect(data).toBeNull();
    expect(error?.code).toBe("PGRST205");
  });
});

describe("pageAllSettled", () => {
  it("reads every row a page at a time", async () => {
    const { client, requests } = cappedApi({ people: people(2300) });
    const { data, error } = await pageAllSettled<{ id: string }>((from, to) =>
      client.from("people").select("id").order("id").range(from, to),
    );
    expect(error).toBeNull();
    expect(data).toHaveLength(2300);
    expect(new Set(data?.map((r) => r.id)).size).toBe(2300);
    expect(requests.map((r) => [r.from, r.rows])).toEqual([
      [0, 1000],
      [1000, 1000],
      [2000, 300],
    ]);
  });

  it("asks once when the list fits in a page", async () => {
    const { client, requests } = cappedApi({ people: people(12) });
    const { data } = await pageAllSettled((from, to) => client.from("people").select("id").order("id").range(from, to));
    expect(data).toHaveLength(12);
    expect(requests).toHaveLength(1);
  });

  it("asks once more when the list is exactly a page, and finds the end", async () => {
    const { client, requests } = cappedApi({ people: people(1000) });
    const { data } = await pageAllSettled((from, to) => client.from("people").select("id").order("id").range(from, to));
    expect(data).toHaveLength(1000);
    expect(requests.map((r) => r.rows)).toEqual([1000, 0]);
  });

  it("answers a failed page with the error as given and no rows at all", async () => {
    let calls = 0;
    const { data, error } = await pageAllSettled(async (from) => {
      calls += 1;
      return from === 0
        ? { data: people(1000), error: null }
        : { data: null, error: { message: "canceling statement due to statement timeout", code: "57014" } };
    });
    expect(calls).toBe(2);
    expect(data).toBeNull();
    expect(error).toEqual({ message: "canceling statement due to statement timeout", code: "57014" });
  });

  it("stops at the cap it is given", async () => {
    const { client } = cappedApi({ people: people(5000) });
    const { data } = await pageAllSettled((from, to) => client.from("people").select("id").order("id").range(from, to), 2000);
    expect(data).toHaveLength(2000);
  });
});

describe("pageAll", () => {
  it("throws on a failed page, carrying the error it was given", async () => {
    const failure = { message: "Could not find the table 'public.x' in the schema cache", code: "PGRST205" };
    const thrown = await pageAll(async () => ({ data: null, error: failure })).catch((e: Error) => e);
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe(failure.message);
    expect((thrown as Error).cause).toBe(failure);
  });
});

describe("pageAllIn", () => {
  it("sends a long list of ids a hundred at a time and returns every match", async () => {
    const rows = people(700);
    const { client, requests } = cappedApi({ people: rows });
    const seen: number[] = [];
    const out = await pageAllIn<{ id: string }>(
      rows.map((r) => r.id),
      (some, from, to) => {
        if (from === 0) seen.push(some.length);
        return client.from("people").select("id").in("id", some).order("id").range(from, to);
      },
    );
    expect(seen).toEqual([100, 100, 100, 100, 100, 100, 100]);
    expect(out).toHaveLength(700);
    expect(requests).toHaveLength(7);
  });

  it("reads a piece that matches more than a page to its end", async () => {
    const { client } = cappedApi({ people: people(2300) });
    const out = await pageAllIn<{ id: string }>(["t0", "t1", "t2", "t3", "t4", "t5", "t6"], (some, from, to) =>
      client.from("people").select("id, team").in("team", some).order("id").range(from, to),
    );
    expect(out).toHaveLength(2300);
  });

  it("takes each id once, so a row is not returned for two pieces", async () => {
    const { client } = cappedApi({ people: people(3) });
    const twice = [...Array.from({ length: 150 }, () => "p00000"), "p00001"];
    const out = await pageAllIn<{ id: string }>(twice, (some, from, to) =>
      client.from("people").select("id").in("id", some).order("id").range(from, to),
    );
    expect(out.map((r) => r.id)).toEqual(["p00000", "p00001"]);
  });

  it("asks nothing for an empty list", async () => {
    let calls = 0;
    const out = await pageAllIn<{ id: string }>([], async () => {
      calls += 1;
      return { data: [], error: null };
    });
    expect(out).toEqual([]);
    expect(calls).toBe(0);
  });
});
