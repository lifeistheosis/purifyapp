import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { KIND_LABEL, LIVING_KINDS, boardKind, boardKinds, ofKind, type CampaignKind } from "@/lib/campaigns/model";
import en from "@/lib/i18n/messages/en.json";

/**
 * A kind on the board (1.9; the notes, 2.10): "A choice of kind sits behind
 * the sliders, as Talk together's filters do."
 *
 * What this file holds:
 *
 *   only what is there    a kind is offered only if a campaign of it is on
 *                         the board, and no choice at all with one kind;
 *   never an empty board  a kind that has left the board since it was chosen
 *                         shows every campaign, never none;
 *   the reposed are one   whatever else a row says of them;
 *   it asks nothing       the choice filters what is on the screen. The
 *                         board is asked for once, whole, so which kind a
 *                         reader looks at is told to no one.
 *
 * What would go wrong if this broke: a reader choosing "A journey" and
 * being shown an empty board that says nobody is asking, while campaigns
 * are running; or the server learning what kind of need a reader looks for.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const c = (for_whom: "living" | "departed", intention: CampaignKind, id = `${for_whom}-${intention}`) => ({ id, for_whom, intention });

describe("a campaign's kind on the board", () => {
  it("is what it is for, for the living", () => {
    for (const kind of LIVING_KINDS) expect(boardKind(c("living", kind))).toBe(kind);
  });

  it("is the reposed for the reposed, whatever else the row says", () => {
    expect(boardKind(c("departed", "departed"))).toBe("departed");
    expect(boardKind(c("departed", "healing"))).toBe("departed");
  });

  it("is never the reposed for the living", () => {
    expect(boardKind(c("living", "departed"))).toBe("other");
  });
});

describe("the kinds a board offers", () => {
  it("only those that are there, each once, in the start screen's order with the reposed last", () => {
    const board = [c("departed", "departed"), c("living", "travel"), c("living", "healing"), c("living", "travel", "second"), c("departed", "departed", "another")];
    expect(boardKinds(board)).toEqual(["healing", "travel", "departed"]);
    expect(boardKinds([])).toEqual([]);
    expect(boardKinds([c("living", "study")])).toEqual(["study"]);
  });

  it("has a name in the catalog for every kind it can offer", () => {
    const words = en as Record<string, string>;
    for (const kind of [...LIVING_KINDS, "departed"] as CampaignKind[]) expect(words[KIND_LABEL[kind]], kind).toBeTruthy();
  });
});

describe("the campaigns of one kind", () => {
  const board = [c("living", "travel", "a"), c("departed", "departed", "b"), c("living", "healing", "c"), c("living", "travel", "d")];

  it("keeps those of the kind chosen, in the order they came", () => {
    expect(ofKind(board, "travel").map((x) => x.id)).toEqual(["a", "d"]);
    expect(ofKind(board, "departed").map((x) => x.id)).toEqual(["b"]);
  });

  it("is every campaign when no kind is chosen", () => {
    expect(ofKind(board, null).map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("is every campaign, never none, when the kind chosen is no longer on the board", () => {
    expect(ofKind(board, "study").map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
    expect(ofKind([], "study")).toEqual([]);
  });

  it("hands back a list of its own", () => {
    expect(ofKind(board, null)).not.toBe(board);
  });
});

describe("the board's screen", () => {
  const board = read("components/campaigns/CampaignBoard.tsx");
  const many = read("components/campaigns/PrayedByMany.tsx");

  it("offers the choice only with two kinds or more, among the kinds that are there", () => {
    expect(board).toContain("const kinds = boardKinds(all);");
    expect(board).toMatch(/\{kinds\.length > 1 \? \(\s*<ActionMenu/);
    expect(board).toContain("items={kinds.map((k) => ({");
  });

  it("holds one kind at a time, and the lit choice again goes back to every campaign", () => {
    expect(board).toContain("onSelect: () => setKind(k === chosen ? null : k),");
    expect(board).toContain("lit={chosen !== null}");
    expect(board).toContain("checked: k === chosen,");
  });

  it("drops a choice whose kind has left the board, and draws the list by the one rule", () => {
    expect(board).toContain("const chosen = kind !== null && kinds.includes(kind) ? kind : null;");
    expect(board).toContain("const shown = ofKind(all, chosen);");
    expect(board).toMatch(/\{shown\.map\(\(c\) => \(\s*<BoardRow key=\{c\.id\} campaign=\{c\} \/>/);
  });

  it("asks the server nothing for a choice: the board is fetched whole, and by nothing the choice changes", () => {
    expect(board.match(/fetchBoard\(/g)).toHaveLength(1);
    expect(board).toContain("void fetchBoard().then(");
    // The one effect that asks for the board runs again on a retry and on nothing else.
    expect(board).toMatch(/\}, \[version\]\);/);
    expect(board).not.toMatch(/\[[^\]]*\bkind\b[^\]]*\]\);/);
    expect(read("lib/campaigns/client.ts")).toMatch(/export async function fetchBoard\(\)/);
  });

  it("keeps the second list to the same kind, by the same rule", () => {
    expect(board).toContain("<PrayedByMany kind={chosen} />");
    expect(many).toContain("const list = whole ? ofKind(whole, kind) : whole;");
    // And asks for that list by its time alone, as before.
    expect(many).not.toMatch(/fetchMany\([^)]*kind/);
  });

  it("names the sliders with a line the catalog already has", () => {
    expect(board).toContain('label={t("campaigns.new.whatFor")}');
    expect((en as Record<string, string>)["campaigns.new.whatFor"]).toBe("What for");
  });
});
