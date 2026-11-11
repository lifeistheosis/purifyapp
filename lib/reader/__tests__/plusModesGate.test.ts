import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { FRESH_MS, PLUS_MODES_ASKING, PLUS_MODES_KEPT, PLUS_MODES_OPEN, createPlusModesGate, type PlusModesSource } from "@/lib/reader/plusModesGate";
import { FREE_THEMES, READING_THEMES, themeWorn, type ReadingTheme } from "@/lib/reader/readingModes";

/**
 * The Plus answer for the reading palettes is held once, for the whole app
 * (lib/reader/plusModesGate.ts).
 *
 * The owner's note 3 of build 93, 2026-11-11, on You, Reading mode: "So this
 * screen actually doesn't do anything. When I click on the stuff, it doesn't
 * change anything." Dawn carried the check and the app stayed in Dark. He
 * had opened the app signed out and signed in afterwards: the part that
 * dresses the app had asked before the sign-in and kept its no, and the page
 * asked after it and heard yes.
 *
 * What a reader would notice if this broke: a tap on a look that draws its
 * check and changes nothing, until the app is closed and opened again; or,
 * for a reader with Plus, their look dropping to Dark for seconds every time
 * the app opens.
 */
const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

/** An account server a test answers by hand, one asking at a time. */
function server() {
  const waiting: { yes: (answer: boolean) => void; fail: () => void }[] = [];
  let asked = 0;
  return {
    ask: () => {
      asked++;
      return new Promise<boolean>((yes, fail) => waiting.push({ yes, fail: () => fail(new Error("no signal")) }));
    },
    /** Answer the oldest asking still open. */
    answer: async (answer: boolean) => {
      waiting.shift()!.yes(answer);
      await settle();
    },
    fail: async () => {
      waiting.shift()!.fail();
      await settle();
    },
    get asked() {
      return asked;
    },
    get open() {
      return waiting.length;
    },
  };
}

const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function gateWith(over: Partial<PlusModesSource> = {}) {
  const account = server();
  const kept: { value: boolean | null; writes: boolean[] } = { value: null, writes: [] };
  let clock = 1_000_000;
  const gate = createPlusModesGate({
    enforced: () => true,
    ask: account.ask,
    recall: () => kept.value,
    remember: (answer) => {
      kept.value = answer;
      kept.writes.push(answer);
    },
    now: () => clock,
    ...over,
  });
  return { gate, account, kept, wait: (ms: number) => void (clock += ms) };
}

describe("the Plus answer for the palettes, held once", () => {
  it("is open at once, and asks nobody, where Plus is not asked for", async () => {
    const { gate, account } = gateWith({ enforced: () => false });
    expect(gate.get()).toBe(PLUS_MODES_OPEN);
    await gate.refresh();
    await gate.refresh(true);
    expect(account.asked).toBe(0);
    expect(gate.get()).toEqual({ allowed: true, locked: false });
  });

  it("while it asks, wears no Plus palette and draws no lock; then says what it heard", async () => {
    const yes = gateWith();
    expect(yes.gate.get()).toBe(PLUS_MODES_ASKING);
    expect(yes.gate.get()).toEqual({ allowed: false, locked: false });
    void yes.gate.refresh();
    await yes.account.answer(true);
    expect(yes.gate.get()).toEqual({ allowed: true, locked: false });

    const no = gateWith();
    void no.gate.refresh();
    await no.account.answer(false);
    expect(no.gate.get()).toEqual({ allowed: false, locked: true });
  });

  it("build 93 note 3: a reader who signs in after the app opened is heard by every part at once", async () => {
    const { gate, account } = gateWith();
    // The part that dresses the app is there from the moment the app opens.
    const dresser: boolean[] = [];
    gate.subscribe(() => dresser.push(gate.get().allowed));
    void gate.refresh();
    await account.answer(false);
    expect(gate.get()).toEqual({ allowed: false, locked: true });
    // Told once, that the answer has come and is no.
    expect(dresser).toEqual([false]);

    // He signs in. Nothing is loaded again; the sign-in itself asks.
    void gate.refresh(true);
    await account.answer(true);
    // The dresser is told, and wears what is tapped from here on.
    expect(dresser).toEqual([false, true]);

    // The Reading mode page opens now and reads the same answer: there is no second one to differ.
    const page: boolean[] = [];
    gate.subscribe(() => page.push(gate.get().allowed));
    expect(gate.get()).toEqual({ allowed: true, locked: false });

    // And a sign-out is heard the same way, by both.
    void gate.refresh(true);
    await account.answer(false);
    expect(dresser).toEqual([false, true, false]);
    expect(page).toEqual([false]);
    expect(gate.get()).toEqual({ allowed: false, locked: true });
  });

  it("takes only the newest asking's answer: a no asked before the sign-in cannot land over the yes", async () => {
    const { gate, account } = gateWith();
    void gate.refresh(); // asked signed out, slow to come back
    void gate.refresh(true); // the sign-in asks again
    expect(account.open).toBe(2);
    // The old asking's no comes back, late.
    await account.answer(false);
    // The old no is dropped: the gate is still asking, not locked.
    expect(gate.get()).toEqual({ allowed: false, locked: false });
    await account.answer(true);
    expect(gate.get()).toEqual({ allowed: true, locked: false });
  });

  it("a part that only appears does not ask twice; something that can change the answer always asks", async () => {
    const { gate, account, wait } = gateWith();
    void gate.refresh();
    void gate.refresh();
    void gate.refresh();
    // One asking under way serves them all.
    expect(account.asked).toBe(1);
    await account.answer(true);
    // An answer a moment old is enough for the next part.
    wait(FRESH_MS - 1);
    void gate.refresh();
    expect(account.asked).toBe(1);
    // Later, a part that appears asks, as each part always did.
    wait(2);
    void gate.refresh();
    expect(account.asked).toBe(2);
    await account.answer(true);
    // A sign-in, a purchase or the signal back asks whatever the answer's age.
    void gate.refresh(true);
    void gate.refresh(true);
    expect(account.asked).toBe(4);
  });

  it("a reader the device last knew to have Plus keeps their palette while it asks", async () => {
    const { gate, account, kept } = gateWith();
    kept.value = true;
    // Worn, and no lock, before anything has answered.
    expect(gate.get()).toBe(PLUS_MODES_KEPT);
    expect(gate.get()).toEqual({ allowed: true, locked: false });
    void gate.refresh();
    await account.answer(true);
    expect(gate.get()).toEqual({ allowed: true, locked: false });
    expect(kept.writes).toEqual([true]);
  });

  it("what the device last heard never outlives the answer, and never draws a lock itself", async () => {
    // Plus has ended since: the palette is put down when the answer says so.
    const ended = gateWith();
    ended.kept.value = true;
    void ended.gate.refresh();
    await ended.account.answer(false);
    expect(ended.gate.get()).toEqual({ allowed: false, locked: true });
    expect(ended.kept.value).toBe(false);

    // A device that last heard no shows no lock until it is told no again: the reader may have subscribed since.
    const since = gateWith();
    since.kept.value = false;
    expect(since.gate.get()).toEqual({ allowed: false, locked: false });
    void since.gate.refresh();
    await since.account.answer(true);
    expect(since.gate.get()).toEqual({ allowed: true, locked: false });
    expect(since.kept.value).toBe(true);
  });

  it("with no signal, a reader the device last knew to have Plus keeps their palette until the server answers", async () => {
    const { gate, account, kept } = gateWith();
    kept.value = true;
    void gate.refresh();
    await account.fail();
    // The server could not be asked: the palette stays on, and no lock is drawn.
    expect(gate.get()).toEqual({ allowed: true, locked: false });
    // Nothing is kept from an asking that did not reach the server.
    expect(kept.writes).toEqual([]);
    expect(kept.value).toBe(true);
    // The signal back asks again, and the server has the last word: Plus has ended.
    void gate.refresh(true);
    await account.answer(false);
    expect(gate.get()).toEqual({ allowed: false, locked: true });
    expect(kept.value).toBe(false);
  });

  it("with no signal, a reader the device does not know to have Plus wears no Plus palette, and a tap still opens the sheet", async () => {
    for (const lastHeard of [false, null]) {
      const { gate, account, kept } = gateWith();
      kept.value = lastHeard;
      void gate.refresh();
      await account.fail();
      expect(gate.get(), String(lastHeard)).toEqual({ allowed: false, locked: true });
      expect(kept.writes).toEqual([]);
      expect(kept.value).toBe(lastHeard);
      // The signal back, and they have Plus after all.
      void gate.refresh(true);
      await account.answer(true);
      expect(gate.get()).toEqual({ allowed: true, locked: false });
      expect(kept.value).toBe(true);
    }
  });

  it("a reader heard to have Plus this visit keeps their palette when the signal drops", async () => {
    const { gate, account } = gateWith();
    void gate.refresh();
    await account.answer(true);
    // The app comes back to the front in a tunnel.
    void gate.refresh(true);
    await account.fail();
    expect(gate.get()).toEqual({ allowed: true, locked: false });
  });

  it("a shell that learns its kind late stays open until its answer comes", async () => {
    let known = false;
    const { gate, account } = gateWith({ enforced: () => known });
    expect(gate.get()).toBe(PLUS_MODES_OPEN);
    known = true;
    void gate.refresh();
    // No flash of Dark in between.
    expect(gate.get()).toEqual({ allowed: true, locked: false });
    await account.answer(false);
    expect(gate.get()).toEqual({ allowed: false, locked: true });
  });

  it("hands every part the same object until the answer changes", async () => {
    const { gate, account } = gateWith();
    const before = gate.get();
    expect(gate.get()).toBe(before);
    let told = 0;
    gate.subscribe(() => told++);
    void gate.refresh();
    await account.answer(false);
    const no = gate.get();
    expect(no).not.toBe(before);
    // The same answer again changes nothing and tells nobody.
    void gate.refresh(true);
    await account.answer(false);
    expect(gate.get()).toBe(no);
    expect(told).toBe(1);
  });
});

describe("a tap made while the gate is still asking", () => {
  const picker = read("components/reader/usePalettePick.ts");

  it("is not lost: it waits for the answer and is carried out the moment it comes", () => {
    // Kept only when the rule could do nothing yet.
    expect(picker).toContain('waiting.current = did === "waited" ? id : null;');
    // Carried out when the gate says yes or no, by the same rule.
    expect(picker).toMatch(/useEffect\(\(\) => \{\s*const id = waiting\.current;\s*if \(id && \(allowed \|\| locked\)\) pick\(id\);\s*\}, \[allowed, locked, pick\]\);/);
  });
});

describe("the palette a reader wears", () => {
  const plus = () => true;
  const none = (theme: ReadingTheme) => FREE_THEMES.includes(theme);

  it("is their own where the gate lets them wear it, and Dark where it does not", () => {
    for (const { id } of READING_THEMES) {
      expect(themeWorn(id, plus), id).toBe(id);
      expect(themeWorn(id, none), id).toBe(FREE_THEMES.includes(id) ? id : "default");
    }
    expect(themeWorn("dawn", none)).toBe("default");
    expect(themeWorn("parchment", none)).toBe("parchment");
  });
});

describe("how the app is wired to it", () => {
  const hook = read("components/reader/usePlusReadingModes.ts");

  it("there is one gate, made once, and the hook reads it", () => {
    expect(hook.match(/createPlusModesGate\(/g)).toHaveLength(1);
    expect(hook).toMatch(/^const gate = createPlusModesGate\(\{/m);
    expect(hook).toContain("const paid = useSyncExternalStore(subscribe, gate.get, serverAnswer);");
    // No part keeps an answer of its own any more.
    expect(hook).not.toContain("useState");
    expect(hook).not.toContain("useEffect");
  });

  it("asks the app's own resolver, where Plus is asked for on this surface", () => {
    expect(hook).toContain("enforced: () => plusEnforcedFor(clientSurface()),");
    // The app's own resolver, which also says whether the server was reached: an answer got without it is none.
    expect(hook).toMatch(/ask: async \(\) => \{\s*const \{ entitlements, heard \} = await askClientEntitlements\(\);\s*if \(!heard\) throw new Error\("the account server could not be reached"\);\s*return entitlements\.plusFeatures;\s*\},/);
    expect(hook).not.toContain("getClientEntitlements");
    // The server draws as the web, and the first client render agrees with it.
    expect(hook).toContain('const serverAnswer = (): PlusModes => (plusEnforcedFor("web") ? PLUS_MODES_ASKING : PLUS_MODES_OPEN);');
  });

  it("asks again at each moment the answer can change", () => {
    // A purchase or a restore.
    expect(hook).toContain("onEntitlementsChanged(() => void gate.refresh(true));");
    // A sign-in or a sign-out: another reader than before is asked for whatever is under way. On a timer: an auth
    // call inside the callback never returns. The same reader named again (the library waking) is not asked twice.
    expect(hook).toMatch(/onAuthStateChange\(\(event, session\) => \{\s*if \(event !== "INITIAL_SESSION" && event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED"\) return;\s*const now = session\?\.user\?\.id \?\? null;[\s\S]*?const another = now !== reader \|\| event === "USER_UPDATED";\s*reader = now;[\s\S]*?if \(event === "INITIAL_SESSION"\) return;[\s\S]*?window\.setTimeout\(\(\) => void gate\.refresh\(another\), 0\);\s*\}\);/);
    // The signal back.
    expect(hook).toContain('window.addEventListener("online", () => void gate.refresh(true));');
    // The app back at the front.
    expect(hook).toMatch(/document\.addEventListener\("visibilitychange", \(\) => \{\s*if \(document\.visibilityState === "visible"\) void gate\.refresh\(\);\s*\}\);/);
    // And any part appearing.
    expect(hook).toMatch(/function subscribe\(changed: \(\) => void\): \(\) => void \{\s*listen\(\);\s*const stop = gate\.subscribe\(changed\);[\s\S]*?void gate\.refresh\(\);\s*return stop;\s*\}/);
  });

  it("keeps what it heard on the device, for the next opening and for a time with no signal", () => {
    expect(hook).toContain('export const PLUS_MODES_KEPT_KEY = "purify.reader.plusModes";');
    expect(hook).toMatch(/remember: \(answer\) => \{\s*try \{\s*window\.localStorage\.setItem\(PLUS_MODES_KEPT_KEY, answer \? "1" : "0"\);/);
    expect(hook).toMatch(/recall: \(\) => \{\s*try \{\s*const kept = window\.localStorage\.getItem\(PLUS_MODES_KEPT_KEY\);\s*return kept === "1" \? true : kept === "0" \? false : null;/);
    // The resolver says a failed reach apart from an answer, and answers FREE either way to everything else.
    const client = read("lib/entitlements/client.ts");
    expect(client).toContain("export async function askClientEntitlements(): Promise<{ entitlements: Entitlements; heard: boolean }> {");
    expect(client).toContain("if (!user) return { entitlements: FREE_ENTITLEMENTS, heard: !isAuthRetryableFetchError(authError) };");
    expect(client).toMatch(/export async function getClientEntitlements\(\): Promise<Entitlements> \{\s*return \(await askClientEntitlements\(\)\)\.entitlements;\s*\}/);
  });

  it("every part that asks about a palette asks through the hook", () => {
    const sources = (dir: string): string[] =>
      fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === "__tests__" || e.name === "node_modules" ? [] : sources(rel);
        return /\.tsx?$/.test(e.name) ? [rel] : [];
      });
    const callers = [...sources("app"), ...sources("components")].filter((f) => /usePlusReadingModes\(\)/.test(read(f))).sort();
    // The dresser and every picker and switch: one answer between them.
    expect(callers).toEqual([
      "components/catechism/ThemeRow.tsx",
      "components/reader/CandleSeasonSwitch.tsx",
      "components/reader/NightReadingRow.tsx",
      "components/reader/ReaderPrefs.tsx",
      "components/reader/VespersSwitch.tsx",
      // The three pickers ask through this one (Settings' row, the Reading mode page, the reader's own settings).
      "components/reader/usePalettePick.ts",
      "components/reader/usePlusReadingModes.ts",
      "components/theme/AppThemeController.tsx",
    ]);
    // And nothing asks the resolver for the palettes behind the hook's back.
    for (const file of callers) {
      if (file.endsWith("usePlusReadingModes.ts")) continue;
      expect(read(file), file).not.toMatch(/askClientEntitlements|getClientEntitlements/);
    }
  });

  it("the dresser decides what is worn by one rule, and every picker draws its check on what the page wears", () => {
    expect(read("components/theme/AppThemeController.tsx")).toContain("const theme = allows(wanted) ? wanted : themeWorn(stored, allows);");
    // The page says what it is in: read off the root, so it is true whatever decided it.
    const worn = read("components/theme/useWornPalette.ts");
    expect(worn).toContain('attributeFilter: ["data-reading-mode", "data-look"]');
    expect(worn).toContain('const wornId = () => document.documentElement.getAttribute("data-look") ?? document.documentElement.getAttribute("data-reading-mode") ?? "default";');
    expect(worn).toMatch(/export function useThemeWorn\(\): ReadingTheme \{\s*return coerceReadingTheme\(useSyncExternalStore\(subscribeTheme, wornId, \(\) => "default"\)\);\s*\}/);
    // Settings' row and the Reading mode page share the tile: its check is on what is worn.
    const tile = read("components/settings/ReadingModePages.tsx");
    expect(tile).toContain("const on = (worn ?? themeWorn(theme, allows)) === mode.id;");
    // One hook hands every picker its tap, the palette worn and the gate's answer.
    const picker = read("components/reader/usePalettePick.ts");
    expect(picker).toContain("const worn = useThemeWorn();");
    expect(picker).toContain("const { allows, allowed, locked } = usePlusReadingModes();");
    expect(picker).toContain('const did = pickPalette(id, { worn, allows, locked, setTheme, sell: () => upgrade.open("palettes") });');
    for (const file of ["components/settings/ReadingModePages.tsx", "components/settings/ReadingModeGallery.tsx", "components/reader/ReadingModeChips.tsx"]) {
      const code = read(file);
      expect(code, file).toContain("const { pick, worn, allows, locked } = usePalettePick();");
      expect(code, file).toContain("worn={worn}");
      expect(code, file).toMatch(/onPick=\{pick\}/);
      // No picker keeps a tap rule, or an answer, of its own.
      expect(code, file).not.toMatch(/setTheme\(|upgrade\.open\(|usePlusReadingModes\(\)/);
    }
    // The name under Settings' Reading mode row.
    expect(read("components/settings/SettingsClient.tsx")).toMatch(/const worn = useThemeWorn\(\);\s*const mode = READING_THEMES\.find\(\(m\) => m\.id === worn\);/);
    // Nowhere is a check drawn from the stored palette and a part's own yes.
    for (const file of ["components/settings/ReadingModePages.tsx", "components/settings/ReadingModeGallery.tsx", "components/reader/ReadingModeChips.tsx"]) {
      expect(read(file), file).not.toMatch(/theme === mode\.id && (allowed|themeAllowed)/);
    }
  });
});
