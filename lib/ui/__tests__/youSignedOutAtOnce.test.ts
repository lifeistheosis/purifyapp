// Updates 90 (2026-11-15), item 2: /account/'s flash with motion reduced, 3
// of 4 runs on the export of 17276848 (a box 330 by 30px at 30,420 for 1 or 2
// frames, 127 to 161ms after the tap). It was not the (you) group's loading
// outline nor the sign-in gate: Gate 3c's still of it
// (docs/handoffs/gate-3c-walks/mwr-open-1-account-arrival-flash-0.png) shows
// the You tab's own waiting outline in the middle frame, its 178 and 230px
// boxes under the bar. YouMobile drew it while resolveUser answered for a
// reader with no session kept, and then drew Sign in. Such a reader is now
// signed out from the first frame, as the shop's signed pages say it.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const code = readFileSync(join(process.cwd(), "components/mobile/YouMobile.tsx"), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

describe("the You tab knows a reader with no session kept from its first frame", () => {
  it("says signed out before the first paint, and still asks", () => {
    const reader = code.slice(code.indexOf("function useReader"), code.indexOf("export function YouMobile"));
    expect(reader).toMatch(
      /useLayoutEffect\(\(\) => \{\s*const local = readLocalSessionUser\(\);\s*if \(local\) \{\s*setReader\(\{ state: "in", id: local\.id, name: readerName\(local\) \}\);\s*return;\s*\}\s*setReader\(\{ state: "out" \}\);\s*let cancelled = false;\s*resolveUser\(\)\.then\(/,
    );
    // A signed-in answer from the ask still stands once it comes.
    expect(reader).toContain('setReader(auth.state === "signed-in" ? { state: "in", id: auth.user.id, name: readerName(auth.user) } : { state: "out" });');
  });
});
