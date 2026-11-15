// Gate 3c's shop faults (Updates 86, 2026-11-15), measured on the export of
// f637f7b8a, one lane and one worker at a time.
//
// Group 7, motion on: the EIKON door on /shop/stores/ shows the store's
// first pieces, and /shop/eikon/ shows the same pictures, but none travelled
// (4 of 4): nothing in the door wore a name to travel by, and nothing in the
// room took one. A card that opens its own page carries its picture into it
// (CLAUDE.md).
//
// Group 9, motion reduced: Orders and Requests from the cart (and the shop's
// other signed pages) flashed a box for 1 or 2 frames (4 of 4 each). Each page
// started in its loading state and asked for the session after it had drawn,
// so a signed-out reader saw the loading bones for a frame or two, then Sign
// in. Messages, the third of the shop's signed pages, had the same start.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
/** A file's code without its notes. */
const code = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("the store door carries its first picture into the room it opens (group 7)", () => {
  const door = code("components/shop/StoreDoor.tsx");
  const room = code("components/shop/eikon/EikonBoutique.tsx");

  it("the door's first piece wears that piece's name, and only the first (one picture travels)", () => {
    expect(door).toContain('import { pieceCarry } from "@/lib/shop/productHref";');
    expect(door).toContain("{shown.map((p, i) => (");
    expect(door).toContain("data-carry={i === 0 ? pieceCarry(p.slug) : undefined}");
    expect(door.match(/data-carry=/g)).toHaveLength(1);
  });

  it("EIKON's room takes it on that piece's own picture, which still carries itself on to the piece's page", () => {
    const picture = room.slice(room.indexOf("<div\n                    data-carry="), room.indexOf("{image ? ("));
    expect(picture).toContain("data-carry={pieceCarry(p.slug)}");
    expect(picture).toContain("data-carry-into={pieceCarry(p.slug)}");
  });
});

describe("the shop's signed pages say Sign in from their first frame on the device (group 9)", () => {
  const PAGES: [file: string, loader: string][] = [
    ["components/shop/OrdersClient.tsx", "load"],
    ["components/shop/RequestsClient.tsx", "load"],
    ["components/shop/MessagesClient.tsx", "loadInbox"],
  ];

  it("each paints its own signed-out answer at once, and asks behind it", () => {
    for (const [file, loader] of PAGES) {
      const src = code(file);
      expect(src, file).toContain('import { useSignedOutPeek } from "@/lib/shop/signedOutAtOnce";');
      expect(src, file).toContain("const SIGNED_OUT: Result = { signedIn: false };");
      expect(src, file).toContain("const signedOut = useSignedOutPeek(SIGNED_OUT);");
      expect(src, file).toContain(`useAsyncData(${loader}, [], signedOut)`);
      expect(src, file).not.toContain(`useAsyncData(${loader}, [])`);
    }
  });

  it("knows it from the session the device keeps, as the page renders, and nothing on the server or as the export's HTML wakes", () => {
    const peek = code("lib/shop/signedOutAtOnce.ts");
    expect(peek).toContain("const onDevice = useSyncExternalStore(noSubscribe, () => true, () => false);");
    expect(peek).toContain("return () => (onDevice && !readLocalSessionUser() ? signedOut : null);");
    expect(peek).not.toMatch(/useEffect|useLayoutEffect|resolveUser|getSession/);
  });

  it("a peek that knows the answer starts the page out of its loading state (the bones are never drawn)", () => {
    const hook = code("lib/shop/useAsyncData.ts");
    expect(hook).toContain("const known = peek?.() ?? null;");
    expect(hook).toContain("return { data: known, error: null, loading: known === null };");
    // And a check that cannot finish leaves what is on screen standing.
    expect(hook).toContain("prev.data !== null");
  });
});
