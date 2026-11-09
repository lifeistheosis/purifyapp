// The motion of the promo clips (scripts/promo/README.md), run inside a
// look's page: the Web Animations API, paused, and set to each frame's time
// by window.__seek(ms), so a clip is the same every time it is made.
//
// "In" moves (rise, reveal, focus) end on the still itself: once the last
// move is over every animation lets go, and the frames that follow are the
// still, which check-ends.mjs proves. "Through" moves (push, float) start
// and end mid-move, so a clip can be cut anywhere.

export const VARIANTS = ["rise", "reveal", "focus", "push", "float"];

/**
 * A year's own move (the edit frames' 33, 325, 330, 1917): its digits count
 * up into place, each spinning and landing in turn, the echoes opening out
 * from the landed year, the label after. The owner's "number switching",
 * always at the centre (edits.mjs).
 */
export const YEAR_VARIANTS = ["count", ...VARIANTS];

export const MOTION = String.raw`
(() => {
  const E = { out: "cubic-bezier(.16,1,.3,1)", inout: "cubic-bezier(.65,0,.35,1)", soft: "cubic-bezier(.33,1,.68,1)", linear: "linear" };
  const $ = (s, root = document) => [...root.querySelectorAll(s)];
  const anims = [];
  const add = (el, keyframes, o) => { const a = el.animate(keyframes, { fill: "both", ...o }); a.pause(); anims.push(a); return a; };

  // Lines of a heading, each in its own window, laid out exactly as before.
  // The windows reach past the line above and below (for ascenders and
  // descenders) with padding that negative margins take back; as a flex
  // column those margins add up instead of collapsing into each other.
  const lines = (el) => {
    if (!el.dataset.lined) {
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map((p) =>
        '<span class="ln" style="display:block;overflow:hidden;padding:.24em .12em .32em;margin:-.24em -.12em -.32em"><span style="display:block">' + p + "</span></span>").join("");
      el.dataset.lined = "1";
    }
    return $(".ln > span", el);
  };

  // What a move rebuilt (a year's digits), put back when it settles.
  const restores = [];

  // A year's digits, each in a window of its own width, spinning down a strip
  // of digits and landing on its own. Clipped above and below only, so the
  // glow stays whole beside it. Returns when the last digit lands.
  const roll = (el, start) => {
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight);
    const orig = el.innerHTML, origStyle = el.getAttribute("style");
    restores.push(() => { el.innerHTML = orig; el.setAttribute("style", origStyle); });
    const text = el.textContent.trim();
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre";
    el.appendChild(probe);
    const widths = [...text].map((ch) => { probe.textContent = ch; return probe.getBoundingClientRect().width; });
    probe.remove();
    const pad = Math.round(lh * 0.45);
    // The rows above and below fade out where their windows end: the year's
    // box grows by the windows' reach (its place on the screen unchanged)
    // and a soft mask runs to nothing at its edges.
    el.style.top = parseFloat(cs.top) - pad + "px";
    el.style.paddingTop = el.style.paddingBottom = pad + "px";
    el.style.webkitMaskImage = el.style.maskImage = "linear-gradient(180deg, transparent 0, #000 " + Math.round(pad * 0.85) + "px, #000 calc(100% - " + Math.round(pad * 0.85) + "px), transparent 100%)";
    el.innerHTML = [...text].map((ch, i) => {
      if (!/\d/.test(ch)) return ch;
      const d = Number(ch);
      const seq = Array.from({ length: 10 + i * 5 }, (_, k) => (d + 1 + k) % 10).concat([d]);
      // content-box: the window is a line tall inside its padding, whatever the page's box-sizing.
      return '<span class="dg" style="display:inline-block;box-sizing:content-box;position:relative;vertical-align:top;width:' + widths[i] + 'px;height:' + lh + 'px;padding:' + pad + 'px 0;margin:-' + pad + 'px 0;overflow-x:visible;overflow-y:clip">' +
        '<span class="strip" style="position:absolute;left:50%;top:' + pad + 'px;translate:-50% 0;white-space:pre">' +
        seq.map((x) => '<span style="display:block;height:' + lh + 'px;line-height:' + lh + 'px;text-align:center">' + x + "</span>").join("") + "</span></span>";
    }).join("");
    let landed = start;
    [...el.querySelectorAll(".strip")].forEach((strip, i) => {
      const n = strip.children.length - 1, duration = 650 + i * 150;
      add(strip, [
        { transform: "translateY(0)", filter: "blur(0px)", opacity: 0 },
        { opacity: 1, offset: 0.12 },
        { filter: "blur(9px)", offset: 0.22 },
        { filter: "blur(3px)", offset: 0.72 },
        { transform: "translateY(" + -n * lh + "px)", filter: "blur(0px)" },
      ], { duration, delay: start, easing: "cubic-bezier(.22,.8,.26,1)" });
      landed = Math.max(landed, start + duration);
    });
    return landed;
  };

  // The edit frames' rings, dust, echoes and streak, in each move.
  const ringsIn = (delay) => $("[data-m=ring]").forEach((el, i) => add(el, [{ opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }], { duration: 1000, delay: delay + i * 110, easing: E.out }));
  const dustIn = (delay) => $("[data-m=dust]").forEach((el, i) => add(el, [{ scale: 0, translate: "0 34px" }, { scale: 1, translate: "0 0" }], { duration: 900, delay: delay + ((i * 37) % 600), easing: E.out }));
  const echoesIn = (delay, far = 120) => {
    const main = document.querySelector(".num:not(.echo)");
    const mid = main ? main.getBoundingClientRect().top : innerHeight / 2;
    $("[data-m=echo]").forEach((el) => {
      const up = el.getBoundingClientRect().top < mid;
      add(el, [{ opacity: 0, translate: "0 " + (up ? far : -far) + "px" }, { opacity: 1, translate: "0 0" }], { duration: 850, delay, easing: E.out });
    });
  };
  const flareIn = (delay) => $("[data-m=flare]").forEach((el) => add(el, [{ opacity: 0, scale: "0.2 1" }, { opacity: 1, scale: "1 1" }], { duration: 1100, delay, easing: E.out }));

  // Everything but the grain moves together under one camera.
  const frame = document.querySelector(".frame");
  const cam = document.createElement("div");
  cam.className = "cam";
  cam.style.cssText = "position:absolute;inset:0;transform-origin:50% 50%";
  for (const child of [...frame.children]) if (child.dataset.m !== "grain") cam.appendChild(child);
  frame.insertBefore(cam, frame.firstChild);
  const grains = $("[data-m=grain]");

  // A light passing over each phone's glass, there only while it passes.
  const glints = [];
  const glint = (delay, duration = 900) => $(".phone .screen").forEach((screen, i) => {
    const g = document.createElement("div");
    g.style.cssText = "position:absolute;inset:-10% -60%;pointer-events:none;mix-blend-mode:screen;background:linear-gradient(104deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.13) 49%, rgba(255,255,255,.04) 53%, rgba(255,255,255,0) 60%);translate:-80% 0";
    screen.appendChild(g);
    const from = delay + i * 90;
    glints.push({ g, from, to: from + duration });
    add(g, [{ translate: "-80% 0" }, { translate: "80% 0" }], { duration, delay: from, easing: E.inout });
  });

  const words = $("[data-m=h1], [data-m=echo], [data-m=eyebrow], [data-m=sub], [data-m=caption], [data-m=rule], [data-m=lockup]");
  for (const r of $("[data-m=rule]")) r.style.transformOrigin = "0 50%";

  let settles = false;
  window.__setup = (variant) => {
    settles = variant === "rise" || variant === "reveal" || variant === "focus" || variant === "count";
    if (variant === "rise") {
      $("[data-m=bg]").forEach((el) => add(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: E.soft }));
      $("[data-m=numeral]").forEach((el) => add(el, [{ opacity: 0, translate: "0 90px" }, { opacity: 1, translate: "0 0" }], { duration: 1400, easing: E.out }));
      $("[data-m=art]").forEach((el) => add(el, [{ opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1 }], { duration: 1100, easing: E.out }));
      $("[data-m=screen]").forEach((el) => add(el, [{ opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1 }], { duration: 1300, easing: E.out }));
      $("[data-m=eyebrow]").forEach((el) => add(el, [{ opacity: 0, translate: "0 22px" }, { opacity: 1, translate: "0 0" }], { duration: 700, delay: 120, easing: E.out }));
      let n = 0;
      $("[data-m=h1]").forEach((el) => lines(el).forEach((ln) => add(ln, [{ translate: "0 150%" }, { translate: "0 0" }], { duration: 950, delay: 220 + 110 * n++, easing: E.out })));
      $("[data-m=rule]").forEach((el) => add(el, [{ scale: "0 1" }, { scale: "1 1" }], { duration: 700, delay: 560, easing: E.out }));
      $("[data-m=sub], [data-m=caption]").forEach((el) => add(el, [{ opacity: 0, translate: "0 18px" }, { opacity: 1, translate: "0 0" }], { duration: 700, delay: 640, easing: E.out }));
      $("[data-m=phone]").forEach((el) => add(el, [{ opacity: 0, translate: "0 170px" }, { opacity: 1, translate: "0 0" }], { duration: 1150, delay: 340, easing: E.out }));
      $("[data-m=side]").forEach((el, i) => add(el, [{ opacity: 0, translate: (i ? 130 : -130) + "px 70px" }, { opacity: 1, translate: "0 0" }], { duration: 1100, delay: 540, easing: E.out }));
      $("[data-m=lockup]").forEach((el) => add(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 1100, easing: E.soft }));
      ringsIn(260);
      dustIn(80);
      echoesIn(520);
      flareIn(300);
    } else if (variant === "reveal") {
      $("[data-m=bg]").forEach((el) => add(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: E.soft }));
      $("[data-m=numeral]").forEach((el) => add(el, [{ opacity: 0, translate: "120px 0" }, { opacity: 1, translate: "0 0" }], { duration: 1400, easing: E.out }));
      $("[data-m=art]").forEach((el) => add(el, [{ clipPath: "inset(calc(100% + 24px) -24px -24px -24px)" }, { clipPath: "inset(-24px -24px -24px -24px)" }], { duration: 1000, delay: 80, easing: E.inout }));
      $("[data-m=screen]").forEach((el) => add(el, [{ opacity: 0, translate: "0 60px" }, { opacity: 1, translate: "0 0" }], { duration: 1200, easing: E.out }));
      $("[data-m=eyebrow]").forEach((el) => add(el, [{ clipPath: "inset(-30% 100% -30% 0)" }, { clipPath: "inset(-30% 0% -30% 0)" }], { duration: 700, delay: 100, easing: E.inout }));
      let n = 0;
      $("[data-m=h1]").forEach((el) => lines(el).forEach((ln) => add(ln, [{ clipPath: "inset(-30% 104% -40% -4%)", translate: "-28px 0" }, { clipPath: "inset(-30% -4% -40% -4%)", translate: "0 0" }], { duration: 900, delay: 200 + 150 * n++, easing: E.inout })));
      $("[data-m=rule]").forEach((el) => add(el, [{ scale: "0 1" }, { scale: "1 1" }], { duration: 700, delay: 640, easing: E.inout }));
      $("[data-m=sub], [data-m=caption]").forEach((el) => add(el, [{ opacity: 0, translate: "0 12px" }, { opacity: 1, translate: "0 0" }], { duration: 700, delay: 820, easing: E.out }));
      $("[data-m=phone]").forEach((el) => add(el, [{ opacity: 0, translate: "280px 0", rotate: "7deg" }, { opacity: 1, translate: "0 0", rotate: "0deg" }], { duration: 1250, delay: 260, easing: E.out }));
      $("[data-m=side]").forEach((el, i) => add(el, [{ opacity: 0, translate: (i ? 220 : -220) + "px 0" }, { opacity: 1, translate: "0 0" }], { duration: 1150, delay: 420, easing: E.out }));
      $("[data-m=lockup]").forEach((el) => add(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 1200, easing: E.soft }));
      ringsIn(420);
      dustIn(200);
      echoesIn(700, 60);
      $("[data-m=flare]").forEach((el) => add(el, [{ opacity: 0, translate: "-45% 0" }, { opacity: 1, translate: "0 0" }], { duration: 1200, delay: 200, easing: E.inout }));
      glint(900, 750);
    } else if (variant === "focus") {
      add(cam, [{ filter: "blur(26px)", scale: 1.07, opacity: 0 }, { filter: "blur(10px)", scale: 1.035, opacity: 1, offset: 0.35 }, { filter: "blur(0px)", scale: 1, opacity: 1 }], { duration: 1500, easing: E.soft });
      words.forEach((el, i) => add(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 650, delay: 820 + i * 70, easing: E.soft }));
      glint(1000, 700);
    } else if (variant === "push") {
      // Depth, not zoom: the ground moves most, the phones less, the words least, the mark not at all.
      $("[data-m=bg], [data-m=numeral]").forEach((el) => add(el, [{ scale: 1 }, { scale: 1.07 }], { duration: 2000, easing: E.linear }));
      $("[data-m=phone], [data-m=screen], [data-m=art]").forEach((el) => add(el, [{ scale: 1, translate: "0 0" }, { scale: 1.045, translate: "0 -22px" }], { duration: 2000, easing: E.linear }));
      $("[data-m=side]").forEach((el, i) => add(el, [{ scale: 1, translate: "0 0" }, { scale: 1.03, translate: (i ? 14 : -14) + "px -12px" }], { duration: 2000, easing: E.linear }));
      $("[data-m=h1], [data-m=eyebrow], [data-m=sub], [data-m=caption], [data-m=rule]").forEach((el) => add(el, [{ translate: "0 0" }, { translate: "0 -9px" }], { duration: 2000, easing: E.linear }));
      $("[data-m=ring]").forEach((el) => add(el, [{ scale: 1 }, { scale: 1.07 }], { duration: 2000, easing: E.linear }));
      $("[data-m=dust]").forEach((el, i) => add(el, [{ translate: "0 0" }, { translate: (i % 2 ? 6 : -6) + "px -40px" }], { duration: 2000, easing: E.linear }));
      $("[data-m=echo]").forEach((el) => add(el, [{ translate: "0 0" }, { translate: "0 -16px" }], { duration: 2000, easing: E.linear }));
      $("[data-m=flare]").forEach((el) => add(el, [{ translate: "-30px 0" }, { translate: "30px 0" }], { duration: 2000, easing: E.linear }));
      glint(450, 1000);
    } else if (variant === "float") {
      const wave = (a, b) => [0, 0.25, 0.5, 0.75, 1].map((o, k) => ({ offset: o, ...(k % 2 ? b : a) }));
      $("[data-m=phone], [data-m=screen]").forEach((el) => add(el, wave({ translate: "0 10px", rotate: "-0.5deg" }, { translate: "0 -10px", rotate: "0.5deg" }), { duration: 2000, easing: E.inout }));
      $("[data-m=side]").forEach((el, i) => add(el, wave({ translate: "0 -8px" }, { translate: "0 8px" }), { duration: 2000, delay: -250 * (i + 1), easing: E.inout }));
      $("[data-m=art]").forEach((el) => add(el, wave({ translate: "0 6px" }, { translate: "0 -6px" }), { duration: 2000, easing: E.inout }));
      $("[data-m=bg]").forEach((el) => add(el, [{ opacity: 0.85 }, { opacity: 1, offset: 0.5 }, { opacity: 0.85 }], { duration: 2000, easing: E.inout }));
      $("[data-m=ring]").forEach((el, i) => add(el, wave({ scale: 1 }, { scale: 1.03 }), { duration: 2000, delay: -180 * i, easing: E.inout }));
      $("[data-m=dust]").forEach((el, i) => add(el, wave({ translate: "0 0" }, { translate: (i % 2 ? 5 : -5) + "px -12px" }), { duration: 2000, delay: -((i * 53) % 900), easing: E.inout }));
      glint(300, 1300);
    } else if (variant === "count") {
      $("[data-m=bg], [data-m=screen], [data-m=art]").forEach((el) => add(el, [{ opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1 }], { duration: 1200, easing: E.out }));
      // Everything lands by 1.75s, so the last frames hold the still.
      let landed = 700;
      $(".num[data-m=h1]").forEach((el) => { landed = Math.max(landed, roll(el, 100)); });
      $("[data-m=echo]").forEach((el) => {
        const up = el.getBoundingClientRect().top < innerHeight / 2;
        add(el, [{ opacity: 0, translate: "0 " + (up ? 140 : -140) + "px" }, { opacity: 1, translate: "0 0" }], { duration: 650, delay: landed - 200, easing: E.out });
      });
      $("[data-m=ring]").forEach((el, i) => add(el, [{ opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }], { duration: 600, delay: landed - 250 + i * 80, easing: E.out }));
      dustIn(0);
      $("[data-m=eyebrow], [data-m=caption]").forEach((el) => add(el, [{ opacity: 0, translate: "0 16px" }, { opacity: 1, translate: "0 0" }], { duration: 520, delay: landed - 80, easing: E.out }));
      $("[data-m=flare]").forEach((el) => add(el, [{ opacity: 0, scale: "0.2 1" }, { opacity: 1, scale: "1 1" }], { duration: 700, delay: landed - 250, easing: E.out }));
    }
  };

  // Film grain moves every frame, as grain does; the rest is set to the moment.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let settled = false;
  const end = () => Math.max(0, ...anims.map((a) => { const t = a.effect.getComputedTiming(); return t.endTime; }));
  window.__seek = (ms) => {
    if (settles && !settled && ms >= end()) {
      // Held end states are drawn on layers of their own, a hair apart from
      // the still: let them go, so the last frames are the still exactly.
      for (const a of anims) a.cancel();
      for (const r of restores) r();
      settled = true;
    }
    if (!settled) for (const a of anims) a.currentTime = ms;
    for (const { g, from, to } of glints) g.style.display = ms >= from && ms <= to ? "" : "none";
    for (const g of grains) g.style.backgroundPosition = Math.round(rand() * 320) + "px " + Math.round(rand() * 320) + "px";
  };
})();
`;
