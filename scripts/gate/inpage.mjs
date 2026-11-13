// What the gate's motion checks measure inside the page (the arbiter, 2026-11-13,
// after build 95 notes 5 and 7). One function, put into every document a walk
// opens (installGate, an init script), so a measure can be taken from Node at
// any moment and from the page itself frame by frame. It defines window.__gate:
//
//   layers(o)    the floating layers on the screen (fixed or stuck boxes, the
//                top layer, a popover) and where two of them meet
//                (scripts/gate/layers.mjs)
//   edge(o)      what is cut at the screen's edge or spills sideways, against
//                the width asked for, never innerWidth (scripts/gate/page-edge.mjs)
//   sample(o)    from now on, every frame: the page's running animations, its
//                layout shifts, and anything new drawn at one place and then
//                another (scripts/gate/frames.mjs); stop() hands them over.
//
// Self-contained: it is serialised into the page, so it reads nothing from
// this module. It changes nothing the app can see, save one style element of
// its own for the length of one hit test (layers: what is in front).

export function gateInPage() {
  if (window.__gate) return;

  // ── A page switch's own swap ─────────────────────────────────────────
  //
  // A View Transition takes a picture of the screen as it is, then the page changes under that
  // picture (its update), then a picture of the new page is taken, and only then does anything
  // move on the screen (`ready`). A box that stands elsewhere in the new page than it stood in the
  // old one (the route's own box, under a back bar the page being left had and the page arriving
  // has not) is reported by the browser as a layout shift in that swap, but no reader sees it: the
  // screen shows the old page's picture, then the new one's. Each swap's window, from its update to
  // its `ready`, is kept here for the transitions check (scripts/gate/frames.mjs, "jump"). A shift
  // after `ready` is in the live picture of the new page, and still a jump.
  window.__gateSwaps = [];
  if (typeof document.startViewTransition === "function" && !document.startViewTransition.__gate) {
    const own = document.startViewTransition;
    const wrapped = function (arg) {
      const swap = { start: performance.timeOrigin + performance.now(), ready: Infinity };
      window.__gateSwaps.push(swap);
      const transition = own.call(this, arg);
      const settle = () => {
        if (swap.ready === Infinity) swap.ready = performance.timeOrigin + performance.now();
      };
      transition.ready.then(settle, settle);
      // A transition skipped before its picture is taken has changed the page at once.
      transition.finished.then(settle, settle);
      return transition;
    };
    wrapped.__gate = true;
    document.startViewTransition = wrapped;
  }

  // ── Boxes as the screen draws them ───────────────────────────────────

  /** A colour's alpha, from any form the browser computes (rgb, rgba, color(), oklch with a slash). */
  function alpha(c) {
    if (!c || c === "transparent") return 0;
    const slash = /\/\s*([\d.]+)(%?)\s*\)\s*$/.exec(c);
    if (slash) return slash[2] ? Number(slash[1]) / 100 : Number(slash[1]);
    const rgba = /^rgba\(([^)]+)\)$/.exec(c);
    if (rgba) {
      const p = rgba[1].split(",");
      if (p.length === 4) return Number(p[3]);
    }
    return 1;
  }

  /** How see-through it is drawn: its opacity times every ancestor's. */
  function opacityOf(el) {
    let o = 1;
    for (let q = el; q && q.nodeType === 1; q = q.parentElement) {
      o *= Number(getComputedStyle(q).opacity);
      if (o < 0.001) return 0;
    }
    return o;
  }

  /** Whether a box is the block a fixed box is placed in (instead of the screen). */
  function holdsFixed(cs) {
    return (
      cs.transform !== "none" ||
      cs.perspective !== "none" ||
      cs.filter !== "none" ||
      (cs.backdropFilter && cs.backdropFilter !== "none") ||
      /paint|layout|strict|content/.test(cs.contain) ||
      /transform|perspective|filter/.test(cs.willChange) ||
      (cs.containerType && cs.containerType !== "normal")
    );
  }

  /** The box an element is placed in (its containing block), null for the screen. */
  function placedIn(el) {
    const cs = getComputedStyle(el);
    if (cs.position === "fixed") {
      for (let q = el.parentElement; q; q = q.parentElement) if (holdsFixed(getComputedStyle(q))) return q;
      return null;
    }
    if (cs.position === "absolute") {
      for (let q = el.parentElement; q; q = q.parentElement) {
        const qs = getComputedStyle(q);
        if (qs.position !== "static" || holdsFixed(qs)) return q;
      }
      return null;
    }
    return el.parentElement;
  }

  /** The inside of a box's border (what its overflow clips to). */
  function paddingBox(el, cs) {
    const b = el.getBoundingClientRect();
    return {
      left: b.left + parseFloat(cs.borderLeftWidth || 0),
      right: b.right - parseFloat(cs.borderRightWidth || 0),
      top: b.top + parseFloat(cs.borderTopWidth || 0),
      bottom: b.bottom - parseFloat(cs.borderBottomWidth || 0),
    };
  }

  /**
   * Every box that clips this one, nearest first: the boxes it is placed in, in turn, whose
   * overflow is not visible (a box placed outside a clipping box, as a fixed one is, escapes it).
   * Each says which way it clips, whether it scrolls that way, and whether it is the page itself.
   */
  function clippers(el) {
    const out = [];
    for (let q = placedIn(el); q; q = placedIn(q)) {
      const c = clipOf(q);
      if (c) out.push(c);
    }
    return out;
  }

  /** How a box clips what is inside it, or null if it clips nothing. */
  function clipOf(q) {
    const cs = getComputedStyle(q);
    const cx = cs.overflowX !== "visible";
    const cy = cs.overflowY !== "visible";
    if (!cx && !cy) return null;
    return {
      el: q,
      box: paddingBox(q, cs),
      x: cx,
      y: cy,
      scrollsX: cx && /auto|scroll/.test(cs.overflowX) && q.scrollWidth > q.clientWidth + 1,
      scrollsY: cy && /auto|scroll/.test(cs.overflowY) && q.scrollHeight > q.clientHeight + 1,
      page: q === document.documentElement || q === document.body,
    };
  }

  /** What of a rectangle is drawn: inside every box that clips it, and on the screen. */
  function drawnPart(el, r, W, H) {
    let left = r.left;
    let right = r.right;
    let top = r.top;
    let bottom = r.bottom;
    for (const c of clippers(el)) {
      if (c.page) continue;
      if (c.x) {
        left = Math.max(left, c.box.left);
        right = Math.min(right, c.box.right);
      }
      if (c.y) {
        top = Math.max(top, c.box.top);
        bottom = Math.min(bottom, c.box.bottom);
      }
    }
    left = Math.max(left, 0);
    right = Math.min(right, W);
    top = Math.max(top, 0);
    bottom = Math.min(bottom, H);
    return right - left >= 1 && bottom - top >= 1 ? { left, right, top, bottom } : null;
  }

  const REPLACED = /^(IMG|VIDEO|CANVAS|IFRAME|INPUT|TEXTAREA|SELECT|OBJECT|EMBED)$/;
  const CONTROL = "button, a[href], input, select, textarea, [role=button], [role=link], [role=tab], [role=switch], [role=checkbox], [role=radio], [role=option], [role=menuitem], summary";

  /** Whether the box itself paints: a picture, a field, a background, a border. */
  function paints(el, cs) {
    if (REPLACED.test(el.tagName) || el instanceof SVGSVGElement) return true;
    if (alpha(cs.backgroundColor) > 0.04) return true;
    if (cs.backgroundImage && cs.backgroundImage !== "none") return true;
    for (const s of ["Top", "Right", "Bottom", "Left"]) {
      if (parseFloat(cs[`border${s}Width`]) > 0 && !/none|hidden/.test(cs[`border${s}Style`]) && alpha(cs[`border${s}Color`]) > 0.04) return true;
    }
    return false;
  }

  /** Whether a box's own ground hides what is behind it: an opaque colour, or a gradient of opaque colours only. */
  function opaqueGround(cs) {
    if (alpha(cs.backgroundColor) >= 0.9) return true;
    const img = cs.backgroundImage || "none";
    if (img === "none" || /url\(/.test(img) || /transparent/.test(img)) return false;
    const colours = img.match(/(rgba?|color|oklab|oklch|lab|lch|hsla?|hwb)\([^()]*\)/g) || [];
    return colours.length > 0 && colours.every((c) => alpha(c) >= 0.9);
  }

  /** The lines of the element's own words, as drawn. */
  function wordRects(el, cs) {
    if (alpha(cs.color) < 0.05 && alpha(cs.webkitTextFillColor) < 0.05) return [];
    const out = [];
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.data.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const b of range.getClientRects()) if (b.width >= 1 && b.height >= 1) out.push(b);
    }
    return out;
  }

  /** Drawn at all: in the layout, not hidden, not inside something shut. */
  function rendered(el, cs) {
    if (cs.display === "none" || cs.visibility !== "visible") return false;
    if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: false })) return false;
    return true;
  }

  /** A screen reader's own words, kept out of sight on purpose. */
  function forScreenReaders(el) {
    for (let q = el; q && q !== document.body; q = q.parentElement) {
      const qs = getComputedStyle(q);
      if (qs.clip && qs.clip !== "auto" && /rect\(0(px)?,? 0(px)?/.test(qs.clip)) return true;
      if (/inset\(50%/.test(qs.clipPath)) return true;
      const b = q.getBoundingClientRect();
      if ((qs.overflowX !== "visible" || qs.overflowY !== "visible") && b.width <= 2 && b.height <= 2) return true;
    }
    return false;
  }

  /** What a reader would call it: its tag, its role, its own data marks, its words. */
  function nameOf(el) {
    if (!el || el.nodeType !== 1) return String(el);
    const marks = [...el.attributes]
      .filter((a) => a.name.startsWith("data-") && !/^data-(tapwalk|mock|gate|tour)/.test(a.name))
      .slice(0, 3)
      .map((a) => (a.value && a.value.length <= 16 ? `${a.name}=${a.value}` : a.name));
    const role = el.getAttribute("role");
    const words = (el.getAttribute("aria-label") || el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${role ? `[role=${role}]` : ""}${marks.map((m) => `[${m}]`).join("")}${words ? ` "${words}"` : ""}`;
  }

  /** The data marks of the boxes it stands in, nearest first: where to find it in the code when it has none of its own. */
  function trailOf(el) {
    const out = [];
    for (let q = el && el.parentElement, n = 0; q && q !== document.body && n < 14; q = q.parentElement, n++) {
      for (const a of q.attributes) if (a.name.startsWith("data-") && !/^data-(tapwalk|mock|gate|tour)/.test(a.name) && !out.includes(a.name)) out.push(a.name);
    }
    return out;
  }

  /** The data marks from a drawn piece up to its layer's own box (not included), nearest first. */
  function innerMarks(el, root) {
    const out = [];
    for (let q = el; q && q !== root && q !== document.body; q = q.parentElement) {
      for (const a of q.attributes) if (a.name.startsWith("data-") && !/^data-(tapwalk|mock|gate|tour)/.test(a.name) && !out.includes(a.name)) out.push(a.name);
    }
    return out;
  }

  /** The element's classes, as a fingerprint to find it in the code by. */
  function classesOf(el) {
    return typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 8).join(" ") : "";
  }

  const round = (r) => ({ left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) });

  // ── Floating layers ──────────────────────────────────────────────────

  /** A sticky box is a floating layer only while it is stuck: standing at its offset in its scroller. */
  function stuck(el, cs, H) {
    let port = { top: 0, bottom: H };
    for (let q = el.parentElement; q && q !== document.body && q !== document.documentElement; q = q.parentElement) {
      const qs = getComputedStyle(q);
      if (/auto|scroll|hidden|clip|overlay/.test(qs.overflowY) || /auto|scroll|hidden|clip|overlay/.test(qs.overflowX)) {
        port = paddingBox(q, qs);
        break;
      }
    }
    const r = el.getBoundingClientRect();
    const top = parseFloat(cs.top);
    const bottom = parseFloat(cs.bottom);
    if (!Number.isNaN(top) && Math.abs(r.top - (port.top + top)) <= 1) return true;
    if (!Number.isNaN(bottom) && Math.abs(r.bottom - (port.bottom - bottom)) <= 1) return true;
    return false;
  }

  const POPOVER = "[role=menu], [role=listbox], [role=dialog], [role=alertdialog], [role=tooltip], [popover]";

  /**
   * The floating layers on the screen and where two meet. A layer is a fixed box, a stuck sticky
   * box, a box in the top layer (a modal dialog, an open popover) or a popover placed absolutely;
   * a layer inside another is its own layer, and is not compared with the one it is inside (a
   * sheet's own footer). Each layer is what it draws: the boxes in it that paint (a picture, a
   * field, a background, a border) and the lines of its words, each clipped as the screen clips
   * it, each at least `visible` opaque. A layer that covers most of the screen is a ground (a
   * full screen, a scrim): what stands behind it is not floating with what stands in front of it,
   * so only the layers in front of the topmost ground are compared. Two layers meet where a piece
   * of one overlaps a piece of the other by more than a pixel each way.
   */
  function layers(o = {}) {
    const W = o.width ?? innerWidth;
    const H = o.height ?? innerHeight;
    const VISIBLE = o.visible ?? 0.3;
    const GROUND = o.ground ?? 0.85;
    const roots = [];
    const isRoot = new Map();
    // The page's own backdrop: a fixed box set behind the page (z-index 0 or below) and hidden
    // from assistive technology, a picture the page's words stand over, as the theology path's
    // step room is (app/(app)/theology/path/[subject]/page.tsx, .step-room in app/globals.css).
    // It is the page's ground, not a layer floating over it, and a bar over its picture is the
    // house's bar over a picture, as on a saint's page (the arbiter's ruling, 2026-11-13).
    const backdrop = (el, cs) => Boolean(el.closest("[aria-hidden='true']")) && cs.zIndex !== "auto" && Number(cs.zIndex) <= 0;
    for (const el of document.body.getElementsByTagName("*")) {
      const cs = getComputedStyle(el);
      let kind = null;
      if (cs.position === "fixed") kind = backdrop(el, cs) ? null : "fixed";
      else if (cs.position === "sticky" && stuck(el, cs, H)) kind = "sticky";
      else if (el.matches(":popover-open, dialog:modal")) kind = "top";
      else if (cs.position === "absolute" && el.matches(POPOVER)) kind = "popover";
      if (!kind || !rendered(el, cs)) continue;
      const layer = { el, kind, z: cs.zIndex, parts: [], opacity: 0 };
      roots.push(layer);
      isRoot.set(el, layer);
    }
    const layerOf = (el) => {
      for (let q = el; q; q = q.parentElement) if (isRoot.has(q)) return isRoot.get(q);
      return null;
    };
    for (const layer of roots) {
      for (const el of [layer.el, ...layer.el.getElementsByTagName("*")]) {
        if (layerOf(el) !== layer) continue;
        const cs = getComputedStyle(el);
        if (!rendered(el, cs)) continue;
        const own = paints(el, cs);
        const words = wordRects(el, cs);
        if (!own && !words.length) continue;
        const op = opacityOf(el);
        if (op < VISIBLE) continue;
        // What a reader reads or touches (words, a picture or an icon, a control) is content; a box
        // that only paints is ground, and hides what is behind it when it is opaque.
        const content = REPLACED.test(el.tagName) || el instanceof SVGSVGElement || el.matches(CONTROL);
        const solid = op >= 0.9 && opaqueGround(cs);
        if (own) {
          const part = drawnPart(el, el.getBoundingClientRect(), W, H);
          if (part) layer.parts.push({ ...part, el, box: true, content, solid });
        }
        for (const r of words) {
          const part = drawnPart(el, r, W, H);
          if (part) layer.parts.push({ ...part, el, box: false, content: true, solid: false });
        }
        layer.opacity = Math.max(layer.opacity, op);
      }
    }
    const shown = roots.filter((l) => l.parts.length);
    // How much of the screen a layer covers, on a grid of 10px cells.
    const cover = (l) => {
      let n = 0;
      let all = 0;
      for (let y = 5; y < H; y += 10) {
        for (let x = 5; x < W; x += 10) {
          all++;
          if (l.parts.some((p) => x >= p.left && x < p.right && y >= p.top && y < p.bottom)) n++;
        }
      }
      return all ? n / all : 0;
    };
    for (const l of shown) l.cover = cover(l);
    // Which of two layers is in front, where they both are: the browser's own hit test, with every
    // box made to answer it for that one moment (a layer the finger passes through, pointer-events
    // none, still draws).
    const style = document.createElement("style");
    style.textContent = "* { pointer-events: auto !important; }";
    document.head.appendChild(style);
    const inFront = (a, b) => {
      for (const p of a.parts) {
        const x = (p.left + p.right) / 2;
        const y = (p.top + p.bottom) / 2;
        for (const hit of document.elementsFromPoint(x, y)) {
          const l = layerOf(hit);
          if (l === a) return true;
          if (l === b) return false;
        }
      }
      return true;
    };
    let ground = null;
    const meetings = [];
    try {
      for (const l of shown.filter((l) => l.cover >= GROUND)) if (!ground || inFront(l, ground)) ground = l;
      var front = shown.filter((l) => l !== ground && l.cover < GROUND && (!ground || inFront(l, ground)));
      const overlap = (p, q) => {
        const r = { left: Math.max(p.left, q.left), right: Math.min(p.right, q.right), top: Math.max(p.top, q.top), bottom: Math.min(p.bottom, q.bottom) };
        return r.right - r.left > 1 && r.bottom - r.top > 1 ? r : null;
      };
      const within = (x, y) => x.left >= y.left - 1 && x.right <= y.right + 1 && x.top >= y.top - 1 && x.bottom <= y.bottom + 1;
      // Which layer is in front where two pieces overlap: the browser's own hit test at that spot.
      const frontAt = (a, b, r) => {
        for (const hit of document.elementsFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2)) {
          const l = layerOf(hit);
          if (l === a) return a;
          if (l === b) return b;
        }
        return a;
      };
      for (let i = 0; i < front.length; i++) {
        for (let j = i + 1; j < front.length; j++) {
          const a = front[i];
          const b = front[j];
          if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
          let area = 0;
          let box = null;
          let pieces = null;
          for (const p of a.parts) {
            for (const q of b.parts) {
              const r = overlap(p, q);
              if (!r) continue;
              const inFrontLayer = frontAt(a, b, r);
              const F = inFrontLayer === a ? p : q;
              const K = inFrontLayer === a ? q : p;
              const backLayer = inFrontLayer === a ? b : a;
              // Wholly hidden behind an opaque box: no reader sees it (a bar wholly under a sheet).
              if (F.solid && within(K, F)) continue;
              // Wholly on the other layer's bare ground, over none of its words, pictures or controls: it
              // sits on that layer as a mark sits on a bar (the reading line on the top bar's ground, the
              // tab bar on the reader's fade).
              if (K.box && !K.content && within(F, K) && !backLayer.parts.some((c) => c.content && overlap(c, F))) continue;
              const w = r.right - r.left;
              const h = r.bottom - r.top;
              area += w * h;
              box = box ? { left: Math.min(box.left, r.left), right: Math.max(box.right, r.right), top: Math.min(box.top, r.top), bottom: Math.max(box.bottom, r.bottom) } : r;
              if (!pieces || w * h > pieces.area) {
                const frontLayer = inFrontLayer;
                pieces = { area: w * h, front: nameOf(F.el), back: nameOf(K.el), frontIs: frontLayer === a ? "a" : "b", frontMarks: innerMarks(F.el, frontLayer.el), backMarks: innerMarks(K.el, backLayer.el) };
              }
            }
          }
          if (!box) continue;
          meetings.push({
            a: nameOf(a.el),
            b: nameOf(b.el),
            aKind: a.kind,
            bKind: b.kind,
            aClass: classesOf(a.el),
            bClass: classesOf(b.el),
            aMarks: [...a.el.attributes].filter((x) => x.name.startsWith("data-")).map((x) => x.name),
            bMarks: [...b.el.attributes].filter((x) => x.name.startsWith("data-")).map((x) => x.name),
            aTrail: trailOf(a.el),
            bTrail: trailOf(b.el),
            aInner: pieces ? (pieces.frontIs === "a" ? pieces.frontMarks : pieces.backMarks) : [],
            bInner: pieces ? (pieces.frontIs === "b" ? pieces.frontMarks : pieces.backMarks) : [],
            box: round(box),
            area: Math.round(area),
            pieces: pieces && { front: pieces.front, back: pieces.back },
          });
        }
      }
    } finally {
      style.remove();
    }
    return {
      layers: shown.map((l) => ({ name: nameOf(l.el), kind: l.kind, z: l.z, cover: Math.round(l.cover * 100) / 100, ground: l === ground, front: front.includes(l), box: round(l.parts.reduce((m, p) => ({ left: Math.min(m.left, p.left), top: Math.min(m.top, p.top), right: Math.max(m.right, p.right), bottom: Math.max(m.bottom, p.bottom) }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity })) })),
      meetings,
    };
  }

  // ── The page's edge ──────────────────────────────────────────────────

  /**
   * What is cut at the screen's edge or spills sideways, measured against the width asked for
   * (`width`), never innerWidth: a phone's browser widens innerWidth to fit what spills, and the
   * apps clip it (app/globals.css, overflow-x: clip), so there a spill is cut, not scrolled. What
   * counts is what a reader reads or touches: the lines of words, a picture or an icon, a field,
   * a control, and a box that paints (a card, a pill), each where the boxes it sits in leave it
   * drawn. Not counted: what can be scrolled to sideways (a row of cards that scrolls; the row
   * itself still counts), what a reader cannot see (opacity 0, hidden, a screen reader's own
   * words), and a band or a picture that bleeds past both edges at once, which is a bleed, not a
   * cut. A fixed box is measured against the screen's height too: it does not scroll, so what
   * stands past its top or foot is cut (at rest only).
   */
  function edge(o = {}) {
    const W = o.width ?? innerWidth;
    const H = o.height ?? innerHeight;
    const TOL = o.tolerance ?? 1;
    const found = [];
    const seen = new Set();
    const fixedRoot = (el) => {
      for (let q = el; q && q !== document.body; q = q.parentElement) if (getComputedStyle(q).position === "fixed") return q;
      return null;
    };
    // A sheet resting low (the house's half rest, lib/ui/useDraggableSheet.ts): moved down by a
    // transform, and short enough to stand wholly on the screen when drawn up. What is past its
    // foot is reached by drawing it up, as a row's end is by scrolling.
    const restingLow = (el, root) => {
      for (let q = el; q; q = q.parentElement) {
        const t = getComputedStyle(q).transform;
        const m = t && t !== "none" ? new DOMMatrixReadOnly(t) : null;
        if (m && m.m42 > 1 && q.getBoundingClientRect().height <= H + TOL) return true;
        if (q === root) break;
      }
      return false;
    };
    const consider = (el, r, what) => {
      if (r.right - r.left < 1 || r.bottom - r.top < 1) return;
      const fixed = o.vertical === false ? null : fixedRoot(el);
      const sideways = r.left < -TOL || r.right > W + TOL;
      const upright = fixed && (r.top < -TOL || (r.bottom > H + TOL && !restingLow(el, fixed)));
      if (!sideways && !upright) return;
      if (forScreenReaders(el)) return;
      if (el.closest("[inert], [aria-hidden='true']")) return;
      // Where the boxes it sits in leave it: clipped by each inside the screen; a box that scrolls
      // sideways (a row of cards) carries it, and is measured itself instead.
      let { left, right, top, bottom } = r;
      // Words are clipped by their own box first: a title cut to one line inside its box, with its
      // ellipsis (Tailwind's truncate), ends where its box ends, not at the screen's edge.
      const own = what === "words" ? clipOf(el) : null;
      for (const c of own ? [own, ...clippers(el)] : clippers(el)) {
        if (c.page) continue;
        if (c.x) {
          if (c.scrollsX) {
            const row = c.el;
            if (!seen.has(row)) {
              seen.add(row);
              const rb = row.getBoundingClientRect();
              consider(row, { left: rb.left, right: rb.right, top: rb.top, bottom: rb.bottom }, "a row that scrolls sideways");
            }
            return;
          }
          const wide = c.box.left <= 0.5 && c.box.right >= W - 0.5;
          if (!wide) {
            left = Math.max(left, c.box.left);
            right = Math.min(right, c.box.right);
          }
        }
        if (c.y && !c.scrollsY) {
          top = Math.max(top, c.box.top);
          bottom = Math.min(bottom, c.box.bottom);
        }
        if (c.y && c.scrollsY && fixed) return; // a sheet's own scroller carries what is past its foot
      }
      if (right - left < 1 || bottom - top < 1) return; // clipped away inside the screen
      const outLeft = Math.round(-left);
      const outRight = Math.round(right - W);
      const outTop = fixed ? Math.round(-top) : 0;
      const outBottom = fixed && !restingLow(el, fixed) ? Math.round(bottom - H) : 0;
      const past = Math.max(outLeft, outRight, outTop, outBottom);
      if (past <= TOL) return;
      // A band or a picture past both edges at once is a bleed.
      if (outLeft > TOL && outRight > TOL && what !== "words") return;
      if (opacityOf(el) < 0.05) return;
      const off = right <= 0 || left >= W || (fixed && (bottom <= 0 || top >= H));
      const side = [outLeft > TOL && `the left edge by ${outLeft}px`, outRight > TOL && `the right edge by ${outRight}px`, outTop > TOL && `the top by ${outTop}px`, outBottom > TOL && `the foot by ${outBottom}px`].filter(Boolean).join(" and ");
      found.push({ el, name: nameOf(el), cls: classesOf(el), marks: [...el.attributes].filter((x) => x.name.startsWith("data-")).map((x) => x.name), trail: trailOf(el), what, off, side, past, box: round({ left, right, top, bottom }), fixed: !!fixed, words: what === "words" ? (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50) : "" });
    };
    for (const el of document.body.getElementsByTagName("*")) {
      const b = el.getBoundingClientRect();
      // Most of a page is well inside the screen: only what reaches past it is looked at closely.
      const near = b.left < -TOL || b.right > W + TOL || ((b.top < -TOL || b.bottom > H + TOL) && b.width > 0);
      let words = null;
      if (!near) {
        // Its words can reach past its box (a word that does not wrap).
        if (!el.firstChild || el.children.length === el.childNodes.length) continue;
        const cs0 = getComputedStyle(el);
        if (cs0.whiteSpace === "normal" && cs0.overflowWrap !== "normal") continue;
        words = wordRects(el, cs0);
        if (!words.some((r) => r.left < -TOL || r.right > W + TOL)) continue;
      }
      const cs = getComputedStyle(el);
      if (!rendered(el, cs) || cs.display === "contents") continue;
      if (words === null) words = wordRects(el, cs);
      for (const r of words) consider(el, r, "words");
      const control = el.matches(CONTROL);
      const picture = REPLACED.test(el.tagName) || el instanceof SVGSVGElement;
      if (control || picture || paints(el, cs)) {
        if (picture && b.width < 6 && b.height < 6) continue;
        consider(el, b, control ? "a control" : picture ? "a picture" : "a box");
      }
    }
    // The page itself spills where the browser widened it to fit (innerWidth past the width asked
    // for): the apps clip html and body sideways, so this is a page that lost its clip. Its cause is
    // the outermost box past the edge; a fixed bar as wide as the widened page is its victim.
    const spill = [];
    if (innerWidth > W + TOL) {
      const past = [];
      for (const el of document.body.getElementsByTagName("*")) {
        const b = el.getBoundingClientRect();
        if (b.width < 1 || !(b.right > W + TOL || b.left < -TOL)) continue;
        if (getComputedStyle(el).position === "fixed") continue;
        if (clippers(el).some((c) => !c.page && c.x)) continue;
        past.push(el);
      }
      const causes = past.filter((el) => !past.some((p) => p !== el && p.contains(el)));
      spill.push({
        name: causes.slice(0, 3).map(nameOf).join("; ") || "the page",
        cls: causes[0] ? classesOf(causes[0]) : "",
        marks: causes[0] ? [...causes[0].attributes].filter((x) => x.name.startsWith("data-")).map((x) => x.name) : [],
        what: "the page",
        off: false,
        side: `the right edge: the browser widened the page to ${innerWidth}px to fit it`,
        past: innerWidth - W,
        box: causes[0] ? round(causes[0].getBoundingClientRect()) : null,
        fixed: false,
        words: "",
        inside: causes.length,
        said: "",
        spill: true,
      });
    }
    // The outermost of what is cut, with what it cuts inside it. A fixed bar the widened page
    // stretched is said once, under the spill.
    const victim = (f) => spill.length && f.fixed && f.box.left <= TOL && Math.abs(f.box.right - innerWidth) <= 2;
    const kept = found.filter((f) => !victim(f));
    const out = kept.filter((f) => !kept.some((g) => g !== f && g.el.contains(f.el) && g.el !== f.el));
    return [
      ...spill,
      ...out.map((f) => {
        const inside = kept.filter((g) => g !== f && f.el.contains(g.el));
        const said = inside.find((g) => g.what === "words")?.words ?? f.words;
        const rest = Object.fromEntries(Object.entries(f).filter(([k]) => k !== "el"));
        return { ...rest, inside: inside.length, said };
      }),
    ];
  }

  // ── Frame by frame ───────────────────────────────────────────────────

  /** What an animation changes: the properties of its keyframes, or the one it transitions. */
  function changes(a) {
    const out = new Set();
    try {
      for (const k of a.effect.getKeyframes()) for (const key of Object.keys(k)) if (!["offset", "easing", "composite", "computedOffset"].includes(key)) out.add(key);
    } catch {}
    if (a.transitionProperty) out.add(a.transitionProperty);
    return [...out];
  }
  const MOVES = /^(transform|translate|scale|rotate|top|left|right|bottom|inset.*|width|height|margin.*|offset.*)$/i;

  /**
   * What carries a box when something scrolls: every scrolled box it stands in, and the page itself
   * unless the box stands in a layer fixed to the screen (a bar, a sheet), which the page's scroll
   * does not move. A box in a sticky box is carried by that box (`held`, the innermost): a sticky
   * row rides the page part of the way and then sticks, and what stands in it must move exactly as
   * it moves, frame by frame, measured against it, never by any amount between none and all (the
   * arbiter, 2026-11-13: Alaska's map label, which rode its sticky map 71px of the page's 165). Only
   * the scrolled boxes between the two carry it then. A sticky box itself may be either, carried or
   * stuck: `loose`.
   */
  function carriersOf(el) {
    const list = [];
    const loose = getComputedStyle(el).position === "sticky";
    for (let p = el; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.position === "fixed") return { list, loose };
      if (p !== el && (p.scrollHeight > p.clientHeight || p.scrollWidth > p.clientWidth) && /auto|scroll|hidden/.test(`${cs.overflowX} ${cs.overflowY}`)) list.push(p);
      if (p !== el && !loose && cs.position === "sticky") return { list, loose, held: p };
    }
    list.push(document.scrollingElement || document.documentElement);
    return { list, loose };
  }

  /** How far those carriers have scrolled, together. */
  function scrolledBy(carriers) {
    let x = 0;
    let y = 0;
    for (const c of carriers.list) {
      x += c.scrollLeft;
      y += c.scrollTop;
    }
    return { x, y };
  }

  /** Where a box drawn at `r` stands: on the page (its carriers' scroll added back), or in the sticky box that holds it. */
  function placeOf(r, carriers) {
    const by = scrolledBy(carriers);
    const at = carriers.held ? carriers.held.getBoundingClientRect() : { left: 0, top: 0 };
    return { x: r.left - at.left + by.x, y: r.top - at.top + by.y };
  }

  /**
   * From now on, every frame, until stop(): the time (on the epoch's clock, as the screencast's
   * frames), the address, the app's motion, how many animations run and how many of them are a
   * page switch's (the View Transition's own), and with `moves` what moves while it runs (an
   * animation of position or size on something drawn); the layout shifts as the browser reports
   * them; and anything new that is drawn at one place in its first frame and far from it in the
   * next ones with nothing moving it there (a box drawn at the corner before it is placed).
   */
  function sample(o = {}) {
    const s = { frames: [], shifts: [], misplaced: [], held: [], running: true, fresh: [], watch: new Map(), raf: 0, vtNames: new Set() };
    window.__gateSample = s;
    try {
      s.po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          s.shifts.push({
            t: performance.timeOrigin + e.startTime,
            value: e.value,
            input: e.hadRecentInput,
            sources: (e.sources || []).map((x) => ({
              node: x.node && x.node.nodeType === 1 ? nameOf(x.node) : x.node ? nameOf(x.node.parentElement) : null,
              cls: x.node && x.node.nodeType === 1 ? classesOf(x.node) : "",
              marks: x.node && x.node.nodeType === 1 ? [...x.node.attributes].filter((a) => a.name.startsWith("data-")).map((a) => a.name) : [],
              trail: x.node ? trailOf(x.node.nodeType === 1 ? x.node : x.node.parentElement) : [],
              from: [Math.round(x.previousRect.x), Math.round(x.previousRect.y), Math.round(x.previousRect.width), Math.round(x.previousRect.height)],
              to: [Math.round(x.currentRect.x), Math.round(x.currentRect.y), Math.round(x.currentRect.width), Math.round(x.currentRect.height)],
            })),
          });
        }
      });
      s.po.observe({ type: "layout-shift", buffered: false });
    } catch {}
    // Motion a script drives frame by frame (a sheet's own spring, lib/ui/useDraggableSheet.ts) is in
    // no animation list: it is an inline style changed each frame, and counts as motion too.
    // One change is a placement, not motion: only a box restyled in two frames running is moving.
    s.styled = new Set();
    s.wasStyled = new Set();
    s.mo = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "attributes") {
          const st = m.target.getAttribute && m.target.getAttribute("style");
          if (st && /transform|translate|scale|top|left|right|bottom|height|width|inset/.test(st)) s.styled.add(m.target);
          continue;
        }
        for (const n of m.addedNodes) if (n.nodeType === 1 && s.fresh.length < 40) s.fresh.push(n);
      }
    });
    s.mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
    const animated = (el) => {
      for (const a of document.getAnimations()) {
        const t = a.effect && a.effect.target;
        if (a.playState === "running" && t && (t === el || t.contains(el)) && changes(a).some((p) => MOVES.test(p))) return true;
      }
      return false;
    };
    const step = (t) => {
      if (!s.running) return;
      const anims = document.getAnimations().filter((a) => a.playState === "running");
      let vt = 0;
      let move = 0;
      const moving = [];
      for (const a of anims) {
        const pseudo = (a.effect && a.effect.pseudoElement) || "";
        if (pseudo.startsWith("::view-transition")) {
          vt++;
          s.vtNames.add(pseudo);
        }
        const props = changes(a).filter((p) => MOVES.test(p));
        if (props.length) move++;
        if (o.moves) {
          const target = a.effect && a.effect.target;
          if (!props.length || !target) continue;
          const r = target.getBoundingClientRect();
          if (!pseudo && (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || opacityOf(target) < 0.05)) continue;
          const timing = a.effect.getComputedTiming ? a.effect.getComputedTiming() : { duration: 0 };
          const d = timing.duration;
          if (typeof d === "number" && d < 40) continue;
          // A scroll-driven animation (a view or scroll timeline) has no time of its own: its duration
          // reads "auto", and it moves only as its scroller does. EIKON's story keeps its scroll-driven
          // motion on by design (components/shop/eikon/EikonStory.tsx), and this listed it as
          // "transform over 0ms" on every tap on the shop item while nothing moved (Updates 13 and 18,
          // the shop item's zero-length transform). So it is listed only in a frame where its progress
          // changed from the frame before.
          if (typeof d !== "number") {
            const seen = (s.progress ??= new WeakMap());
            const before = seen.get(a);
            seen.set(a, timing.progress);
            if (before === undefined || before === timing.progress) continue;
          }
          moving.push(`${pseudo ? `${pseudo} of ` : ""}${nameOf(target)}: ${props.join(", ")} ${typeof d === "number" ? `over ${Math.round(d)}ms` : "with the scroll"}`);
        }
      }
      // New boxes: where each is drawn in its first frame, then in the next three. Where it stands
      // is read on the page, not on the screen: a box the page carries while the page glides (an
      // in-page move's scroll, lib/ui/inPageMove.ts) is where it was drawn, and one that moves
      // against the page, or is left behind by it, is not (the arbiter, 2026-11-13). A box in a
      // sticky box is read in that box (`placeOf`).
      for (const n of s.fresh.splice(0)) {
        for (const el of [n, ...[...n.getElementsByTagName("*")].slice(0, 30)]) {
          const r = el.getBoundingClientRect();
          if (r.width >= 8 && r.height >= 8 && !s.watch.has(el)) {
            const carriers = carriersOf(el);
            const held = carriers.held ? carriers.held.getBoundingClientRect() : null;
            s.watch.set(el, { first: { x: r.left, y: r.top, w: r.width, h: r.height }, carriers, scrolled: scrolledBy(carriers), place: placeOf(r, carriers), held: held && { x: held.left, y: held.top }, frames: 0 });
          }
        }
      }
      // A box a reader could see: on the screen where it was first drawn, or where it stands now.
      // A feed settling far below the screen moves nothing a reader sees.
      const onScreen = (x, y, w, h) => x < innerWidth && x + w > 0 && y < innerHeight && y + h > 0;
      const moved = [];
      for (const [el, w] of s.watch) {
        w.frames++;
        if (w.frames === 1) continue;
        const r = el.getBoundingClientRect();
        const now = scrolledBy(w.carriers);
        const place = placeOf(r, w.carriers);
        const onPage = Math.max(Math.abs(place.x - w.place.x), Math.abs(place.y - w.place.y));
        const onScreenOnly = Math.max(Math.abs(r.left - w.first.x), Math.abs(r.top - w.first.y));
        const far = w.carriers.loose ? Math.min(onPage, onScreenOnly) : onPage;
        if (w.held && w.frames <= 3) {
          const h = w.carriers.held.getBoundingClientRect();
          w.boxMoved = Math.max(w.boxMoved ?? 0, Math.abs(h.left - w.held.x), Math.abs(h.top - w.held.y));
          w.inBox = Math.max(w.inBox ?? 0, far);
        }
        if (far > 40 && w.frames <= 3 && el.isConnected && opacityOf(el) >= 0.05 && !animated(el)) {
          if (onScreen(w.first.x, w.first.y, w.first.w, w.first.h) || onScreen(r.left, r.top, r.width, r.height)) {
            // What the page did, and in a sticky box, what that box did on the screen meanwhile.
            const page = document.scrollingElement || document.documentElement;
            const h = w.held && w.carriers.held.getBoundingClientRect();
            moved.push({ el, w, r, glided: w.held ? [0, 0] : [now.x - w.scrolled.x, now.y - w.scrolled.y], held: h ? { name: nameOf(w.carriers.held), moved: [h.left - w.held.x, h.top - w.held.y], page: [page.scrollLeft, page.scrollTop] } : null });
          }
          s.watch.delete(el);
        } else if (w.frames > 3) {
          // A box read in its sticky box while that box moved on the screen, and that stood still in
          // it: kept for the walk's account of why it passed.
          if (w.held && w.boxMoved > 2 && s.held.length < 20) s.held.push({ t: performance.timeOrigin + t, name: nameOf(el), in: nameOf(w.carriers.held), boxMoved: Math.round(w.boxMoved), inBox: Math.round(w.inBox) });
          s.watch.delete(el);
        }
      }
      // The outermost of what moved together: the boxes inside it moved with it.
      for (const m of moved) {
        if (moved.some((o) => o !== m && o.el.contains(m.el))) continue;
        const corner = Math.abs(m.w.first.x) <= 2 && Math.abs(m.w.first.y) <= 2;
        s.misplaced.push({ t: performance.timeOrigin + t, name: nameOf(m.el), cls: classesOf(m.el), from: [Math.round(m.w.first.x), Math.round(m.w.first.y)], to: [Math.round(m.r.left), Math.round(m.r.top)], glided: m.glided.map(Math.round), corner, held: m.held && { name: m.held.name, moved: m.held.moved.map(Math.round) } });
      }
      const scroller = document.scrollingElement || document.documentElement;
      for (const el of s.styled) if (s.wasStyled.has(el)) move++;
      s.wasStyled = s.styled;
      s.styled = new Set();
      s.frames.push({ t: performance.timeOrigin + t, path: location.pathname, motion: document.documentElement.getAttribute("data-motion"), anims: anims.length, vt, move, sx: Math.round(scroller.scrollLeft), sy: Math.round(scroller.scrollTop), moving: moving.slice(0, 6) });
      s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
    return true;
  }

  function stop() {
    const s = window.__gateSample;
    if (!s) return null;
    s.running = false;
    cancelAnimationFrame(s.raf);
    try {
      if (s.po) s.po.disconnect();
    } catch {}
    s.mo.disconnect();
    window.__gateSample = null;
    const swaps = (window.__gateSwaps || []).map((w) => ({ start: w.start, ready: w.ready === Infinity ? null : w.ready }));
    return { frames: s.frames, shifts: s.shifts, misplaced: s.misplaced, held: s.held, vtNames: [...s.vtNames], swaps };
  }

  window.__gate = { layers, edge, sample, stop, nameOf };
}

/** Put the measures into every document the context opens. */
export async function installGate(ctx) {
  await ctx.addInitScript(gateInPage);
}

/** Put them into a page already open (a self-test's own page, set by setContent). */
export async function ensureGate(page) {
  await page.evaluate(gateInPage);
}
