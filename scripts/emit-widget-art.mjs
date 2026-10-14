// Bake the Mosaic pack into pictures for the Android home screen widgets.
//
// The art is the approved mock's own engine, scripts/widget-art/widget-art.js,
// run unchanged in Playwright's Chromium on a page this script builds itself
// (no server, no network). Each picture is the canvas the engine paints,
// saved with canvas.toDataURL("image/webp"), so the phone shows a picture and
// never runs the engine (docs/WIDGETS.md, section 4).
//
// The sizes are the mock's own canvases, so the pictures are the mock's
// pictures: the engine seeds its tiles from the theme and the canvas's CSS
// size, and sizes its tiles from that size too. Square is the canvas of the
// mock's small art widgets (158 x 158), wide the one of its Android 4 x 2 art
// widget (330 x 150, 2.2:1). Both are drawn at 3x (the engine's own ceiling),
// sharp on a phone for a 2x2 widget of about 160 dp and a 4x2 of about
// 340 x 160 dp. Where the mock draws a theme at that size with the same
// settings, the picture is the mock's tile for tile. The wide size is also
// the one where every sign lights as many tiles as in the approved small
// widgets: at the iPhone medium's 338 x 158 the Dormition's right-hand star
// caught only 3 tiles, against 6 to 8 for each star in the small one.
//
// Words sit on the picture's foot, which the engine itself shades
// (data-shade), exactly as the mock does. Nothing is added over the engine.
//
// Pray now's quiet state ("Prayed today") is the mock's dawn picture under a
// CSS filter. It is baked as mosaic_<dawn|dusk>_quiet_<shape>.webp: the same
// filter, run by the canvas's own filter over the engine's picture, so the
// widget draws a plain picture and applies nothing.
//
// With --previews it also makes the widget picker's still pictures for phones
// older than Android 12: element shots of the mock's own drawn widgets at 2x,
// one per family. The mock lives outside the repo, so its path is an
// argument; its Google Fonts link is answered from the Lora and DM Sans files
// a local `next dev` run has already downloaded (.next/dev/static), so that
// step needs no network either.
//
// Usage:
//   node scripts/emit-widget-art.mjs
//   node scripts/emit-widget-art.mjs --previews [path/to/widgets.html]
// Options: --out <dir>, --fonts <.next/dev/static>, --playwright <index.mjs>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Worktrees carry no node_modules, so Playwright comes from the main checkout,
// by absolute path, as the board's other shot scripts do.
const MAIN = "C:/Users/Edgar/Homebase/projects/orthoapp";
const MOCK = "C:/Users/Edgar/Homebase/boards/purify-master/widgets/widgets.html";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : fallback;
};
const OUT = path.resolve(opt("--out", path.join(REPO, "android/app/src/main/res/drawable-nodpi")));
const PLAYWRIGHT = opt("--playwright", `${MAIN}/node_modules/playwright/index.mjs`);
const FONTS = opt("--fonts", `${MAIN}/.next/dev/static`);
const PREVIEWS = args.includes("--previews") ? opt("--previews", MOCK) : null;
const ENGINE = path.join(REPO, "scripts/widget-art/widget-art.js");

const QUALITY = 0.86;
const DENSITY = 3;
const SIZES = { square: [158, 158], wide: [330, 150] };

// Where each theme's sign sits (focal, as a share of width and height) and how
// much of the foot the engine shades. A missing focal is the theme's own, as
// in the mock. "mock:" names the widget a value is read from. The wide ones
// the mock does not draw put the sign where its wide art does (about 0.74
// across, as the Pascha medium), at the height of the theme's own small
// widget, with the 0.7 shade every wide art widget in the mock has. Night and
// lampada are the pure designs: no words in the mock, so no shaded foot, the
// sign alone and centred, as drawn. Their foot is near black all the same.
const ART = {
  pascha: {
    // No small Pascha in the mock: its small siblings' layout (lent and
    // theotokos: centred, 0.55 shade), set 0.04 lower so the ring of light
    // round the cross stays whole.
    square: { focal: [0.5, 0.4], shade: 0.55 },
    wide: { focal: [0.74, 0.46], shade: 0.7 }, // mock: Pascha, iPhone medium (its settings)
  },
  nativity: {
    square: { focal: [0.66, 0.3], shade: 0.6 }, // mock: Nativity
    wide: { focal: [0.74, 0.3], shade: 0.7 },
  },
  theophany: {
    square: { shade: 0.5 }, // mock: Theophany
    wide: { focal: [0.74, 0.26], shade: 0.7 },
  },
  theotokos: {
    square: { focal: [0.5, 0.36], shade: 0.55 }, // mock: Dormition
    // 0.78, not 0.74: three stars spread far wider than a cross, and at 0.74
    // the left one meets the first line of "Dormition of the Theotokos".
    wide: { focal: [0.78, 0.36], shade: 0.7 },
  },
  lent: {
    square: { focal: [0.5, 0.36], shade: 0.55 }, // mock: Great Lent
    wide: { focal: [0.74, 0.36], shade: 0.7 },
  },
  night: { square: {}, wide: {} }, // mock: Pure design, the cross
  lampada: { square: {}, wide: {} }, // mock: Pure design, the lampada
  dawn: {
    square: { focal: [0.74, 0.26], shade: 0.62 }, // mock: Pray now, iPhone small, morning
    wide: { focal: [0.82, 0.3], shade: 0.7 }, // mock: Pray now, Android 4 x 2
  },
  dusk: {
    square: { shade: 0.62 }, // mock: Pray now, iPhone small, evening
    wide: { focal: [0.8, 0.3], shade: 0.7 }, // mock: Pray now, iPhone medium, and the Android lock screen
  },
};

// The quiet state: the filter on the mock's "After you have prayed" widget,
// over the hour's pictures at both shapes.
const QUIET = { filter: "saturate(.35) brightness(.7)", themes: ["dawn", "dusk"] };

// The picker previews: one drawn widget per family, Android's own where the
// mock has one, else its iPhone medium.
const PREVIEW_SHOTS = {
  verse: 'section[data-pick="verse"] .w.and.a42',
  today: 'section[data-pick="church"] .w.and.a42',
  pray: 'section[data-pick="pray"] .w.and.a42',
  streak: 'section[data-pick="streak"] .w.and.a22',
  countdown: 'section[data-pick="countdown"] .w.and.a22',
  // The Android widget in the My saint section is the day's saint (Today in
  // the Church), not My saint, so this family uses its iPhone medium. Shown as
  // its text version: the icon's rights are not cleared
  // (lib/saints/iconRights.ts), and docs/WIDGETS.md lets only cleared icons
  // onto a widget.
  mysaint: 'section[data-pick="mysaint"] .w.ios.m',
  mosaic: 'section[data-pick="season"] .w.ios.m.arted',
};
const NO_ICON = new Set(["mysaint"]);

const { chromium } = await import(pathToFileURL(PLAYWRIGHT).href);
const browser = await chromium.launch();
const written = [];

const save = (name, dataUrl, size) => {
  const head = "data:image/webp;base64,";
  if (!dataUrl.startsWith(head)) throw new Error(`${name}: Chromium did not encode WebP`);
  const file = path.join(OUT, `${name}.webp`);
  fs.writeFileSync(file, Buffer.from(dataUrl.slice(head.length), "base64"));
  written.push({ file, size, bytes: fs.statSync(file).size });
};

try {
  fs.mkdirSync(OUT, { recursive: true });

  // 1. The Mosaic pictures.
  const canvases = [];
  for (const [theme, shapes] of Object.entries(ART)) {
    for (const [shape, set] of Object.entries(shapes)) {
      const [w, h] = SIZES[shape];
      const attrs = [`data-paint="${theme}"`, `data-shape="${shape}"`, `data-name="mosaic_${theme}_${shape}"`];
      if (set.focal) attrs.push(`data-focal="${set.focal.join(",")}"`);
      if (set.shade) attrs.push(`data-shade="${set.shade}"`);
      canvases.push(`<canvas ${attrs.join(" ")} style="width:${w}px;height:${h}px"></canvas>`);
    }
  }
  const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}canvas{display:block}</style>
${canvases.join("\n")}
<script>${fs.readFileSync(ENGINE, "utf8")}</script>`;

  const ctx = await browser.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: DENSITY });
  await ctx.route("**/*", (route) => route.abort());
  const page = await ctx.newPage();
  await page.setContent(html);
  const art = await page.evaluate(
    ({ q, quiet }) => {
      window.PurifyArt.paintAll();
      const out = [];
      for (const c of document.querySelectorAll("canvas[data-name]")) {
        out.push({ name: c.dataset.name, size: [c.width, c.height], data: c.toDataURL("image/webp", q) });
        if (!quiet.themes.includes(c.dataset.paint)) continue;
        const d = document.createElement("canvas");
        d.width = c.width;
        d.height = c.height;
        const g = d.getContext("2d");
        g.filter = quiet.filter;
        g.drawImage(c, 0, 0);
        out.push({ name: `mosaic_${c.dataset.paint}_quiet_${c.dataset.shape}`, size: [d.width, d.height], data: d.toDataURL("image/webp", q) });
      }
      return out;
    },
    { q: QUALITY, quiet: QUIET },
  );
  for (const a of art) save(a.name, a.data, a.size);
  await ctx.close();

  // 2. The picker previews, from the mock itself.
  if (PREVIEWS) {
    const chunks = path.join(FONTS, "chunks");
    const names = fs.existsSync(chunks) ? fs.readdirSync(chunks) : [];
    let fontCss = "";
    for (const family of ["lora", "dm_sans"]) {
      const file = names.find((n) => n.includes(`font_google_${family}_`) && n.endsWith(".css"));
      if (!file) throw new Error(`No ${family} font in ${FONTS}. Run the app's dev server once, or pass --fonts.`);
      fontCss += fs.readFileSync(path.join(chunks, file), "utf8").replace(/url\("\.\.\/media\/([^"]+)"\)/g, 'url("https://fonts.local/$1")');
    }

    const ctx2 = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2, colorScheme: "dark" });
    await ctx2.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.protocol === "file:") return route.continue();
      if (u.host === "fonts.googleapis.com") return route.fulfill({ status: 200, contentType: "text/css", body: fontCss });
      if (u.host === "fonts.local") {
        const font = path.join(FONTS, "media", path.basename(decodeURIComponent(u.pathname)));
        return route.fulfill({ status: 200, contentType: "font/woff2", headers: { "access-control-allow-origin": "*" }, path: font });
      }
      return route.abort();
    });
    const mock = await ctx2.newPage();
    await mock.goto(pathToFileURL(path.resolve(PREVIEWS)).href);
    await mock.evaluate(() => document.fonts.ready);
    const loaded = await mock.evaluate(() => Array.from(document.fonts).filter((f) => f.status === "loaded").map((f) => f.family));
    for (const family of ["Lora", "DM Sans"]) if (!loaded.includes(family)) throw new Error(`${family} did not load for the previews`);

    const conv = await ctx2.newPage();
    for (const [family, selector] of Object.entries(PREVIEW_SHOTS)) {
      const el = await mock.$(selector);
      if (!el) throw new Error(`No widget for ${family} in the mock (${selector})`);
      // Lift the widget off its wallpaper so its rounded corners come out
      // clear, and onto whole pixels (the page sets it at fractions of one,
      // which would cost the shot an extra row); the widget itself is drawn
      // as the mock draws it.
      await el.evaluate((node, noIcon) => {
        for (let n = node.parentElement; n; n = n.parentElement) n.style.background = "transparent";
        node.style.boxShadow = "none";
        if (noIcon) node.querySelectorAll("img").forEach((img) => (img.style.display = "none"));
        const r = node.getBoundingClientRect();
        const x = r.left + scrollX, y = r.top + scrollY;
        if (getComputedStyle(node).position === "static") node.style.position = "relative";
        node.style.left = `${Math.round(x) - x}px`;
        node.style.top = `${Math.round(y) - y}px`;
      }, NO_ICON.has(family));
      await mock.evaluate(() => window.PurifyArt && window.PurifyArt.paintAll());
      const png = await el.screenshot({ omitBackground: true, animations: "disabled" });
      const shot = await conv.evaluate(
        async ({ b64, q }) => {
          const img = new Image();
          img.src = "data:image/png;base64," + b64;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext("2d").drawImage(img, 0, 0);
          return { size: [c.width, c.height], data: c.toDataURL("image/webp", q) };
        },
        { b64: png.toString("base64"), q: QUALITY },
      );
      save(`widget_preview_${family}`, shot.data, shot.size);
    }
    await ctx2.close();
  }
} finally {
  await browser.close();
}

let total = 0;
for (const { file, size, bytes } of written) {
  total += bytes;
  const rel = path.relative(REPO, file);
  const shown = rel.startsWith("..") || path.isAbsolute(rel) ? file : rel;
  console.log(`${shown.replaceAll("\\", "/")}  ${size[0]}x${size[1]}  ${bytes} B`);
}
console.log(`${written.length} files, ${total} B (${(total / 1024 / 1024).toFixed(2)} MB)`);
