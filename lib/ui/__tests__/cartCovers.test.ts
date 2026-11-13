import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The cart drawer covers the screen as a sheet does (1.9, found by Updates 24's
 * layers check, 2026-11-13). At 1032 wide in the native shell, with the cart
 * open, the tab bar was drawn over the drawer's foot: `aside "Cart"` met
 * `nav[data-tab-bar]`, 122 by 77px at 632,717. Both are z-50 and the bar comes
 * later in the page, and the drawer, alone of what covers the screen, never
 * raised the overlay flag that the bar stands down for (lib/ui/overlay.ts,
 * useOverlayOpen), as it does for every sheet.
 *
 * What it holds: the drawer raises the flag while it is open and lowers it as
 * it closes, so the bar stands down; the bar still stands down for the flag;
 * and the phone's Back closes the drawer, as it closes a sheet, rather than
 * leaving the page with the cart open over it (found on the way: the drawer
 * took no Back).
 *
 * What a reader would notice if this broke: on a tablet, the tab bar standing
 * over the open cart's subtotal and checkout button; or Back taking them off
 * the shop page with the cart still open.
 */

const read = (file: string) =>
  fs
    .readFileSync(path.join(process.cwd(), file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("the cart drawer covers the screen as a sheet does", () => {
  const drawer = read("components/shop/CartDrawer.tsx");

  it("raises the overlay flag while it is open, and lowers it as it closes", () => {
    // The effect that runs while the drawer is open: the flag up with the scroll lock, down in its clean-up.
    const effect = drawer.match(/useEffect\(\(\) => \{\s*if \(!open\) return;[\s\S]*?\}, \[open\]\);/)?.[0] ?? "";
    expect(effect).toMatch(/lockBodyScroll\(\);\s*setOverlayOpen\(true\);/);
    expect(effect).toMatch(/return \(\) => \{[\s\S]*unlockBodyScroll\(\);\s*setOverlayOpen\(false\);[\s\S]*\};/);
    expect(drawer).toMatch(/import \{[^}]*\bsetOverlayOpen\b[^}]*\} from "@\/lib\/ui\/overlay";/);
  });

  it("the tab bar stands down while the flag is up", () => {
    const bar = read("components/nav/MobileTabBar.tsx");
    expect(bar).toMatch(/const overlayOpen = useOverlayOpen\(\);/);
    expect(bar).toMatch(/overlayOpen && "opacity-0"/);
    expect(bar).toMatch(/aria-hidden=\{overlayOpen \|\| undefined\}/);
  });

  it("the phone's Back closes the drawer", () => {
    expect(drawer).toMatch(/useAndroidBack\(open, close\);/);
    expect(drawer).toMatch(/const close = \(\) => setOpen\(false\);/);
  });
});
