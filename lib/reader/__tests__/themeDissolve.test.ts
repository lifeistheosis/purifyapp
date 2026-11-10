import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A palette a reader taps arrives as a cross-fade (1.9). The brief for the
 * reading modes' page, 2026-11-10: "a tap applies it with the house's motion
 * ... reduced motion still".
 *
 * Until 1.9 a palette landed in one paint, which between two dark grounds
 * read as nothing much. A look brings a picture with it, and one picture cut
 * to another is a fault on the screen. So the controller that puts the
 * palette on the page (components/theme/AppThemeController.tsx) pictures the
 * screen before and after and lets the browser cross-fade them, on the house
 * curve, as the reader's focus mode already does.
 *
 * What this holds, read as source because vitest here has no browser: the
 * change is pictured only when a reader made it on this screen, only when
 * something really changed, and only where the app may move at all
 * (routeMotion.canMove: View Transitions present and motion on). Everything
 * else lands at once: the first apply after a load (nothing to fade from),
 * the gate's answer, the clock at sunset, a palette arriving from another
 * device.
 *
 * What a reader would notice if this broke: a look cutting in hard, or, worse,
 * the app fading on every launch or moving for a reader who asked for stillness.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const controller = read("components/theme/AppThemeController.tsx");
const code = controller.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

describe("a tapped palette cross-fades", () => {
  it("pictures the change only when a reader chose it here, something changed, and the app may move", () => {
    expect(code).toContain('import { canMove } from "@/lib/ui/routeMotion";');
    expect(code).toMatch(/if \(chosen && changed && canMove\(\)\) \{\s*try \{[\s\S]*?startViewTransition\(wear\)\.ready\.catch\(\(\) => \{\}\);\s*\} catch \{\s*wear\(\);\s*\}\s*\} else wear\(\);/);
    // One place starts it, and the attributes are set in one place.
    expect(code.match(/startViewTransition\(/g)).toHaveLength(1);
    expect(code.match(/setAttribute\("data-look"/g)).toHaveLength(1);
    expect(code.match(/setAttribute\("data-reading-mode"/g)).toHaveLength(1);
  });

  it("tells a change from the first apply by what it last put on the page", () => {
    expect(code).toContain("const worn = useRef<{ mode: string | null; look: string | null } | null>(null);");
    expect(code).toMatch(/const before = worn\.current;\s*worn\.current = \{ mode, look \};\s*const changed = before !== null && \(before\.mode !== mode \|\| before\.look !== look\);/);
  });

  it("is chosen only on the event a setting sends, and not when the account wrote it", () => {
    expect(code).toMatch(/const apply = useCallback\(\(chosen = false\) => \{/);
    expect(code).toMatch(/const onPrefs = \(event: Event\) => apply\(\(event as CustomEvent<\{ source\?: string \} \| null>\)\.detail\?\.source !== "sync"\);/);
    expect(code).toContain("window.addEventListener(PREFS_EVENT, onPrefs);");
    expect(code).toContain("window.removeEventListener(PREFS_EVENT, onPrefs);");
    // Every other way in applies plainly.
    expect(code).toContain("const onStorage = () => apply();");
    expect(code).toContain('if (document.visibilityState === "visible") apply();');
    expect(code).toMatch(/latest\.current = apply;\s*apply\(\);/);
    // The account's own write says so, in the event's detail.
    expect(read("lib/sync/kept.ts")).toContain('new CustomEvent(READER_PREFS_EVENT, { detail: { source: "sync" } })');
    // And a reader's own write sends the event with no detail at all.
    expect(read("components/reader/ReaderPrefs.tsx")).toContain("window.dispatchEvent(new CustomEvent(PREFS_EVENT))");
  });

  it("moves on the house curve, and not at all for a reader who asked for stillness", () => {
    expect(CSS).toMatch(/::view-transition-old\(root\),\s*::view-transition-new\(root\) \{\s*animation-duration: 420ms;\s*animation-timing-function: var\(--ease-house\);\s*\}/);
    expect(CSS).toMatch(/:root:where\(\[data-motion="reduce"\]\)::view-transition-old\(root\),\s*:root:where\(\[data-motion="reduce"\]\)::view-transition-new\(root\) \{\s*animation: none !important;\s*\}/);
    const motion = read("lib/ui/routeMotion.ts");
    expect(motion).toMatch(/export function canMove\(\): boolean \{[\s\S]*?startViewTransition !== "function"\) return false;\s*return document\.documentElement\.dataset\.motion !== "reduce";\s*\}/);
  });
});
