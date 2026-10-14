// The Mosaic pack's art engine, copied from the approved widgets mock:
// Homebase/boards/purify-master/widgets/widget-art.js, published beside
// https://claude.ai/artifact/EnMvUF5FChmFRpcFj6kjGL. The owner approved this
// art as is on 2026-10-10 and named it the Mosaic pack, so it is not
// restyled, recoloured or added to here. Everything under this header is the
// mock's file byte for byte (compare with: tail -n +14 on this file, diffed
// against the mock's). If the art ever changes, it changes in the mock first
// and is copied here again.
//
// scripts/emit-widget-art.mjs runs it in Chromium to bake the Android widget
// pictures, res/drawable-nodpi/mosaic_<theme>_<square|wide>.webp, so a phone
// shows a picture and never runs this code.

// Season art for the Purify widgets mock: every picture is a small mosaic,
// laid in rings around a point of light the way an apse mosaic is, with the
// season's sign set into it in lighter tesserae. Drawn on a canvas, same
// picture every load (seeded), no image files.
(function () {
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function ramp(stops, v) {
    v = Math.max(0, Math.min(0.9999, v)) * (stops.length - 1);
    var i = Math.floor(v);
    return mix(stops[i], stops[i + 1], v - i);
  }
  function css(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : a) + ")"; }

  // Shapes, each answering "is this point part of the sign".
  function cross(x, y, cx, cy, H) {
    var th = H * 0.06, dx = x - cx, dy = y - cy;
    if (Math.abs(dx) < th && Math.abs(dy) < H * 0.5) return true;
    if (Math.abs(dy + H * 0.36) < th && Math.abs(dx) < H * 0.13) return true;
    if (Math.abs(dy + H * 0.2) < th && Math.abs(dx) < H * 0.27) return true;
    if (Math.abs(dy - H * 0.22 - dx * 0.36) < th && Math.abs(dx) < H * 0.17) return true;
    return false;
  }
  function star8(x, y, cx, cy, R) {
    var dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    var long = Math.pow(Math.abs(Math.cos(2 * a)), 5);
    var short = Math.pow(Math.abs(Math.cos(2 * (a + Math.PI / 4))), 5) * 0.55;
    return r < R * (0.16 + 0.84 * Math.max(long, short));
  }
  function flame(x, y, cx, cy, R) {
    var dx = Math.abs(x - cx), dy = y - cy;
    if (dy >= 0) return dy < R && dx < R * Math.sqrt(1 - (dy / R) * (dy / R));
    var k = 1 + dy / (2.1 * R);
    return k > 0 && dx < R * Math.pow(k, 1.5);
  }

  var THEMES = {
    nativity: {
      stops: ["#050a1c", "#0c1a44", "#1b3a80", "#3f6fc4"], light: "#eef4ff", focal: [0.7, 0.3], rays: 0.2,
      sign: function (x, y, g) {
        if (star8(x, y, g.fx, g.fy, g.s * 0.2)) return 1;
        if (y > g.fy && Math.abs(x - g.fx) < g.s * 0.016 * (1 + (y - g.fy) / g.s * 3)) return 0.75;
        var hill = g.h * (0.82 + 0.07 * Math.sin(x / g.w * 5.2 + 1) + 0.03 * Math.sin(x / g.w * 13));
        if (y > hill) return -1;
        return 0;
      },
      specks: 26,
    },
    pascha: {
      stops: ["#3d070a", "#7a1217", "#b3262a", "#e8776a"], light: "#fff7f0", focal: [0.5, 0.44], rays: 0.34,
      sign: function (x, y, g) {
        if (cross(x, y, g.fx, g.fy, g.s * 0.5)) return 1;
        var r = Math.hypot(x - g.fx, y - g.fy);
        if (Math.abs(r - g.s * 0.37) < g.s * 0.018) return 0.8;
        return 0;
      },
      specks: 18,
    },
    lent: {
      stops: ["#0d0716", "#22113a", "#402063", "#6f45a8"], light: "#efe4ff", focal: [0.5, 0.4], rays: 0.14,
      sign: function (x, y, g) {
        if (cross(x, y, g.fx, g.fy, g.s * 0.5)) return 1;
        var d = Math.abs(((x + y) / g.s * 5) % 1 - 0.5);
        return d < 0.035 ? 0.22 : 0;
      },
      specks: 0,
    },
    theotokos: {
      stops: ["#071435", "#122d66", "#24509c", "#5c8fdb"], light: "#f1f6ff", focal: [0.5, 0.42], rays: 0.2,
      sign: function (x, y, g) {
        var R = g.s * 0.105;
        if (star8(x, y, g.fx, g.fy - g.s * 0.2, R)) return 1;
        if (star8(x, y, g.fx - g.s * 0.24, g.fy + g.s * 0.12, R)) return 1;
        if (star8(x, y, g.fx + g.s * 0.24, g.fy + g.s * 0.12, R)) return 1;
        var r = Math.hypot(x - g.fx, y - g.fy);
        if (Math.abs(r - g.s * 0.42) < g.s * 0.014) return 0.7;
        return 0;
      },
      specks: 10,
    },
    theophany: {
      stops: ["#031c28", "#073d55", "#0f6f88", "#58bccb"], light: "#ecfdff", focal: [0.5, 0.26], rays: 0.24,
      sign: function (x, y, g) {
        if (y < g.fy + g.s * 0.5 && y > g.fy && Math.abs(x - g.fx) < g.s * 0.03 * (1 + (y - g.fy) / g.s * 2.4)) return 0.9;
        if (Math.hypot(x - g.fx, y - g.fy) < g.s * 0.07) return 1;
        var base = g.h * 0.68;
        if (y > base) {
          var band = (y - base + Math.sin(x / g.w * 14) * g.s * 0.03) / (g.s * 0.07);
          return Math.floor(band) % 2 === 0 ? 0.55 : -0.4;
        }
        return 0;
      },
      specks: 0,
    },
    dawn: {
      stops: ["#120e24", "#33214f", "#7c3f66", "#d98a86"], light: "#fff3ec", focal: [0.5, 0.98], rays: 0.3,
      sign: function (x, y, g) {
        var r = Math.hypot(x - g.fx, y - g.fy);
        if (r < g.s * 0.2) return 1;
        return Math.abs(r - g.s * 0.34) < g.s * 0.012 ? 0.5 : 0;
      },
      specks: 0,
    },
    dusk: {
      stops: ["#04061a", "#0e1440", "#232a6e", "#5458ad"], light: "#f0f1ff", focal: [0.68, 0.3], rays: 0.12,
      sign: function (x, y, g) {
        var R = g.s * 0.15;
        var inMoon = Math.hypot(x - g.fx, y - g.fy) < R;
        var cut = Math.hypot(x - g.fx - R * 0.55, y - g.fy + R * 0.25) < R * 0.9;
        return inMoon && !cut ? 1 : 0;
      },
      specks: 22,
    },
    night: {
      stops: ["#08080a", "#121216", "#1f1f25", "#3a3a45"], light: "#f4f4f5", focal: [0.5, 0.5], rays: 0.12,
      sign: function (x, y, g) {
        if (cross(x, y, g.fx, g.fy, g.s * 0.58)) return 1;
        var r = Math.hypot(x - g.fx, y - g.fy);
        return Math.abs(r - g.s * 0.42) < g.s * 0.012 ? 0.45 : 0;
      },
      specks: 0,
    },
    lampada: {
      stops: ["#070607", "#170d0d", "#3a1512", "#8a2f22"], light: "#ffe6d8", focal: [0.5, 0.46], rays: 0.2,
      sign: function (x, y, g) {
        if (flame(x, y, g.fx, g.fy, g.s * 0.085)) return 1;
        var dy = y - (g.fy + g.s * 0.2), dx = Math.abs(x - g.fx);
        if (dy > 0 && dy < g.s * 0.13 && dx < g.s * 0.13 * Math.sqrt(Math.max(0, 1 - Math.pow(dy / (g.s * 0.13), 2)))) return 0.5;
        if (Math.abs(dy) < g.s * 0.012 && dx < g.s * 0.15) return 0.7;
        return 0;
      },
      specks: 0,
    },
  };

  function paint(canvas) {
    var theme = THEMES[canvas.dataset.paint];
    if (!theme) return;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var rand = rng(canvas.dataset.paint.length * 7919 + Math.round(w) * 31 + Math.round(h));
    var focal = (canvas.dataset.focal || "").split(",").map(Number);
    var fx = (focal.length === 2 && !isNaN(focal[0]) ? focal[0] : theme.focal[0]) * w;
    var fy = (focal.length === 2 && !isNaN(focal[1]) ? focal[1] : theme.focal[1]) * h;
    var s = Math.min(w, h) * (Number(canvas.dataset.scale) || 1);
    var g = { w: w, h: h, fx: fx, fy: fy, s: s };
    var stops = theme.stops.map(hex), light = hex(theme.light), dark = mix(stops[0], [0, 0, 0], 0.45);
    var reach = Math.max(Math.hypot(fx, fy), Math.hypot(w - fx, fy), Math.hypot(fx, h - fy), Math.hypot(w - fx, h - fy));

    ctx.fillStyle = css(mix(stops[0], [0, 0, 0], 0.35));
    ctx.fillRect(0, 0, w, h);

    // The tesserae, ring by ring out from the light.
    var t = Math.max(4.2, Math.min(w, h) / 24), gap = t * 0.11;
    for (var r = 0; r < reach + t; r += t) {
      var n = Math.max(6, Math.round((2 * Math.PI * (r + t / 2)) / t));
      var off = rand() * Math.PI * 2, da = (2 * Math.PI) / n, ga = r > 0 ? gap / (r + t / 2) : 0.05;
      for (var i = 0; i < n; i++) {
        var a0 = off + i * da + ga, a1 = off + (i + 1) * da - ga, am = (a0 + a1) / 2, rm = r + t / 2;
        var x = fx + Math.cos(am) * rm, y = fy + Math.sin(am) * rm;
        if (x < -t || y < -t || x > w + t || y > h + t) { rand(); continue; }
        var v = 1 - (rm / reach) * 1.15 + (rand() - 0.5) * 0.3;
        var col = ramp(stops, v), m = theme.sign(x, y, g);
        if (m > 0) col = mix(col, light, m * (0.82 + rand() * 0.18));
        else if (m < 0) col = mix(col, dark, -m * (0.75 + rand() * 0.25));
        var j = t * 0.07, r0 = r + gap + (rand() - 0.5) * j, r1 = r + t - gap + (rand() - 0.5) * j;
        ctx.beginPath();
        ctx.moveTo(fx + Math.cos(a0) * r0, fy + Math.sin(a0) * r0);
        ctx.lineTo(fx + Math.cos(a0) * r1, fy + Math.sin(a0) * r1);
        ctx.lineTo(fx + Math.cos(a1) * r1, fy + Math.sin(a1) * r1);
        ctx.lineTo(fx + Math.cos(a1) * r0, fy + Math.sin(a1) * r0);
        ctx.closePath();
        ctx.fillStyle = css(col);
        ctx.fill();
      }
    }

    // Light: rays, a soft bloom at the point, small sparks where the theme has them.
    ctx.globalCompositeOperation = "lighter";
    var rays = 16;
    for (var k = 0; k < rays; k++) {
      var ang = (k / rays) * Math.PI * 2 + 0.2, wid = (k % 2 ? 0.05 : 0.1);
      var grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, reach);
      grad.addColorStop(0, css(light, theme.rays));
      grad.addColorStop(0.55, css(light, theme.rays * 0.25));
      grad.addColorStop(1, css(light, 0));
      ctx.beginPath(); ctx.moveTo(fx, fy);
      ctx.arc(fx, fy, reach, ang - wid, ang + wid); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
    }
    var bloom = ctx.createRadialGradient(fx, fy, 0, fx, fy, s * 0.55);
    bloom.addColorStop(0, css(light, 0.42)); bloom.addColorStop(0.35, css(light, 0.12)); bloom.addColorStop(1, css(light, 0));
    ctx.fillStyle = bloom; ctx.fillRect(0, 0, w, h);
    for (var p = 0; p < theme.specks; p++) {
      var sx = rand() * w, sy = rand() * h * 0.8, sr = 0.5 + rand() * 1.1;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = css(light, 0.35 + rand() * 0.5); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    // Depth: darker toward the edges, and toward the foot when words sit there.
    var vig = ctx.createRadialGradient(fx, fy, s * 0.3, fx, fy, reach);
    vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
    var shade = Number(canvas.dataset.shade || 0);
    if (shade) {
      var foot = ctx.createLinearGradient(0, h * (1 - shade), 0, h);
      foot.addColorStop(0, "rgba(0,0,0,0)"); foot.addColorStop(1, "rgba(0,0,0,0.78)");
      ctx.fillStyle = foot; ctx.fillRect(0, 0, w, h);
    }
  }

  function paintAll() { Array.prototype.forEach.call(document.querySelectorAll("canvas[data-paint]"), paint); }
  window.PurifyArt = { paintAll: paintAll };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paintAll); else paintAll();
  var timer = 0;
  window.addEventListener("resize", function () { clearTimeout(timer); timer = setTimeout(paintAll, 150); });
})();
