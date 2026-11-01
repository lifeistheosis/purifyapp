import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { buildDayTable } from "../dayTable";
import { patronEntry, patronFacts } from "../state";

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
      "2026-10-13": {
        text: "x",
        ref: "John 1:1",
        href: "/bible/john/1#v1",
        // TEMPORARY (lib/today/machineVerse.ts): the verse in a language with no Bible of its own.
        machine: { tr: { text: "y", ref: "YUHANNA 1:1", note: "Makine çevirisi" } },
      },
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
    // And what the app hands over (docs/WIDGETS.md, section 2): the patron's
    // fields as lib/widget/state.ts writes them, and the rest as listed.
    const patron = patronEntry(patronFacts({ kind: "saint", slug: "arsenius-the-great" }, "2026-10-14", "new"));
    const patronKeys = Object.keys(JSON.parse(patron!));
    expect(patronKeys).toEqual(["slug", "name", "nameDay", "nameDayAfter", "icon"]);
    for (const k of patronKeys) known.add(k);
    for (const k of ["count", "keptToday", "week", "on", "morning", "evening", "version", "date"]) known.add(k);

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

  it("counts to the patron's next name day by itself once the one handed over has gone by (note 85)", () => {
    // Without this, the morning after a name day read "Open Purify to
    // refresh" until the app was opened. The date is the app's; the widget
    // only picks the first of the two that has not gone by.
    const java = read(path.join(JAVA_DIR, "widget/MySaintWidgetProvider.java"));
    expect(java).toContain('WidgetData.text(patron, "nameDayAfter")');
  });

  it("draws My saint's four-cell look only where its words have room (note 85)", () => {
    const base = read(path.join(JAVA_DIR, "widget/PurifyWidgetProvider.java"));
    // Both ways a size is chosen ask the family: Android 12 and newer, and before.
    expect(base).toContain("new SizeF(wideDp(), 100f)");
    expect(base).toContain("minWidth >= wideDp()");
    const saint = read(path.join(JAVA_DIR, "widget/MySaintWidgetProvider.java"));
    expect(saint).toMatch(/protected int wideDp\(\) \{\s*return WIDE_FROM_DP;\s*\}/);
    const from = Number(saint.match(/WIDE_FROM_DP = (\d+);/)?.[1]);
    // Beside the icon the words get the width less the padding, the icon and
    // the gap (widget_mysaint.xml): at least the 160dp the date and the days
    // chip need side by side. The mock gives them 204.
    const layout = read(path.join(LAYOUTS, "widget_mysaint.xml"));
    const pad = Number(layout.match(/android:id="@\+id\/widget_root"[\s\S]*?android:padding="(\d+)dp"/)?.[1]);
    const icon = Number(layout.match(/android:id="@\+id\/saint_icon"[\s\S]*?android:layout_width="(\d+)dp"/)?.[1]);
    const gap = Number(layout.match(/android:id="@\+id\/saint_icon"[\s\S]*?android:layout_marginEnd="(\d+)dp"/)?.[1]);
    expect([pad, icon, gap]).toEqual([12, 96, 14]);
    expect(from - 2 * pad - icon - gap).toBeGreaterThanOrEqual(160);
    // Three cells take the two-cell look: 203dp on the five-column phone
    // Android documents (73 x 3 - 16), up to about 295 on a four-column one.
    expect(from).toBeGreaterThan(295);
    // And the two-cell look stays within reach: the widget resizes below it.
    const info = read(path.join(MAIN, "res/xml/mysaint_widget_info.xml"));
    expect(Number(info.match(/android:minResizeWidth="(\d+)dp"/)?.[1])).toBeLessThan(from);
  });

  it("ends every line of My saint in an ellipsis, never a word lost unseen, and gives the name day's words the date's room (note 85)", () => {
    const looks = read(path.join(MAIN, "res/values/widget_looks.xml"));
    const style = (name: string) => {
      const block = looks.match(new RegExp(`<style name="${name}"[^>]*>([\\s\\S]*?)</style>`))?.[1] ?? "";
      const item = (attr: string) => block.match(new RegExp(`<item name="android:${attr}">([^<]+)</item>`))?.[1];
      return { maxLines: item("maxLines"), ellipsize: item("ellipsize") };
    };
    const files = fs.readdirSync(LAYOUTS).filter((f) => /^widget_mysaint(_small|_small_text)?\.xml$/.test(f)).sort();
    expect(files).toEqual(["widget_mysaint.xml", "widget_mysaint_small.xml", "widget_mysaint_small_text.xml"]);
    let seen = 0;
    for (const file of files) {
      const xml = read(path.join(LAYOUTS, file)).replace(/<!--[\s\S]*?-->/g, "");
      for (const m of xml.matchAll(/<TextView([\s\S]*?)\/>/g)) {
        seen++;
        const attrs = m[1];
        const own = (attr: string) => attrs.match(new RegExp(`android:${attr}="([^"]+)"`))?.[1];
        const styled = style(attrs.match(/style="@style\/(\w+)"/)?.[1] ?? "");
        const id = attrs.match(/android:id="@\+id\/(\w+)"/)?.[1];
        // A line count, and an ellipsis at its end: with maxLines alone a
        // word that does not fit wraps onto a line that is never drawn.
        expect(own("maxLines") ?? styled.maxLines, `${file} ${id}`).toBeTruthy();
        expect(own("ellipsize") ?? styled.ellipsize, `${file} ${id}`).toBe("end");
      }
    }
    expect(seen).toBe(9);
    // On the name day the chip says so, and the date gives up its room.
    const saint = read(path.join(JAVA_DIR, "widget/MySaintWidgetProvider.java"));
    expect(saint).toMatch(/if \(today\) \{[\s\S]*?setViewVisibility\(R\.id\.saint_date, View\.INVISIBLE\);/);
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

  it("shows every family in the picker as the mock draws it", () => {
    // The picker is where a reader decides whether to place a widget at all.
    // Without a preview it shows a grey box (Android 11 and older read
    // previewImage, Android 12 and newer previewLayout).
    const infos = [...read(MANIFEST).matchAll(/android:resource="@xml\/(\w+_widget_info)"/g)].map((m) => m[1]);
    expect(infos.length).toBeGreaterThan(1);
    for (const info of infos) {
      const xml = read(path.join(MAIN, `res/xml/${info}.xml`));
      const image = xml.match(/android:previewImage="@drawable\/(\w+)"/)?.[1];
      expect(image, `${info} has no previewImage`).toBeTruthy();
      expect(fs.existsSync(path.join(MAIN, `res/drawable-nodpi/${image}.webp`)), `${image}.webp`).toBe(true);
      const layout = xml.match(/android:previewLayout="@layout\/(\w+)"/)?.[1];
      expect(layout && fs.existsSync(path.join(LAYOUTS, `${layout}.xml`)), `${info}'s previewLayout`).toBe(true);
    }
  });

  it("has a picture for every season the day table can wear", () => {
    // The Mosaic widget finds a season's picture by its theme in
    // res/values/widget_families.xml, so the Java never names a feast. A
    // theme the table gains and that list lacks would show the plain cross
    // all season long, and nothing would say why.
    const table = buildDayTable(new Date(Date.UTC(2026, 9, 13, 12)), 400);
    const themes = new Set<string>();
    for (const entry of Object.values(table.days)) {
      for (const day of [entry.new, entry.old]) if (day.season) themes.add(day.season.theme);
    }
    expect(themes.size).toBeGreaterThan(3);

    const values = read(path.join(MAIN, "res/values/widget_families.xml"));
    const list = (tag: string, name: string) =>
      [...(values.match(new RegExp(`<${tag} name="${name}"[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "").matchAll(/<item>([^<]+)<\/item>/g)].map(
        (m) => m[1].trim(),
      );
    const named = list("string-array", "widget_art_themes");
    for (const theme of themes) expect(named, `no picture for the ${theme} season`).toContain(theme);
    for (const shape of ["widget_art_square", "widget_art_wide"]) {
      const pictures = list("array", shape);
      expect(pictures.length, `${shape} pairs one picture with each theme`).toBe(named.length);
      for (const picture of pictures) {
        const file = picture.replace("@drawable/", "");
        expect(fs.existsSync(path.join(MAIN, `res/drawable-nodpi/${file}.webp`)), `${file}.webp`).toBe(true);
      }
    }
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
