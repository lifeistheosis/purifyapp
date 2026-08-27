import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { buildDayTable } from "../dayTable";

/**
 * The contract between the emitter and the Android widget.
 *
 * ── Why this reads Java source ──────────────────────────────────────────
 *
 * The widget is Kotlin-free plain Java and cannot be compiled here: this
 * machine has a JRE 1.8 and no Android SDK. So the compiler will never tell us
 * that DayWidgetProvider asks for a JSON key the emitter stopped writing.
 *
 * And the failure is silent in the worst way. A missing key comes back from
 * org.json's optString as "", so the widget renders an empty card on somebody's
 * home screen. Nothing crashes, no log is read, and a widget is a surface
 * nobody inspects once it works. Renaming a field in dayTable.ts would do it.
 *
 * These tests cannot prove the Java compiles. They can prove the two sides
 * still agree about the shape, which is the part most likely to drift.
 */

const ROOT = process.cwd();
const JAVA = path.join(
  ROOT,
  "android/app/src/main/java/net/purifyapp/purify/DayWidgetProvider.java",
);
const MANIFEST = path.join(ROOT, "android/app/src/main/AndroidManifest.xml");

const src = () => fs.readFileSync(JAVA, "utf8");

describe("android widget contract", () => {
  it("the provider exists where the manifest says it does", () => {
    expect(fs.existsSync(JAVA)).toBe(true);
    const manifest = fs.readFileSync(MANIFEST, "utf8");
    expect(manifest).toContain('android:name=".DayWidgetProvider"');
    // The launcher is another process, so the receiver must be exported or
    // it never receives APPWIDGET_UPDATE and the widget silently never draws.
    expect(manifest).toMatch(/<receiver[\s\S]*?android:exported="true"[\s\S]*?DayWidgetProvider|DayWidgetProvider[\s\S]*?android:exported="true"/);
    expect(manifest).toContain("android.appwidget.action.APPWIDGET_UPDATE");
    expect(manifest).toContain("@xml/day_widget_info");
  });

  it("reads the asset the emitter actually writes", () => {
    // scripts/emit-widget-data.mjs writes public/widget-day-table.json, and
    // cap sync copies public/ into assets/public/. If either side is renamed
    // alone, the widget shows its fallback line forever.
    expect(src()).toContain('"public/widget-day-table.json"');
  });

  it("asks for exactly the keys the table carries", () => {
    const table = buildDayTable(new Date(Date.UTC(2026, 7, 27, 12)), 3);
    const day = Object.values(table.days)[0];

    // Top level, and the two reckonings.
    expect(table).toHaveProperty("days");
    expect(day).toHaveProperty("new");
    expect(day).toHaveProperty("old");

    const java = src();
    expect(java).toContain('optJSONObject("days")');
    expect(java).toContain('"old"');
    expect(java).toContain('"new"');

    // Every field the Java pulls out must exist on a real entry.
    const asked = [...java.matchAll(/optString\("([a-zA-Z]+)"/g)].map((m) => m[1]);
    const missing = asked.filter((k) => !(k in day.new));
    expect(
      missing,
      `DayWidgetProvider reads ${missing.join(", ")}, which the emitter does not ` +
        `write. org.json returns "" for these, so the widget would render blank ` +
        `rather than fail. Fields available: ${Object.keys(day.new).join(", ")}`,
    ).toEqual([]);
    // And it must actually read something, or this passes vacuously.
    expect(asked.length).toBeGreaterThan(1);
  });

  it("does no date arithmetic of its own", () => {
    /**
     * The table carries both reckonings precisely so no Julian offset lives in
     * Java. If one appears here it will drift from lib/calendar/orthodox.ts,
     * which is what oneReckoning.test.ts exists to prevent on the web side.
     */
    const java = src();
    expect(java).not.toMatch(/\b13\b\s*[;,)]/);
    expect(java).not.toMatch(/julianOffset|JULIAN_OFFSET/i);
  });

  it("never lets a missing table crash the launcher", () => {
    // A widget that throws takes the host launcher's surface down with it, so
    // the asset read has to be total.
    const java = src();
    expect(java).toMatch(/catch\s*\(\s*Exception/);
    expect(java).toContain("return null");
  });
});
