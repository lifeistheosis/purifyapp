import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Shared axe-core assertion. WCAG 2.1 AA tags. Excludes selectors that are
 * known third-party-controlled (the Buy Me a Coffee iframe on /support) so
 * a violation outside our control doesn't block the build.
 */
export async function expectNoA11yViolations(
 page: Page,
 opts: { exclude?: string[] } = {},
) {
 let builder = new AxeBuilder({ page }).withTags([
 "wcag2a",
 "wcag2aa",
 "wcag21a",
 "wcag21aa",
 ]);
 for (const sel of opts.exclude ?? []) {
 builder = builder.exclude(sel);
 }
 // Let running CSS animations/transitions finish before scanning: axe reads
 // computed colors, and a scan mid fade-in blends foreground into backdrop.
 // CI #318 flagged the welcome overlay's Begin button at 1.81 contrast for
 // exactly this reason (settled state: text-night on bg-paper, well past AA).
 // The 3s cap keeps infinite animations (spinners) from stalling the scan.
 await page.evaluate(() =>
 Promise.race([
 Promise.all(
 document.getAnimations().map((a) => a.finished.catch(() => {})),
 ),
 new Promise((resolve) => setTimeout(resolve, 3000)),
 ]),
 );
 const results = await builder.analyze();
 if (results.violations.length > 0) {
 // Surface a readable diff in the test output.
 console.log(
 "axe violations:\n" +
 results.violations
 .map((v) => ` ${v.id} (${v.impact}) — ${v.help} — ${v.nodes.length} node(s)`)
 .join("\n"),
 );
 }
 expect(results.violations, "axe violations").toEqual([]);
}
