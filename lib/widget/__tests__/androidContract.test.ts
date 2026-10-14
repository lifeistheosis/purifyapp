import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { buildDayTable } from "../dayTable";

/**
 * The contract between the emitter, the app and the Android widgets
 * (docs/WIDGETS.md).
 *
 * ── Why this reads Java source ──────────────────────────────────────────
 *
 * The widgets are plain Java, and nothing in `npm run test:unit` compiles
 * them. The Gradle build does (tools/android/build-test-app.mjs), but a
 * compiler cannot tell that a widget asks for a JSON key the emitter stopped
 * writing: org.json answers a missing key with nothing, and the widget draws an
 * empty card on somebody's home screen. Nothing crashes, no log is read, and a
 * widget is a surface nobody inspects once it works.
 *
 * So these hold the two sides to one shape, which is the part most likely to
 * drift: every key the Java reads exists in the table or in what the app hands
 * over, every family is both declared and redrawn, and no widget layout uses
 * a view the launcher refuses to draw.
 */

const ROOT = process.cwd();
const MAIN = path.join(ROOT, "android/app/src/main");
const JAVA_DIR = path.join(MAIN, "java/net/purifyapp/purify");
const MANIFEST = path.join(MAIN, "AndroidManifest.xml");
const LAYOUTS = path.join(MAIN, "res/layout");

/** Every widget Java file: the widget package and the Today family's provider. */
function widgetJava(): { file: string; src: string }[] {
  const dir = path.join(JAVA_DIR, "widget");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".java")).map((f) => path.join(dir, f));
  files.push(path.join(JAVA_DIR, "DayWidgetProvider.java"));
  return files.map((file) => ({ file, src: fs.readFileSync(file, "utf8") }));
}
const allJava = () => widgetJava().map((j) => j.src).join("\n");
const read = (file: string) => fs.readFileSync(file, "utf8");

describe("android widgets: the contract", () => {
  it("reads the asset the emitter actually writes", () => {
    // scripts/emit-widget-data.mjs writes public/widget-day-table.json, and
    // cap sync copies public/ into assets/public/. If either side is renamed
    // alone, every widget shows its fallback line forever.
    expect(read(path.join(JAVA_DIR, "widget/WidgetData.java"))).toContain('"public/widget-day-table.json"');
    expect(read(path.join(ROOT, "scripts/emit-widget-data.mjs"))).toContain('"widget-day-table.json"');
  });

  it("asks the table only for keys a version 3 table carries", () => {
    const table = buildDayTable(new Date(Date.UTC(2026, 9, 13, 12)), 400, {
      "2026-10-13": { text: "x", ref: "John 1:1", href: "/bible/john/1#v1" },
    });
    const entries = Object.values(table.days);
    // Every key any object in the table has, at any depth.
    const known = new Set<string>(["days", "new", "old", "verse", "version", "from"]);
    const walk = (v: unknown) => {
      if (!v || typeof v !== "object") return;
      for (const [k, child] of Object.entries(v)) {
        known.add(k);
        walk(child);
      }
    };
    entries.forEach(walk);
    // And what the app hands over (docs/WIDGETS.md, section 2).
    for (const k of ["count", "keptToday", "week", "on", "morning", "evening", "slug", "name", "nameDay", "icon", "version", "date"]) known.add(k);

    const java = allJava();
    const asked = new Set<string>();
    for (const re of [/WidgetData\.text\([^,]+,\s*"([a-zA-Z]+)"\)/g, /opt(?:JSONObject|JSONArray|Int|Boolean|String|Long)\("([a-zA-Z]+)"/g]) {
      for (const m of java.matchAll(re)) asked.add(m[1]);
    }
    const missing = [...asked].filter((k) => !known.has(k));
    expect(missing, `the widgets read ${missing.join(", ")}, which nothing writes`).toEqual([]);
    // It must actually read something, or this passes vacuously.
    expect(asked.size).toBeGreaterThan(5);
  });

  it("stores exactly the six keys the app may hand over", () => {
    const plugin = read(path.join(JAVA_DIR, "widget/WidgetBridgePlugin.java"));
    const listed = plugin.match(/Arrays\.asList\(([\s\S]*?)\)\)/)?.[1] ?? "";
    const keys = [...listed.matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]).sort();
    expect(keys).toEqual(["calendarStyle", "labels", "patron", "prayed", "streak", "update"]);
    expect(plugin).toContain('@CapacitorPlugin(name = "WidgetBridge")');
    expect(read(path.join(JAVA_DIR, "MainActivity.java"))).toContain("registerPlugin(WidgetBridgePlugin.class)");
  });

  it("declares every family it redraws, exported, with its info file", () => {
    const refresh = read(path.join(JAVA_DIR, "widget/WidgetRefresh.java"));
    const families = [...(refresh.match(/FAMILIES = \{([\s\S]*?)\};/)?.[1] ?? "").matchAll(/(\w+)\.class/g)].map((m) => m[1]);
    expect(families).toContain("DayWidgetProvider");
    const manifest = read(MANIFEST);
    for (const family of families) {
      const receiver = manifest.match(new RegExp(`<receiver[^>]*android:name="\\.(?:widget\\.)?${family}"[\\s\\S]*?</receiver>`))?.[0];
      expect(receiver, `${family} is redrawn but not declared`).toBeTruthy();
      // The launcher is another process, so a receiver that is not exported
      // never hears APPWIDGET_UPDATE and the widget silently never draws.
      expect(receiver).toContain('android:exported="true"');
      expect(receiver).toContain("android.appwidget.action.APPWIDGET_UPDATE");
      const info = receiver!.match(/android:resource="@xml\/([a-z_]+)"/)?.[1];
      expect(info && fs.existsSync(path.join(MAIN, `res/xml/${info}.xml`)), `${family}'s info file`).toBe(true);
    }
    // And the reverse: no widget is declared and then forgotten by the redraw.
    const declared = [...manifest.matchAll(/<receiver[^>]*android:name="\.(?:widget\.)?(\w+WidgetProvider)"/g)].map((m) => m[1]);
    expect(declared.sort()).toEqual([...families].sort());
  });

  it("keeps the first widget's name, so a placed widget survives the update", () => {
    expect(read(MANIFEST)).toContain('android:name=".DayWidgetProvider"');
    expect(fs.existsSync(path.join(JAVA_DIR, "DayWidgetProvider.java"))).toBe(true);
  });

  it("does no date arithmetic about the Church's calendar", () => {
    // The table carries both reckonings precisely so no Julian offset lives in
    // Java. If one appears here it will drift from lib/calendar/orthodox.ts,
    // which is what oneReckoning.test.ts exists to prevent on the web side.
    const java = allJava();
    expect(java).not.toMatch(/\b13\b\s*[;,)]/);
    expect(java).not.toMatch(/julian|pascha|easter/i);
  });

  it("never lets a missing table crash the launcher", () => {
    // A widget that throws takes the launcher's surface down with it, so the
    // asset read is total and every face is drawn inside a catch.
    const data = read(path.join(JAVA_DIR, "widget/WidgetData.java"));
    expect(data).toMatch(/catch\s*\(\s*Exception/);
    const base = read(path.join(JAVA_DIR, "widget/PurifyWidgetProvider.java"));
    expect(base).toMatch(/catch\s*\(\s*Exception/);
  });

  it("draws only views a launcher will draw", () => {
    // RemoteViews refuses any other class and the widget shows "Problem
    // loading widget". A plain <View> divider is the usual way in.
    const allowed = new Set([
      "FrameLayout", "LinearLayout", "RelativeLayout", "GridLayout", "AnalogClock", "Button",
      "Chronometer", "ImageButton", "ImageView", "ProgressBar", "TextView", "ViewFlipper",
      "ListView", "GridView", "StackView", "AdapterViewFlipper", "include", "merge",
    ]);
    const layouts = fs.readdirSync(LAYOUTS).filter((f) => f.startsWith("widget_") && !f.startsWith("widget_configure"));
    expect(layouts.length).toBeGreaterThan(3);
    for (const file of layouts) {
      const xml = read(path.join(LAYOUTS, file)).replace(/<!--[\s\S]*?-->/g, "");
      for (const m of xml.matchAll(/<([A-Za-z][\w.]*)[\s/>]/g)) {
        if (m[1] === "?xml") continue;
        expect(allowed.has(m[1]), `${file} uses <${m[1]}>`).toBe(true);
      }
    }
  });
});
