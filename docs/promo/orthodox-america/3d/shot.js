// The sample's two scenes, in real 3D (three.js, WebGL2). One: the globe turns
// in space, the camera pushes down through it onto the United States, the six
// states rise as forms whose height is their share, and the figure lands as
// they do. Two, with no cut: the camera's drift becomes a rising turn, the
// forms give their light back as points, one for every hundred people on the
// rolls, the points gather into a field in the air, most fall away, and those
// at the Liturgy on a typical Sunday draw together as the share lands.
//
// Nothing here runs on a clock. render.mjs asks for frame i and gets the same
// picture every time, so a stopped render resumes where it stopped.
//
// How a frame is made: the scene is drawn many times within the frame's own
// shutter, each time a moment later and through a different point of the lens,
// and the drawings are averaged in linear light. That one loop is the motion
// blur, the depth of field and the smoothing of every edge. Light is a soft
// glow at the globe's rim and a soft pool under each rising form; there are no
// beams, flares or streaks, and no star but a round point.
import * as THREE from "three";
import { feature, mesh as borders } from "topojson-client";
import { geoEquirectangular, geoPath, geoAlbersUsa } from "d3-geo";
import { FPS, SECONDS, SCENE_ONE, SCENE_TWO, NUMERALS, TITLE, SIX, FIGURE, CAPTION, SOURCE_LINE, ROLLS, SUNDAY, PEOPLE_A_POINT, SHARE, CAPTION_ROLLS, CAPTION_SUNDAY, SHARE_LINE, KEY, PARISHES, CAPTION_PARISHES } from "/words.mjs";
import { CHURCH, DIM as FORM, TOP, TRADITION, stands } from "/church.js";

const QUERY = new URLSearchParams(location.search);
const S = Number(QUERY.get("size") || 1080); // the frame is S by S
const K = S / 1080; // every size below is written for 1080

// ---- Time ------------------------------------------------------------------
const BEAT = 2.5; // the push begins
const WHIP = 2.0; // and lasts this long
const PEAK = 0.62; // how far through the push its fastest moment falls
const CUT = BEAT + WHIP * PEAK; // globe to map, at the push's fastest
const RISE = 4.0; // the first state starts to rise
const STAGGER = 0.17, RISE_FOR = 0.75;
const LANDED = RISE + STAGGER * (SIX.length - 1) + RISE_FOR; // 5.6: the figure reads 47.9
// Scene two's time. Everything it adds is nothing, and at rest, until GO: no frame of scene one is changed by it.
const GO = SCENE_ONE; // the hold ends and the camera's drift becomes the move
const MOVE = 2.2; // the rising turn about the country
const LIFT_LAG = 0.5, LIFT_FOR = 1.5; // how far apart the points leave, and each one's flight
const STOOD = GO + LIFT_LAG + LIFT_FOR; // 12.0: the field stands and the count reads the rolls
const THIN = 14.2, SWEEP = 1.0, STRAGGLE = 0.5, FALL_FOR = 0.5; // the falling away crosses the field from far to near
const THINNED = THIN + SWEEP + STRAGGLE + FALL_FOR; // 16.2: the count reads a typical Sunday
const CLOSE_FOR = 0.9, SHARE_AT = THINNED + CLOSE_FOR; // 17.1: those who stay have drawn together and the share lands
const SWING = 100, TILT_TWO = Number(new URLSearchParams(location.search).get("tilt2") || -2), LIFT_TWO = Number(new URLSearchParams(location.search).get("lift2") || -0.093);
// Scene three's time. Like scene two's, everything it adds is nothing, and at rest, until GO3: no frame before it is changed.
const GO3 = SCENE_TWO; // the hold on those who stay ends and they begin to draw
const PLAN_AT = GO3 + 0.25, PLAN_LAG = 0.55, PLAN_FOR = 0.95; // the points leave their round body for the lines of a plan
const DRAW = GO3 + 1.5, DRAWN = GO3 + 4.3; // the drawing rises from the floor to the crown of the dome
const IN_AT = GO3 + 1.9, IN_LAG = 0.6, IN_FOR = 1.0; // the points go in and stand in the nave
const BUILD = GO3 + 2.7, BUILT = GO3 + 6.7; // the stone rises after the drawing and closes over them
const SIGN = BUILT + 0.1, SIGNED = SIGN + 0.9; // the cross, last, like a signature
const SETTLE = GO3 + 9.5; // the camera comes to rest
const PARISH_AT = GO3 + 8.3; // the figure lands
const KEY_OFF = BUILT - 0.4; // the key to the points goes when the vaults hide them
const Q3 = (name, value) => Number(QUERY.get(name) ?? value);
const TURN3 = Q3("turn3", 85), TILT3_IN = Q3("tilt3in", 10), TILT3_DOWN = Q3("tilt3down", 32), AIM3 = Q3("aim3", 1.5), PUSH3 = Q3("push3", 3.4), LIFT3 = Q3("lift3", -0.09);
const R_UNITS = 13; // one Earth radius in map units (us-atlas draws Albers USA at 1300 px a radius; a map unit is 100 px)
const D_SET = 19.5; // the camera's distance from the map once settled, in map units
const FOV = 36;
const FOCAL = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)); // 3.078
const PX = (FOCAL * 1080) / 2; // a unit one unit away is this many px (at 1080)

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, x) => a + (b - a) * x;
const span = (t, a, b) => clamp((t - a) / (b - a));
const inOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const inOutQuart = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);
const outCubic = (x) => 1 - Math.pow(1 - x, 3);
const outQuad = (x) => 1 - (1 - x) * (1 - x);
const outBack = (x, s = 1.15) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
/** The push: a slow gather, a rush, then a hard landing. Three quarters of the way is covered by its fastest moment. */
const RUSH = 3.2, COVERED = 0.76, LAND = (COVERED * RUSH * (1 - PEAK)) / (PEAK * (1 - COVERED));
const push = (u) => (u <= PEAK ? COVERED * Math.pow(u / PEAK, RUSH) : 1 - (1 - COVERED) * Math.pow((1 - clamp(u)) / (1 - PEAK), LAND));
const softLine = (x) => (x <= 0 ? 0 : x - (1 - Math.exp(-3 * x)) / 3); // a drift that starts from rest
const move = (t) => inOutCubic(span(t, GO, GO + MOVE)); // scene two's one move: it starts from the drift's own speed and ends at rest
const move3 = (t) => inOutCubic(span(t, GO3, SETTLE)); // scene three's one slow turn about the church
const look3 = (t) => inOutCubic(span(t, GO3 + 4.2, SETTLE)); // the camera comes down from looking in to looking at
const rush = (t) => span(t, GO + 0.3, GO + 0.8) * (1 - span(t, GO + 1.6, GO + MOVE)); // its fast middle

/** The camera's height over the ground, in Earth radii, through both shots. */
const H_SET = D_SET / R_UNITS;
const H_DROP = 4.2 - 0.22 * BEAT - 0.22 * (WHIP / 2) - H_SET;
function height(t) {
  if (t < BEAT) return 4.2 - 0.22 * t;
  const tau = Math.min(t - BEAT, WHIP);
  const h = 4.2 - 0.22 * BEAT - 0.22 * (tau - (tau * tau) / (2 * WHIP)) - H_DROP * push(tau / WHIP);
  return h - 0.012 * softLine(t - BEAT - WHIP);
}
/** The turn about the line of sight, in degrees: the globe's lean, then the map's bearing. */
const turn = (t) => 23.4 - 32.4 * push(span(t, BEAT, BEAT + WHIP)) - 5 * (softLine(t - BEAT - WHIP) / softLine(SCENE_ONE - BEAT - WHIP)) - SWING * move(t) + TURN3 * move3(t);
/** How far the picture is lifted off the frame's centre (a lens shift): the globe sits high, the map low. */
const lift = (t) => 0.2 * (1 - inOutCubic(span(t, BEAT, CUT))) - 0.34 * inOutCubic(span(t, CUT + 0.05, CUT + 1.4)) + (LIFT_TWO + 0.34) * move(t) + LIFT3 * look3(t);
const tilt = (t) => 90 - 52 * inOutCubic(span(t, CUT + 0.05, CUT + 1.4)) + TILT_TWO * move(t) + TILT3_IN * inOutCubic(span(t, GO3, GO3 + 2.5)) - TILT3_DOWN * look3(t); // straight down, then a low angle, then a little higher over the field
/** The lens opening, in the shot's own units: wide while the map tilts (near and far go soft), then stopped down for the words. */
const openA = () => 0.003;
const openB = (t) => lerp(0.26, 0.07, inOutCubic(span(t, 4.5, 5.6))) + 0.08 * inOutCubic(span(t, GO, GO + 1)) - 0.04 * inOutCubic(span(t, GO + 1.3, GO + MOVE)) - 0.04 * inOutCubic(span(t, THINNED, SHARE_AT));
const shutter = (t) => lerp(0.5, 0.95, span(t, BEAT + 0.3, BEAT + 0.9) * (1 - span(t, CUT + 0.25, CUT + 0.6))) + 0.4 * rush(t); // of a frame
const samples = (t) => Math.round(lerp(20, 72, span(t, BEAT + 0.2, BEAT + 0.8) * (1 - span(t, 4.7, 5.5))) + 8 * (1 - span(t, 0, 2.9)) + 36 * rush(t) + 16 * span(t, GO3 + 1.6, GO3 + 2.6));
/** 0 is the globe, 1 is the map; three frames of one dissolving into the other inside the blur. */
const shotMix = (t) => span(t, CUT - 0.05, CUT + 0.05);

const rise = (i, t) => span(t, RISE + i * STAGGER, RISE + i * STAGGER + RISE_FOR);

// ---- A deterministic dice --------------------------------------------------
function dice(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }; // an even scatter, the same every time

// ---- The renderer and its buffers ------------------------------------------
const out = document.getElementById("out");
out.width = out.height = S;
const pen = out.getContext("2d", { willReadFrequently: true });
const glCanvas = document.createElement("canvas");
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(S, S, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // the scene is in linear light; the last pass writes the display's curve
renderer.autoClear = false;
const target = (w, h, depth) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: depth, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
const rtScene = target(S, S, true), rtSum = target(S, S, false);
const q4 = Math.round(S / 4), q8 = Math.round(S / 8);
const rtG1 = target(q4, q4, false), rtG2 = target(q4, q4, false), rtW1 = target(q8, q8, false), rtW2 = target(q8, q8, false);

const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }";
function filter(frag, uniforms, extra = {}) {
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra });
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
  return { mat, run(to, clear = true) { renderer.setRenderTarget(to); if (clear) renderer.clear(); renderer.render(scene, flat); } };
}
const addPass = filter("uniform sampler2D src; uniform float weight; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(src, vUv).rgb * weight, 1.); }",
  { src: { value: rtScene.texture }, weight: { value: 1 } }, { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation });
// The soft glow: what is brighter than a threshold, made small, blurred, and laid back over the picture.
const brightPass = filter("uniform sampler2D src; uniform vec2 px; varying vec2 vUv; void main(){ vec3 c = vec3(0.); for(int x=0;x<2;x++) for(int y=0;y<2;y++){ c += texture2D(src, vUv + (vec2(float(x), float(y)) - .5) * 2. * px).rgb; } c *= .25; float l = c.r; gl_FragColor = vec4(vec3(max(0., l - 1.02)), 1.); }",
  { src: { value: rtSum.texture }, px: { value: new THREE.Vector2(1 / S, 1 / S) } });
const blurPass = filter("uniform sampler2D src; uniform vec2 step; varying vec2 vUv; void main(){ vec3 c = texture2D(src, vUv).rgb * .2270; c += (texture2D(src, vUv + step * 1.385).rgb + texture2D(src, vUv - step * 1.385).rgb) * .3162; c += (texture2D(src, vUv + step * 3.231).rgb + texture2D(src, vUv - step * 3.231).rgb) * .0703; gl_FragColor = vec4(c, 1.); }",
  { src: { value: null }, step: { value: new THREE.Vector2() } });
const copyPass = filter("uniform sampler2D src; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(src, vUv).rgb, 1.); }", { src: { value: null } });
const lastPass = filter(`uniform sampler2D src, glow, wide; varying vec2 vUv;
  void main(){
    float c = texture2D(src, vUv).r + texture2D(glow, vUv).r * .5 + texture2D(wide, vUv).r * .45;
    float r = length(vUv - .5) * 2.;
    c *= 1. - .42 * smoothstep(.55, 1.45, r);            // a soft vignette
    c = c / (1. + .08 * c);                              // a gentle shoulder, so white holds its shape
    c = pow(clamp(c, 0., 1.), 1. / 2.2);                 // linear light to the display
    gl_FragColor = vec4(vec3(c), 1.);
  }`, { src: { value: rtSum.texture }, glow: { value: rtG1.texture }, wide: { value: rtW1.texture } });

// ---- Words in space ---------------------------------------------------------
// A word is drawn once on a canvas (white on black) and used as the opacity of a
// white plane standing in the scene, so it takes the camera's blur and focus.
await Promise.all(['400 40px "DM Serif Display"', '400 40px "DM Sans"', '500 40px "DM Sans"', `${NUMERALS.weight} 40px "${NUMERALS.family}"`].map((f) => document.fonts.load(f)));
for (const f of ["DM Serif Display", "DM Sans", NUMERALS.family]) if (!document.fonts.check(`40px "${f}"`)) throw new Error(`the face ${f} did not load`);
const SERIF = '"DM Serif Display"', SANS = '"DM Sans"';
const NUM = `${NUMERALS.weight} `, NUMFACE = `"${NUMERALS.family}"`; // every figure: `${NUM}${size}px ${NUMFACE}`
const digitWidths = (() => { const c = document.createElement("canvas").getContext("2d"); c.font = `${NUM}100px ${NUMFACE}`; return [..."0123456789"].map((d) => c.measureText(d).width); })();
const words = []; // every plane of words, for the checks
function plane(name, w, h, smallest, draw, ink = [0, 0, w, h]) {
  const cv = document.createElement("canvas"); cv.width = w * 2; cv.height = h * 2;
  const ctx = cv.getContext("2d"); ctx.scale(2, 2);
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, alphaMap: tex, transparent: true, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); mesh.renderOrder = 10; mesh.frustumCulled = false;
  const self = { name, mesh, w, h, smallest, ink, redraw(...a) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#fff"; draw(ctx, ...a); tex.needsUpdate = true; } };
  self.redraw(); words.push(self);
  return self;
}
const spaced = (ctx, text, x, y, gap) => { // centred, with air between the letters
  const widths = [...text].map((ch) => ctx.measureText(ch).width + gap);
  let at = x - (widths.reduce((a, b) => a + b, 0) - gap) / 2;
  ctx.textAlign = "left";
  [...text].forEach((ch, i) => { ctx.fillText(ch, at, y); at += widths[i]; });
};

// ============================================================================
// Shot A: the globe
// ============================================================================
const sceneA = new THREE.Scene();
const camA = new THREE.PerspectiveCamera(FOV, 1, 0.05, 400);

// The world, drawn once as a flat picture the globe's shader reads: red is
// land, green is the United States, blue is the borders between countries.
// Natural Earth 1:50m by way of world-atlas (public domain).
const world = await (await fetch("/nm/world-atlas/countries-50m.json")).json();
const MW = 4096, MH = 2048;
const maskCv = document.createElement("canvas"); maskCv.width = MW; maskCv.height = MH;
{
  const ctx = maskCv.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, MW, MH);
  const path = geoPath(geoEquirectangular().scale(MW / (2 * Math.PI)).translate([MW / 2, MH / 2]), ctx);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#ff0000"; ctx.beginPath(); path(feature(world, world.objects.land)); ctx.fill();
  ctx.fillStyle = "#00ff00"; ctx.beginPath(); path(feature(world, world.objects.countries).features.find((f) => f.id === "840")); ctx.fill();
  ctx.strokeStyle = "#0000ff"; ctx.lineWidth = 1.6; ctx.beginPath(); path(borders(world, world.objects.countries, (a, b) => a !== b)); ctx.stroke();
}
const mask = new THREE.CanvasTexture(maskCv);
mask.wrapS = THREE.RepeatWrapping; mask.anisotropy = 8; mask.generateMipmaps = true; mask.minFilter = THREE.LinearMipmapLinearFilter;

const LIGHT = new THREE.Vector3(-0.55, 0.5, 0.67).normalize(); // a key light over the camera's left shoulder
const globeMat = new THREE.ShaderMaterial({
  uniforms: { mask: { value: mask }, light: { value: LIGHT }, usGlow: { value: 0 }, dotStep: { value: 1.25 } },
  vertexShader: "varying vec2 vUv; varying vec3 vN; varying vec3 vP; void main(){ vUv = uv; vN = normalMatrix * normal; vec4 p = modelViewMatrix * vec4(position, 1.); vP = p.xyz; gl_Position = projectionMatrix * p; }",
  fragmentShader: `uniform sampler2D mask; uniform vec3 light; uniform float usGlow, dotStep; varying vec2 vUv; varying vec3 vN; varying vec3 vP;
  void main(){
    float lon = (vUv.x - .5) * 360., lat = (vUv.y - .5) * 180.;
    // Land as a lattice of points: rows of latitude, each with as many points as its circle holds.
    float row = floor(lat / dotStep), latc = (row + .5) * dotStep;
    float n = max(1., floor(360. * cos(radians(latc)) / dotStep + .5));
    float lstep = 360. / n, lonc = (floor((lon + 180.) / lstep) + .5) * lstep - 180.;
    vec4 cell = textureLod(mask, vec2(lonc / 360. + .5, latc / 180. + .5), 0.);
    float d = length(vec2((lon - lonc) * cos(radians(lat)), lat - latc));
    float aa = max(fwidth(lat), fwidth(lon) * cos(radians(lat))) * .75 + 1e-4;
    float point = 1. - smoothstep(dotStep * .27 - aa, dotStep * .27 + aa, d);
    vec4 here = texture2D(mask, vUv);
    vec3 N = normalize(vN), V = normalize(-vP);
    float ndl = dot(N, light);
    float day = mix(.14, 1., smoothstep(-.3, .75, ndl));
    float rim = pow(1. - max(dot(N, V), 0.), 3.);
    float land = step(.5, cell.r), us = step(.5, cell.g);
    float c = .006 + here.r * .022 + here.b * .03 * (1. - us);
    c += point * land * mix(.22, 0., us);
    c += here.g * .05 * usGlow + point * us * mix(.22, 1.7, usGlow);
    // Meridians and parallels every fifteen degrees, barely there.
    vec2 g = abs(fract(vec2(lon, lat) / 15. + .5) - .5) * 15.;
    float lines = 1. - smoothstep(0., 1.5, min(g.x / max(fwidth(lon), 1e-4), g.y / max(fwidth(lat), 1e-4)));
    c += lines * .012;
    c = c * day + rim * .07 * smoothstep(-.2, .6, ndl);
    gl_FragColor = vec4(vec3(c), 1.);
  }`,
});
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 96), globeMat);
sceneA.add(globe);

// The air at the rim: a soft glow that falls away from the limb, brighter on the lit side.
const air = new THREE.Mesh(new THREE.SphereGeometry(1.6, 96, 48), new THREE.ShaderMaterial({
  side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { light: { value: LIGHT } },
  vertexShader: "varying vec3 vP; void main(){ vec4 p = modelViewMatrix * vec4(position, 1.); vP = p.xyz; gl_Position = projectionMatrix * p; }",
  fragmentShader: `uniform vec3 light; varying vec3 vP;
  void main(){
    vec3 centre = (viewMatrix * vec4(0., 0., 0., 1.)).xyz, dir = normalize(vP);
    float along = dot(centre, dir);
    vec3 near = dir * along - centre;                    // from the centre to where this line of sight passes closest
    float b = length(near);
    float lit = mix(.22, 1., smoothstep(-.5, .7, dot(near / max(b, 1e-4), light)));
    float g = (exp(-(b - 1.) / .035) * .28 + exp(-(b - 1.) / .16) * .08) * step(1., b) * (1. - smoothstep(1.2, 1.58, b));
    gl_FragColor = vec4(vec3(g * lit), 1.);
  }`,
}));
sceneA.add(air);

// Space: round points, far off, most of them faint.
{
  const roll = dice(1054), n = 1400, pos = new Float32Array(n * 3), look = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const z = roll() * 2 - 1, a = roll() * Math.PI * 2, r = Math.sqrt(1 - z * z), far = 14 + roll() * 70;
    pos.set([r * Math.cos(a) * far, z * far, r * Math.sin(a) * far], i * 3);
    look.set([1.1 + Math.pow(roll(), 3) * 1.9, 0.02 + Math.pow(roll(), 4) * 0.3], i * 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("look", new THREE.BufferAttribute(look, 2));
  const stars = new THREE.Points(geo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { k: { value: K } },
    vertexShader: "attribute vec2 look; uniform float k; varying float vL; void main(){ vL = look.y; gl_PointSize = look.x * 2. * k; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: "varying float vL; void main(){ float d = length(gl_PointCoord - .5) * 2.; gl_FragColor = vec4(vec3(vL * (1. - smoothstep(.55, 1., d))), 1.); }",
  }));
  stars.frustumCulled = false; stars.name = "stars"; sceneA.add(stars);
}

// The title, standing between the camera and the globe, so the push carries the camera past it.
const TITLE_Z = 2.0, TITLE_AT = 5.2 - 0.22 * 1.25 - TITLE_Z; // its distance from the camera at the middle of its read
const title = plane("title", 900, 150, 30, (ctx) => {
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = `400 60px ${SERIF}`; ctx.fillText(TITLE[0], 450, 62);
  ctx.font = `500 30px ${SANS}`; spaced(ctx, TITLE[1], 450, 126, 7);
}, [20, 8, 880, 140]);
title.mesh.scale.setScalar(TITLE_AT / PX);
title.mesh.position.set(0, (-0.66 - 0.2) * (TITLE_AT / FOCAL), TITLE_Z);
sceneA.add(title.mesh);

const Z_AXIS = new THREE.Vector3(0, 0, 1), X_AXIS = new THREE.Vector3(1, 0, 0), Y_AXIS = new THREE.Vector3(0, 1, 0);
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();
function poseA(t) {
  // The globe turns from the eastern Mediterranean to the United States, and comes to rest as the push begins.
  const e = outQuad(span(t, -0.4, 2.9));
  const lon = lerp(32, -97, e), lat = lerp(30, 38.5, e);
  qa.setFromAxisAngle(Z_AXIS, THREE.MathUtils.degToRad(turn(t)));
  qb.setFromAxisAngle(X_AXIS, THREE.MathUtils.degToRad(lat));
  qc.setFromAxisAngle(Y_AXIS, -Math.PI / 2 - THREE.MathUtils.degToRad(lon));
  globe.quaternion.copy(qa).multiply(qb).multiply(qc);
  sceneA.getObjectByName("stars").quaternion.setFromAxisAngle(Z_AXIS, THREE.MathUtils.degToRad(turn(t) * 0.7));
  globeMat.uniforms.usGlow.value = inOutCubic(span(t, 1.5, 2.9));
  const h = height(t);
  camA.position.set(0, 0, 1 + h); camA.quaternion.identity();
  title.mesh.material.opacity = inOutCubic(span(t, 0.2, 0.7)) * (1 - inOutCubic(span(t, BEAT - 0.05, BEAT + 0.45)));
  return { cam: camA, focus: h, open: openA(t) };
}

// ============================================================================
// Shot B: the United States, each state a form
// ============================================================================
const sceneB = new THREE.Scene();
const camB = new THREE.PerspectiveCamera(FOV, 1, 0.1, 300);
const MAP = await (await fetch("/map.json")).json();
const BASE = 0.06; // every state stands this high: the zero the six rise from
const PER_POINT = 2.1 / 10.9; // a form's height above that, in map units for each percentage point
const LATTICE = `float lattice(vec2 xz, float r){ vec2 f = fract(xz / .25) - .5; float d = length(f) * .25; float aa = (fwidth(xz.x) + fwidth(xz.y)) * .5 + 1e-4; return 1. - smoothstep(r - aa, r + aa, d); }`;

// The ground: the same lattice of points as the globe's land, fading out with distance.
const DIM = { value: 1 }; // the map's own light: it goes down to nothing as scene two's points take it
const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
  uniforms: { dim: DIM },
  vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
  fragmentShader: `uniform float dim; varying vec3 vW; ${LATTICE} void main(){ float far = 1. - smoothstep(5., 17., length(vW.xz)); gl_FragColor = vec4(vec3(.002 + lattice(vW.xz, .03) * .03 * far) * dim, 1.); }`,
}));
sceneB.add(ground);

const stateVert = "varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normal; gl_Position = projectionMatrix * viewMatrix * w; }";
const stateFrag = `uniform float lit, top, flash, dim; varying vec3 vW; varying vec3 vN; ${LATTICE}
  void main(){
    float up = step(.5, vN.y);
    float low = mix(.016, .010 + .04 * flash + lattice(vW.xz, mix(.03, .068, flash)) * mix(.15, 1.7, flash), up);
    float k = clamp(vW.y / max(top, 1e-3), 0., 1.);
    float wall = mix(.02, .46, pow(k, 1.7)) * (.9 + .1 * abs(dot(normalize(vN.xz + 1e-5), normalize(vec2(-.55, .83)))));
    float high = mix(wall, 1.5, up);
    gl_FragColor = vec4(vec3(mix(low, high, lit)) * dim, 1.);
  }`;
const poolMat = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { power: { value: 0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
  fragmentShader: "uniform float power; varying vec2 vUv; void main(){ float r = length(vUv - .5) * 2.; gl_FragColor = vec4(vec3(power * exp(-r * r * 4.5) * (1. - smoothstep(.8, 1., r))), 1.); }",
});

const states = new Map();
for (const st of MAP.states) {
  const rings = st.d.split("Z").filter(Boolean).map((r) => r.slice(1).split("L").map((p) => p.split(",").map(Number)).map(([x, y]) => [(x - 487.5) / 100, (y - 305) / 100]));
  const geo = new THREE.ExtrudeGeometry(rings.map((r) => new THREE.Shape(r.map(([x, z]) => new THREE.Vector2(x, -z)))), { depth: 1, bevelEnabled: false }).rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({ vertexShader: stateVert, fragmentShader: stateFrag, uniforms: { lit: { value: 0 }, top: { value: BASE }, flash: { value: 0 }, dim: DIM } });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, mat));
  const edge = new THREE.LineBasicMaterial({ color: 0xffffff });
  for (const r of rings) {
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(r.map(([x, z]) => new THREE.Vector3(x, 1.0, z))), edge);
    line.renderOrder = 1; group.add(line);
  }
  group.scale.y = BASE;
  sceneB.add(group);
  // The centre of its largest piece, and that piece's reach, for the label and the pool of light.
  let best = null;
  for (const r of rings) {
    let a = 0, cx = 0, cz = 0;
    for (let i = 0; i < r.length; i++) { const [x0, z0] = r[i], [x1, z1] = r[(i + 1) % r.length], f = x0 * z1 - x1 * z0; a += f; cx += (x0 + x1) * f; cz += (z0 + z1) * f; }
    if (!best || Math.abs(a) > Math.abs(best.a)) best = { a, x: cx / (3 * a), z: cz / (3 * a), reach: Math.max(...r.map(([x, z]) => Math.hypot(x - cx / (3 * a), z - cz / (3 * a)))) };
  }
  const flatRings = rings.flat();
  states.set(st.id, { group, mat, edge, rings, box: [Math.min(...flatRings.map((p) => p[0])), Math.min(...flatRings.map((p) => p[1])), Math.max(...flatRings.map((p) => p[0])), Math.max(...flatRings.map((p) => p[1]))], ...best });
}
const EDGE_LOW = 0.085;
for (const s of states.values()) s.edge.color.setScalar(EDGE_LOW);

// Where the camera comes to rest, and the pose the words face.
const albers = geoAlbersUsa().scale(1300).translate([487.5, 305]);
const [ux, uy] = albers([-97, 38.5]);
const T0 = new THREE.Vector3((ux - 487.5) / 100, 0, (uy - 305) / 100); // where the globe's centre was: under the camera at the cut
const T1 = new THREE.Vector3(0.05, 0, 0.1);
const Y_FIELD = 3.0, R_FIELD = 4.5; // scene two: how high over the map the field stands, and its reach
function cameraB(t, cam) {
  const e = inOutCubic(span(t, CUT + 0.05, CUT + 1.4));
  const at = T0.clone().lerp(T1, e);
  at.y += Y_FIELD * move(t) + AIM3 * look3(t); // scene two: the camera rises with the points it follows; scene three: it looks at the middle of the church
  qa.setFromAxisAngle(Y_AXIS, THREE.MathUtils.degToRad(-turn(t)));
  qb.setFromAxisAngle(X_AXIS, THREE.MathUtils.degToRad(-tilt(t)));
  cam.quaternion.copy(qa).multiply(qb);
  const d = height(t) * R_UNITS - PUSH3 * inOutCubic(span(t, GO3, GO3 + 5.5));
  cam.position.set(0, 0, d).applyQuaternion(cam.quaternion).add(at);
  return d;
}
const FACE_AT = 7.5; // the moment the words stand square to the camera
const facing = new THREE.PerspectiveCamera(FOV, 1, 0.1, 300);
const FACE_D = cameraB(FACE_AT, facing);
facing.updateMatrixWorld();
const faceRight = new THREE.Vector3(1, 0, 0).applyQuaternion(facing.quaternion), faceUp = new THREE.Vector3(0, 1, 0).applyQuaternion(facing.quaternion), faceFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(facing.quaternion);
const UNIT = FACE_D / PX; // a word's px, in map units, at the distance the camera focuses on

// The six: each gets a pool of light at its foot and a label that rides its top.
const six = SIX.map((s, i) => {
  const st = states.get(s.id);
  const full = BASE + s.share * PER_POINT;
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat());
  pool.position.set(st.x, BASE + 0.004, st.z); pool.scale.setScalar((st.reach + 1.1) * 2); pool.renderOrder = 2; sceneB.add(pool);
  let half = 0;
  const label = plane(`label ${s.name}`, 260, 96, 30, (ctx) => {
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = `500 30px ${SANS}`; ctx.fillText(s.name, 130, 32); half = ctx.measureText(s.name).width / 2;
    ctx.font = `${NUM}48px ${NUMFACE}`; ctx.fillText(`${s.share.toFixed(1)}%`, 130, 84); half = Math.max(half, ctx.measureText(`${s.share.toFixed(1)}%`).width / 2);
  });
  label.ink = [130 - half - 3, 4, 130 + half + 3, 92];
  sceneB.add(label.mesh);
  label.mesh.quaternion.copy(facing.quaternion);
  // A hairline from the label to the top of its form, so each figure is tied to its state.
  const pinGeo = new THREE.BufferGeometry(); pinGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3)); pinGeo.setIndex([0, 1, 2, 2, 1, 3]);
  const pin = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  pin.renderOrder = 9; pin.frustumCulled = false; sceneB.add(pin);
  return { ...s, i, st, full, pool, label, half, pin };
});
// Where each label stands from the middle of its form's top: across, up and along the facing camera's axes, in word px.
const OFFSET = { "06": [0, 112], "36": [40, 126], "17": [-135, 6], "12": [-195, -18], "34": [78, -134], "42": [-128, 150] };
for (const [id, o] of Object.entries(JSON.parse(QUERY.get("offsets") || "{}"))) OFFSET[id] = o;
function placeLabel(s, top) {
  const [dx, dy] = OFFSET[s.id];
  const p = new THREE.Vector3(s.st.x, top, s.st.z);
  const depth = p.clone().sub(facing.position).dot(faceFwd), unit = depth / PX; // the same size on screen wherever it stands
  s.label.mesh.scale.setScalar(unit);
  s.label.mesh.position.copy(p).addScaledVector(faceRight, dx * unit).addScaledVector(faceUp, dy * unit);
  // The pin runs from just off the form's top to the edge of the label's words.
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const reach = Math.min((s.half + 10) / Math.abs(ux || 1e-6), 52 / Math.abs(uy || 1e-6));
  const a = 7, b = Math.max(a, len - reach), wide = 1.1;
  const at = (along, side) => p.clone().addScaledVector(faceRight, (ux * along - uy * side) * unit).addScaledVector(faceUp, (uy * along + ux * side) * unit);
  const v = s.pin.geometry.attributes.position;
  [at(a, wide), at(a, -wide), at(b, wide), at(b, -wide)].forEach((q, j) => v.setXYZ(j, q.x, q.y, q.z));
  v.needsUpdate = true;
}

// The figure: in the air over the northern states, at the distance the camera focuses on.
const FIG_W = 1000, FIG_H = 330;
const figure = plane("figure", FIG_W, FIG_H, 36, (ctx, value = 0, caption = 0) => {
  ctx.textBaseline = "alphabetic";
  ctx.font = `${NUM}208px ${NUMFACE}`;
  // Each digit in a cell of its own; the face's digits are all one width, so the cells are the face's own.
  const text = value.toFixed(1), cell = ctx.measureText("0").width, dot = ctx.measureText(".").width, pct = ctx.measureText("%").width;
  const width = [...text].reduce((w, ch) => w + (ch === "." ? dot : cell), 0) + pct + 6;
  let x = FIG_W / 2 - width / 2;
  for (const ch of text) { const w = ch === "." ? dot : cell; ctx.textAlign = "center"; ctx.fillText(ch, x + w / 2, 212); x += w; }
  ctx.textAlign = "left"; ctx.fillText("%", x + 6, 212);
  ctx.globalAlpha = caption; ctx.textAlign = "center"; ctx.font = `400 37px ${SANS}`; ctx.fillText(CAPTION, FIG_W / 2, 292 + (1 - caption) * 10); ctx.globalAlpha = 1;
}, [40, 40, FIG_W - 40, 310]);
const FIG_UP = Number(QUERY.get("figup") || 535); // the figure's middle, in px above the point the camera looks at
figure.mesh.quaternion.copy(facing.quaternion);
figure.mesh.scale.setScalar(UNIT);
figure.mesh.position.copy(T1).addScaledVector(faceUp, FIG_UP * UNIT);
sceneB.add(figure.mesh);

// ============================================================================
// Scene two: the gap. The same scene and the same camera as the map: no cut.
// ============================================================================
const CENTRE = T1.clone().setY(Y_FIELD); // the middle of the field
const FACE2_AT = 17.6; // the moment scene two's words stand square to the camera
const facing2 = new THREE.PerspectiveCamera(FOV, 1, 0.1, 300);
const FACE2_D = cameraB(FACE2_AT, facing2);
facing2.updateMatrixWorld();
const right2 = new THREE.Vector3(1, 0, 0).applyQuaternion(facing2.quaternion), up2 = new THREE.Vector3(0, 1, 0).applyQuaternion(facing2.quaternion), fwd2 = new THREE.Vector3(0, 0, -1).applyQuaternion(facing2.quaternion);
const UNIT2 = FACE2_D / PX;

// One point of light for every hundred people: 6,758 on the rolls, 1,830 on a typical Sunday.
const N_ROLLS = Math.round(ROLLS / PEOPLE_A_POINT), N_SUNDAY = Math.round(SUNDAY / PEOPLE_A_POINT);
const inside = (rings, x, z) => { let c = false; for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const people = (() => {
  // Where each point stands in the field: a lattice of equal triangles, and of it the N nearest the middle.
  const pitch = Math.sqrt((Math.PI * R_FIELD * R_FIELD) / N_ROLLS / (Math.sqrt(3) / 2)), rowGap = (pitch * Math.sqrt(3)) / 2;
  const reach = Math.ceil((R_FIELD * 1.2) / rowGap), lattice = [];
  for (let j = -reach; j <= reach; j++) for (let i = -reach; i <= reach; i++) { const x = (i + (j & 1) * 0.5) * pitch, z = j * rowGap; lattice.push({ x, z, r: Math.hypot(x, z) }); }
  lattice.sort((a, b) => a.r - b.r || Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
  const sites = lattice.slice(0, N_ROLLS);
  // Where each point leaves the map. The six states give their checked shares of the points, from the tops
  // of their forms; no other state has a checked figure, so the rest leave evenly from the other states.
  const origins = [];
  let rest = N_ROLLS;
  for (const s of six) {
    const n = Math.round((s.share / 100) * N_ROLLS), [x0, z0, x1, z1] = s.st.box;
    for (let k = 1, got = 0; got < n; k++) { const x = lerp(x0, x1, halton(k, 2)), z = lerp(z0, z1, halton(k, 3)); if (inside(s.st.rings, x, z)) { origins.push({ x, y: s.full + 0.012, z, six: 1 }); got++; } }
    rest -= n;
  }
  const others = [...states.entries()].filter(([id]) => !SIX.some((s) => s.id === id)).map(([, st]) => st);
  const all = [Math.min(...others.map((st) => st.box[0])), Math.min(...others.map((st) => st.box[1])), Math.max(...others.map((st) => st.box[2])), Math.max(...others.map((st) => st.box[3]))];
  for (let k = 1, got = 0; got < rest; k++) {
    const x = lerp(all[0], all[2], halton(k, 2)), z = lerp(all[1], all[3], halton(k, 3));
    if (others.some((st) => x >= st.box[0] && x <= st.box[2] && z >= st.box[1] && z <= st.box[3] && inside(st.rings, x, z))) { origins.push({ x, y: BASE + 0.012, z, six: 0 }); got++; }
  }
  // Each point goes to the site that keeps its place among the others (west stays west, north stays north), so no two paths cross.
  const ranked = (list) => { const per = Math.ceil(list.length / Math.ceil(Math.sqrt(list.length))), byX = [...list].sort((a, b) => a.x - b.x), out = []; for (let i = 0; i < byX.length; i += per) out.push(...byX.slice(i, i + per).sort((a, b) => a.z - b.z)); return out; };
  const from = ranked(origins), to = ranked(sites);
  // Who stays: 1,830 of the 6,758, drawn by a fixed dice from all over the field, since the source parts them by no place.
  const roll = dice(183020), order = from.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(roll() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const stays = new Uint8Array(N_ROLLS); for (let i = 0; i < N_SUNDAY; i++) stays[order[i]] = 1;
  // Those who stay draw together: each to the free site nearest to where a plain drawing in would put it.
  const shrink = Math.sqrt(N_SUNDAY / N_ROLLS), free = sites.slice(0, N_SUNDAY).map((s) => ({ x: s.x, z: s.z, taken: false })), inner = new Array(N_ROLLS);
  for (const i of [...order.slice(0, N_SUNDAY)].sort((a, b) => to[a].r - to[b].r)) {
    let best = -1, bestD = Infinity;
    for (let k = 0; k < free.length; k++) { if (free[k].taken) continue; const d = (free[k].x - to[i].x * shrink) ** 2 + (free[k].z - to[i].z * shrink) ** 2; if (d < bestD) { bestD = d; best = k; } }
    free[best].taken = true; inner[i] = free[best];
  }
  const fx = fwd2.x / Math.hypot(fwd2.x, fwd2.z), fz = fwd2.z / Math.hypot(fwd2.x, fwd2.z);
  const pos = new Float32Array(N_ROLLS * 3), site = new Float32Array(N_ROLLS * 3), close = new Float32Array(N_ROLLS * 3), how = new Float32Array(N_ROLLS * 4);
  const leaves = [], falls = [];
  for (let i = 0; i < N_ROLLS; i++) {
    const o = from[i], s = to[i], seed = roll();
    pos.set([o.x, o.y, o.z], i * 3);
    site.set([CENTRE.x + s.x, Y_FIELD, CENTRE.z + s.z], i * 3);
    const c = stays[i] ? inner[i] : s; close.set([CENTRE.x + c.x, Y_FIELD, CENTRE.z + c.z], i * 3);
    const leave = (o.six ? 0 : 0.15) + roll() * (LIFT_LAG - 0.15); // the six states' points leave first
    const far = (s.x * fx + s.z * fz) / R_FIELD; // 1 at the far edge, -1 at the near one
    const then = stays[i] ? roll() * 0.25 : SWEEP * (1 - (far + 1) / 2) + STRAGGLE * roll();
    how.set([leave, then, stays[i], seed], i * 4);
    leaves.push(leave); if (!stays[i]) falls.push(then);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("site", new THREE.BufferAttribute(site, 3));
  geo.setAttribute("close", new THREE.BufferAttribute(close, 3)); geo.setAttribute("how", new THREE.BufferAttribute(how, 4));
  const f = (x) => x.toFixed(4);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, px: { value: PX * K }, k: { value: K }, centre: { value: CENTRE } },
    vertexShader: `attribute vec3 site, close; attribute vec4 how; uniform float t, px, k; uniform vec3 centre; varying float vA;
      float io(float x){ x = clamp(x, 0., 1.); return x < .5 ? 4. * x * x * x : 1. - pow(-2. * x + 2., 3.) / 2.; }
      void main(){
        float e = io((t - ${f(GO)} - how.x) / ${f(LIFT_FOR)}), arc = sin(e * 3.14159265);
        vec3 p = mix(position, site, e);
        p.y += arc * (.45 + 1.0 * how.w);                       // each rises a little past the field and settles into it
        float a = arc * .55 * (.35 + how.w);                    // and curls about the middle on its way
        vec2 d = p.xz - centre.xz; p.xz = centre.xz + vec2(cos(a) * d.x - sin(a) * d.y, sin(a) * d.x + cos(a) * d.y);
        float shown = smoothstep(0., .3, t - ${f(GO)} - how.x * .6), light = mix(1.0, 1.12, e), size = .022;
        if (how.z < .5) { float fall = clamp((t - ${f(THIN)} - how.y) / ${f(FALL_FOR)}, 0., 1.); p.y -= fall * fall * 1.3; shown *= 1. - smoothstep(.1, .95, fall); }
        else { float c = io((t - ${f(THINNED)} - how.y) / ${f(CLOSE_FOR - 0.25)}); p = mix(p, close, c); light = mix(light, 2.1, c); size = mix(size, .026, c); }
        vec4 v = modelViewMatrix * vec4(p, 1.);
        float wide = 2. * size * px / max(-v.z, .5), least = 1.6 * k;
        gl_PointSize = max(wide, least);
        vA = shown * light * min(1., (wide * wide) / (least * least));
        gl_Position = projectionMatrix * v;
      }`,
    fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - .5) * 2.; gl_FragColor = vec4(vec3(vA * (1. - smoothstep(.55, 1., d))), 1.); }",
  });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false; points.renderOrder = 5; points.visible = false; sceneB.add(points);
  // The edge of the full field, a fine ring: it stays when the points fall, so the eye keeps the size of the rolls.
  const edge = R_FIELD + pitch * 0.9;
  const ring = new THREE.Mesh(new THREE.RingGeometry(edge, edge + 0.024, 256).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  ring.material.color.setScalar(0.42); ring.position.copy(CENTRE); ring.renderOrder = 4; ring.visible = false; sceneB.add(ring);
  leaves.sort((a, b) => a - b); falls.sort((a, b) => a - b);
  const before = (sorted, x) => { let lo = 0, hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] <= x) lo = mid + 1; else hi = mid; } return lo; };
  /** The count at time t: it rises with the points that have reached the field, then falls with those that have left it. */
  const count = (t) => {
    if (t >= THINNED) return SUNDAY;
    if (t >= THIN) return Math.round(ROLLS - (ROLLS - SUNDAY) * (before(falls, t - THIN - FALL_FOR * 0.5) / falls.length));
    if (t >= STOOD) return ROLLS;
    return Math.round(ROLLS * (before(leaves, t - GO - LIFT_FOR * 0.92) / leaves.length));
  };
  return { points, mat, ring, count, fromSix: origins.filter((o) => o.six).length };
})();

// The count: in the air over the far edge of the field. Seven cells that never move, so the figure runs like a counter.
const count = plane("count", FIG_W, FIG_H, 37, (ctx, value = 0, rolls = 0, sunday = 0) => {
  ctx.textBaseline = "alphabetic"; ctx.font = `${NUM}196px ${NUMFACE}`;
  const text = value.toLocaleString("en-US").padStart(7, " "), cell = ctx.measureText("0").width, comma = ctx.measureText(",").width;
  let x = FIG_W / 2 - (6 * cell + comma) / 2;
  ctx.textAlign = "center";
  [...text].forEach((ch, i) => { const w = i === 3 ? comma : cell; if (ch !== " ") ctx.fillText(ch, x + w / 2, 212); x += w; }); // the fourth cell is the comma's
  ctx.font = `400 37px ${SANS}`; ctx.textAlign = "center";
  ctx.globalAlpha = rolls; ctx.fillText(CAPTION_ROLLS, FIG_W / 2, 292 + (1 - rolls) * 10);
  ctx.globalAlpha = sunday; ctx.fillText(CAPTION_SUNDAY, FIG_W / 2, 292 + (1 - sunday) * 10); ctx.globalAlpha = 1;
}, [40, 40, FIG_W - 40, 310]);
const COUNT_UP = Number(QUERY.get("countup") || 405); // the count's middle, in px above the middle of the field
count.mesh.quaternion.copy(facing2.quaternion);
count.mesh.scale.setScalar(UNIT2);
count.mesh.position.copy(CENTRE).addScaledVector(up2, COUNT_UP * UNIT2);
count.mesh.material.opacity = 0;
sceneB.add(count.mesh);

// The share: it stands at the near edge of those who stayed.
const SHARE_W = 440, SHARE_H = 120;
let shareHalf = 0;
const share = plane("share", SHARE_W, SHARE_H, 34, (ctx) => {
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.font = `${NUM}104px ${NUMFACE}`; const w1 = ctx.measureText(`${SHARE}%`).width;
  ctx.font = `500 34px ${SANS}`; const w2 = ctx.measureText(SHARE_LINE).width, gap = 18;
  shareHalf = (w1 + gap + w2) / 2; const x = SHARE_W / 2 - shareHalf;
  ctx.font = `${NUM}104px ${NUMFACE}`; ctx.fillText(`${SHARE}%`, x, 100);
  ctx.font = `500 34px ${SANS}`; ctx.fillText(SHARE_LINE, x + w1 + gap, 100);
});
share.ink = [SHARE_W / 2 - shareHalf - 4, 20, SHARE_W / 2 + shareHalf + 4, 108];
const SHARE_DOWN = Number(QUERY.get("sharedown") || 240); // its middle, in px below the middle of the field
share.mesh.quaternion.copy(facing2.quaternion);
share.mesh.position.copy(CENTRE).addScaledVector(up2, -SHARE_DOWN * UNIT2);
share.mesh.material.opacity = 0;
sceneB.add(share.mesh);
if (Math.round((SUNDAY / ROLLS) * 100) !== Number(SHARE)) throw new Error("the share is not the two counts divided");

// ============================================================================
// Scene three: the Church. The same scene and the same camera as the map and
// the field: no cut. Those who stay leave their round body for the lines of a
// plan, the drawing rises from the plan, they go in and stand in the nave, and
// the stone rises after the drawing and closes over them. Their light is then
// the light in the windows. The cross is drawn last.
// ============================================================================
const FLOOR = CENTRE.clone(); // the church's floor is the level of the field, and its dome stands over the field's middle
const FACE3_AT = GO3 + 10.6; // the moment scene three's words stand square to the camera
const facing3 = new THREE.PerspectiveCamera(FOV, 1, 0.1, 300);
const FACE3_D = cameraB(FACE3_AT, facing3);
facing3.updateMatrixWorld();
const up3 = new THREE.Vector3(0, 1, 0).applyQuaternion(facing3.quaternion);
const UNIT3 = FACE3_D / PX;

const church = (() => {
  const group = new THREE.Group(); group.position.copy(FLOOR); group.visible = false; sceneB.add(group);
  const f32 = (list) => new THREE.BufferAttribute(new Float32Array(list), 3);
  const SHADE = 1536, shade = new THREE.WebGLRenderTarget(SHADE, SHADE, { depthBuffer: true, depthTexture: new THREE.DepthTexture(SHADE, SHADE) });
  const U = { level: { value: -1 }, sun: { value: new THREE.Vector3(0, 1, 0) }, power: { value: 0 }, shade: { value: shade.depthTexture }, toLight: { value: new THREE.Matrix4() }, eye: { value: new THREE.Vector3() }, ink: { value: -1 }, glow: { value: 0 }, ground: { value: 0 } };
  const LEVEL = { value: -1 }; // the cross has a level of its own: it comes last
  // Matte stone in soft light. Each drawing of a frame is lit from one direction, with a true shadow from a map of
  // depths seen from the light; a frame is three dozen drawings, a third of them from about the key light and the
  // rest from all over the sky, so the average is a soft key, soft shadows and the darkening of every corner.
  const HEAD = `uniform float level, power; uniform vec3 sun, eye; uniform sampler2D shade; uniform mat4 toLight; varying vec3 vW; varying vec3 vN; varying float vH;
    float lit(vec3 p){ vec4 q = toLight * vec4(p, 1.); vec3 c = q.xyz / q.w * .5 + .5; float s = 0.;
      for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) s += step(c.z - .0009, texture2D(shade, c.xy + vec2(float(x), float(y)) * ${(1.2 / SHADE).toFixed(6)}).r);
      return s / 9.; }`;
  const VERT = "varying vec3 vW; varying vec3 vN; varying float vH; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normal; vH = position.y; gl_Position = projectionMatrix * viewMatrix * w; }";
  const stoneMat = (level) => new THREE.ShaderMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, uniforms: { ...U, level }, vertexShader: VERT,
    fragmentShader: `${HEAD} void main(){ if (vH > level) discard;
      vec3 N = normalize(vN); if (dot(N, eye - vW) < 0.) N = -N;
      float c = .86 * power * max(dot(N, sun), 0.) * lit(vW + N * .014);
      c += 1.5 * exp(-(level - vH) / .03);               // the course being laid: a fine bright line at the stone's own top
      gl_FragColor = vec4(vec3(c), 1.); }` });
  const depthMat = (level) => new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { level }, vertexShader: "varying float vH; void main(){ vH = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }", fragmentShader: "uniform float level; varying float vH; void main(){ if (vH > level) discard; gl_FragColor = vec4(1.); }" });
  const shadeScene = new THREE.Scene();
  const solid = (geo, level) => { const m = new THREE.Mesh(geo, stoneMat(level)); m.frustumCulled = false; group.add(m); const s = new THREE.Mesh(geo, depthMat(level)); s.position.copy(FLOOR); s.frustumCulled = false; shadeScene.add(s); return m; };

  const stoneGeo = new THREE.BufferGeometry(); stoneGeo.setAttribute("position", f32(CHURCH.tri)); stoneGeo.setAttribute("normal", f32(CHURCH.nor));
  solid(stoneGeo, U.level);
  // The plain cross: one upright and one bar, across the church.
  const k = FORM.cross, foot = TOP + k.foot;
  const upright = new THREE.BoxGeometry(k.bar, k.h, k.bar).translate(0, foot + k.h / 2, 0), bar = new THREE.BoxGeometry(k.bar, k.bar, k.w).translate(0, foot + k.at + k.bar / 2, 0);
  solid(upright, LEVEL); solid(bar, LEVEL);
  // The ground it stands on: a soft pool of light that falls away to black before the ring.
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.4, 96).rotateX(-Math.PI / 2).translate(0, -0.004, 0), new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT,
    fragmentShader: `${HEAD} uniform float ground; void main(){ float r = length(vW.xz - vec2(${FLOOR.x.toFixed(4)}, ${FLOOR.z.toFixed(4)}));
      float c = .5 * power * max(sun.y, 0.) * lit(vW + vec3(0., .014, 0.)) * (1. - smoothstep(1.3, 3.4, r)) * ground; gl_FragColor = vec4(vec3(c), 1.); }` }));
  pool.frustumCulled = false; group.add(pool);
  // The windows: dark glass until the stone has passed them, then the light of those inside.
  const glassGeo = new THREE.BufferGeometry(); glassGeo.setAttribute("position", f32(CHURCH.glass)); glassGeo.setAttribute("sill", new THREE.BufferAttribute(new Float32Array(CHURCH.sill), 1));
  const glass = new THREE.Mesh(glassGeo, new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: U,
    vertexShader: "attribute float sill; varying float vH; varying float vS; void main(){ vH = position.y; vS = sill; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: "uniform float level, glow; varying float vH; varying float vS; void main(){ if (vH > level) discard; gl_FragColor = vec4(vec3(.012 + 1.7 * glow * smoothstep(vS + .1, vS + .7, level)), 1.); }" }));
  glass.frustumCulled = false; group.add(glass);
  // The drawing: fine lines of light, shown from the floor up, brightest where the pen is, and gone where the stone has come.
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute("position", f32(CHURCH.lines));
  const drawing = new THREE.LineSegments(lineGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
    vertexShader: "varying float vH; void main(){ vH = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: "uniform float level, ink; varying float vH; void main(){ if (vH > ink) discard; float left = 1. - smoothstep(-.04, .22, level - vH); gl_FragColor = vec4(vec3((1.15 + 2.6 * exp(-(ink - vH) / .1)) * left), 1.); }" }));
  drawing.frustumCulled = false; drawing.renderOrder = 3; group.add(drawing);
  const planPts = []; for (const line of CHURCH.plan) for (let i = 0; i + 1 < line.length; i++) planPts.push(line[i][0], 0.006, line[i][1], line[i + 1][0], 0.006, line[i + 1][1]);
  const planGeo = new THREE.BufferGeometry(); planGeo.setAttribute("position", f32(planPts));
  const plan = new THREE.LineSegments(planGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  plan.frustumCulled = false; plan.renderOrder = 3; group.add(plan);
  // The cross's own outline, drawn round once before it stands in stone.
  const outline = []; { const o = CHURCH.crossOutline, per = 10; for (let i = 0; i + 1 < o.length; i++) for (let j = 0; j < per; j++) outline.push(lerp(o[i][0], o[i + 1][0], j / per), lerp(o[i][1], o[i + 1][1], j / per), lerp(o[i][2], o[i + 1][2], j / per)); outline.push(...o[o.length - 1]); }
  const signGeo = new THREE.BufferGeometry(); signGeo.setAttribute("position", f32(outline));
  const sign = new THREE.Line(signGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sign.frustumCulled = false; sign.renderOrder = 3; group.add(sign);

  // ---- The 1,830 who stay, now in the hand's own keeping: each from its place in the round body, to a place on
  // the plan's lines, to a place to stand in the nave. They are the same points, the same size and light, at GO3.
  const src = people.points.geometry.attributes, ids = [];
  for (let i = 0; i < src.how.count; i++) if (src.how.getZ(i) > 0.5) ids.push(i);
  const N = ids.length;
  const from = ids.map((i) => [src.close.getX(i) - FLOOR.x, src.close.getZ(i) - FLOOR.z]);
  const onPlan = (() => { // N places, evenly along every line of the plan
    const legs = []; let total = 0;
    for (const line of CHURCH.plan) for (let i = 0; i + 1 < line.length; i++) { const len = Math.hypot(line[i + 1][0] - line[i][0], line[i + 1][1] - line[i][1]); legs.push([line[i], line[i + 1], total, len]); total += len; }
    const out = []; let leg = 0;
    for (let n = 0; n < N; n++) { const s = ((n + 0.5) / N) * total; while (leg + 1 < legs.length && legs[leg][2] + legs[leg][3] < s) leg++; const [p, q, at, len] = legs[leg], u = (s - at) / len; out.push([lerp(p[0], q[0], u), lerp(p[1], q[1], u)]); }
    return out;
  })();
  const inNave = (() => { // N places to stand: a lattice of equal triangles over the nave and the narthex, west of the icon screen
    let sites = [];
    for (let pitch = 0.075; sites.length < N; pitch *= 0.985) {
      sites = []; const row = (pitch * Math.sqrt(3)) / 2;
      for (let j = -40; j <= 40; j++) for (let i = -60; i <= 60; i++) { const x = (i + (j & 1) * 0.5) * pitch, z = j * row; if (stands(x, z)) sites.push([x, z]); }
    }
    return sites.sort((p, q) => Math.hypot(p[0] + 0.3, p[1]) - Math.hypot(q[0] + 0.3, q[1])).slice(0, N);
  })();
  // Each keeps its bearing about the middle, and its order outward within a bearing, so paths do not cross.
  const ordered = (list) => { const by = list.map((p, i) => ({ i, a: Math.atan2(p[1], p[0]), r: Math.hypot(p[0], p[1]) })).sort((u, v) => u.a - v.a), per = Math.ceil(Math.sqrt(list.length)), out = []; for (let n = 0; n < by.length; n += per) out.push(...by.slice(n, n + per).sort((u, v) => u.r - v.r)); return out.map((o) => o.i); };
  const oa = ordered(from), ob = ordered(onPlan), oc = ordered(inNave), roll = dice(2014);
  const way = new Float32Array(N * 9), pos = new Float32Array(N * 3), light = new Float32Array(N);
  for (let n = 0; n < N; n++) way.set([...from[oa[n]], ...onPlan[ob[n]], ...inNave[oc[n]], roll(), roll(), roll()], n * 9);
  const flockGeo = new THREE.BufferGeometry(); flockGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); flockGeo.setAttribute("glow", new THREE.BufferAttribute(light, 1));
  const flock = new THREE.Points(flockGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { px: { value: PX * K }, k: { value: K }, size: { value: 0.026 } },
    vertexShader: "attribute float glow; uniform float px, k, size; varying float vA; void main(){ vec4 v = modelViewMatrix * vec4(position, 1.); float wide = 2. * size * px / max(-v.z, .5), least = 1.6 * k; gl_PointSize = max(wide, least); vA = glow * min(1., (wide * wide) / (least * least)); gl_Position = projectionMatrix * v; }",
    fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - .5) * 2.; gl_FragColor = vec4(vec3(vA * (1. - smoothstep(.55, 1., d))), 1.); }" }));
  flock.frustumCulled = false; flock.renderOrder = 5; flock.visible = false; sceneB.add(flock);
  const io = (x) => inOutCubic(clamp(x));
  function gather(t) {
    for (let n = 0; n < N; n++) {
      const o = n * 9, e1 = io((t - PLAN_AT - PLAN_LAG * way[o + 6]) / PLAN_FOR), e2 = io((t - IN_AT - IN_LAG * way[o + 7]) / IN_FOR);
      const x = lerp(lerp(way[o], way[o + 2], e1), way[o + 4], e2), z = lerp(lerp(way[o + 1], way[o + 3], e1), way[o + 5], e2);
      pos[n * 3] = FLOOR.x + x; pos[n * 3 + 1] = FLOOR.y + Math.sin(Math.PI * e1) * (0.12 + 0.3 * way[o + 8]) + 0.02 * e2; pos[n * 3 + 2] = FLOOR.z + z;
      light[n] = lerp(lerp(2.1, 0.7, e1), 1.3, e2); // close along a line they would burn, so each dims as it lands
    }
    flockGeo.attributes.position.needsUpdate = true; flockGeo.attributes.glow.needsUpdate = true;
    flock.material.uniforms.size.value = lerp(0.026, 0.02, io((t - IN_AT) / (IN_LAG + IN_FOR)));
  }

  const rise = (x) => lerp(x, x * x * (3 - 2 * x), 0.7); // steady, with a soft start and a soft end
  const HEIGHT = TOP + 0.2, CROSS_TOP = foot + k.h + 0.02;
  function pose(t) {
    const on = t > GO3;
    group.visible = on; flock.visible = on && t < BUILT + 0.2;
    if (!on) return;
    gather(t);
    U.ink.value = t < DRAW ? -1 : HEIGHT * rise(span(t, DRAW, DRAWN));
    U.level.value = t < BUILD ? -1 : HEIGHT * rise(span(t, BUILD, BUILT));
    U.ground.value = inOutCubic(span(t, BUILD - 0.5, BUILD + 1.2));
    U.glow.value = lerp(0.6, 1, inOutCubic(span(t, BUILT - 0.8, BUILT + 0.8)));
    plan.material.color.setScalar(0.9 * inOutCubic(span(t, PLAN_AT + 0.3, PLAN_AT + PLAN_LAG + PLAN_FOR)) * (1 - 0.6 * span(t, BUILD, BUILD + 1.5)));
    plan.visible = t < BUILT;
    const drawn = span(t, SIGN, SIGN + 0.55), stood = span(t, SIGN + 0.4, SIGNED);
    sign.visible = drawn > 0 && stood < 1; signGeo.setDrawRange(0, Math.max(2, Math.round(drawn * (outline.length / 3))));
    sign.material.color.setScalar(2.4 * (1 - inOutCubic(stood)));
    LEVEL.value = stood <= 0 ? -1 : lerp(foot, CROSS_TOP, outCubic(stood));
  }
  // The light for one drawing of a frame.
  const KEY_LIGHT = new THREE.Vector3(-0.6, 0.62, 0.5).normalize(), KEY_POWER = 0.82, SKY_POWER = 0.55;
  const lamp = new THREE.OrthographicCamera(-5.2, 5.2, 5.2, -5.2, 8, 34), target = FLOOR.clone().setY(FLOOR.y + 1.4);
  const side = new THREE.Vector3().crossVectors(KEY_LIGHT, Y_AXIS).normalize(), over = new THREE.Vector3().crossVectors(side, KEY_LIGHT).normalize();
  function light_(i, n, t, cam) {
    const keys = Math.ceil(n / 3), u = halton(i + 1, 5), v = halton(i + 1, 7), sun = U.sun.value;
    if (i % 3 === 0) { sun.copy(KEY_LIGHT).addScaledVector(side, (u - 0.5) * 0.2).addScaledVector(over, (v - 0.5) * 0.2).normalize(); U.power.value = (KEY_POWER * n) / keys; }
    else { const y = 0.25 + 0.72 * u, r = Math.sqrt(1 - y * y); sun.set(r * Math.cos(2 * Math.PI * v), y, r * Math.sin(2 * Math.PI * v)); U.power.value = (SKY_POWER * n) / (n - keys); }
    U.eye.value.copy(cam.position);
    if (U.level.value < 0 && U.ground.value <= 0) return;
    lamp.position.copy(target).addScaledVector(sun, 20); lamp.lookAt(target); lamp.updateMatrixWorld(true);
    U.toLight.value.multiplyMatrices(lamp.projectionMatrix, lamp.matrixWorldInverse);
    renderer.setRenderTarget(shade); renderer.clear(); renderer.render(shadeScene, lamp);
  }
  return { pose, light: light_, flock: N, stone: CHURCH.tri.length / 9 };
})();

// The figure of scene three: over the dome, in the dark above the cross.
const parishes = plane("parishes", 760, 250, 37, (ctx, caption = 0) => {
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "center";
  ctx.font = `${NUM}150px ${NUMFACE}`; ctx.fillText(PARISHES.toLocaleString("en-US"), 380, 150);
  ctx.globalAlpha = caption; ctx.font = `400 37px ${SANS}`; ctx.fillText(CAPTION_PARISHES, 380, 218 + (1 - caption) * 10); ctx.globalAlpha = 1;
}, [60, 30, 700, 235]);
const PARISH_UP = Q3("parishup", 520); // its middle, in px above the point the camera looks at
parishes.mesh.quaternion.copy(facing3.quaternion);
parishes.mesh.position.copy(FLOOR).setY(FLOOR.y + AIM3).addScaledVector(up3, PARISH_UP * UNIT3);
parishes.mesh.material.opacity = 0;
sceneB.add(parishes.mesh);

// Motes of dust near the lens, far out of focus: drawn once a frame as soft discs the size the lens would give them.
const DUST = 46;
const dust = (() => {
  const roll = dice(1113), pos = new Float32Array(DUST * 3), seed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { pos.set([(roll() - 0.5) * 15, 2.5 + roll() * 9, -3 + roll() * 15], i * 3); seed[i] = roll(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { focus: { value: 16 }, open: { value: 0.05 }, px: { value: PX * K }, power: { value: 1 }, drift: { value: 0 } },
    vertexShader: `attribute float seed; uniform float focus, open, px, drift; varying float vA;
      void main(){ vec3 p = position + vec3(sin(seed * 40.) * .25, .22, cos(seed * 31.) * .2) * drift; vec4 v = modelViewMatrix * vec4(p, 1.); float z = max(-v.z, .3);
        float r = open * px * abs(1. / focus - 1. / z); gl_PointSize = min(r * 2., 240.); vA = (.4 + seed) * .03 * smoothstep(12., 36., r) * smoothstep(.6, 2.5, z); gl_Position = projectionMatrix * v; }`,
    fragmentShader: "uniform float power; varying float vA; void main(){ float d = length(gl_PointCoord - .5) * 2.; gl_FragColor = vec4(vec3(vA * power * (1. - smoothstep(.35, 1., d))), 1.); }",
  });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(points);
  return { scene, mat };
})();

function poseB(t) {
  const d = cameraB(t, camB);
  // The country comes through the cut as bright as the globe showed it, then cools as the six take the light.
  // Scene two: the map's points wake, the six give their height and their light back, and the map goes down to nothing under the field.
  const wake = inOutCubic(span(t, GO, GO + 0.5)), sink = inOutCubic(span(t, GO, GO + 0.9)), given = inOutCubic(span(t, GO, GO + 0.6)), gone = 1 - span(t, GO, GO + 0.35);
  const dim = 1 - inOutCubic(span(t, GO + 0.5, GO + MOVE - 0.2));
  DIM.value = dim; ground.visible = dim > 0;
  const flash = Math.min(1, 1 - inOutCubic(span(t, CUT + 0.05, CUT + 1.0)) + 0.6 * wake);
  for (const s of states.values()) { s.group.visible = dim > 0; s.mat.uniforms.flash.value = flash; s.edge.color.setScalar(lerp(EDGE_LOW, 0.5, flash) * dim); }
  let sum = 0;
  for (const s of six) {
    const p = rise(s.i, t), up = (p <= 0 ? 0 : outBack(p)) * (1 - sink), lit = clamp(p * 3.2) * (1 - given);
    const top = BASE + s.share * PER_POINT * up;
    s.st.group.scale.y = top; s.st.mat.uniforms.top.value = top; s.st.mat.uniforms.lit.value = lit;
    s.st.edge.color.setScalar(t <= GO ? lerp(EDGE_LOW, 1, lit) : Math.max(lerp(EDGE_LOW, 1, lit), lerp(EDGE_LOW, 0.5, flash)) * dim);
    s.pool.visible = dim > 0; s.pool.material.uniforms.power.value = 0.12 * clamp(p * 2) * (1 + 0.5 * (1 - span(p, 0.3, 1))) * (1 - sink);
    placeLabel(s, top);
    const shown = span(t, RISE + s.i * STAGGER + 0.28, RISE + s.i * STAGGER + 0.62);
    s.label.mesh.material.opacity = inOutCubic(shown) * gone;
    s.label.mesh.position.addScaledVector(faceUp, -(1 - outCubic(shown)) * 26 * UNIT);
    s.pin.material.opacity = 0.85 * inOutCubic(shown) * gone;
    sum += s.share * outCubic(p);
  }
  const arrive = span(t, RISE + 0.42, RISE + 0.8), settle = span(t, LANDED - 0.05, LANDED + 0.3);
  figure.mesh.material.opacity = inOutCubic(arrive) * (1 - inOutCubic(span(t, GO + 0.05, GO + 0.6)));
  // The people, the ring that keeps the size of the rolls, and scene two's words.
  people.points.visible = t > GO && t < GO3; people.mat.uniforms.t.value = t;
  people.ring.material.opacity = inOutCubic(span(t, THIN + 0.2, THINNED)) * (1 - inOutCubic(span(t, GO3 + 0.4, GO3 + 2.0))); people.ring.visible = t > THIN + 0.2 && t < GO3 + 2.0; // the ring kept the size of the rolls; the plan takes its place
  const read = span(t, STOOD - 0.55, STOOD - 0.15), landed2 = span(t, STOOD - 0.02, STOOD + 0.3), sunday2 = span(t, THINNED - 0.02, THINNED + 0.3);
  const gone3 = 1 - inOutCubic(span(t, GO3 + 0.05, GO3 + 0.6));
  count.mesh.material.opacity = inOutCubic(read) * gone3;
  count.mesh.scale.setScalar(UNIT2 * (lerp(1.1, 1, outCubic(read)) + 0.02 * Math.sin(Math.PI * landed2) * (1 - landed2) + 0.02 * Math.sin(Math.PI * sunday2) * (1 - sunday2)));
  const lands = span(t, SHARE_AT - 0.1, SHARE_AT + 0.25), settles = span(t, SHARE_AT + 0.2, SHARE_AT + 0.55);
  share.mesh.material.opacity = inOutCubic(lands) * gone3;
  share.mesh.scale.setScalar(UNIT2 * (lerp(1.14, 1, outCubic(lands)) + 0.02 * Math.sin(Math.PI * settles) * (1 - settles)));
  figure.mesh.scale.setScalar(UNIT * (lerp(1.12, 1, outCubic(arrive)) + 0.022 * Math.sin(Math.PI * settle) * (1 - settle)));
  church.pose(t);
  const lands3 = span(t, PARISH_AT - 0.1, PARISH_AT + 0.25), settles3 = span(t, PARISH_AT + 0.2, PARISH_AT + 0.55);
  parishes.mesh.material.opacity = inOutCubic(lands3);
  parishes.mesh.scale.setScalar(UNIT3 * (lerp(1.12, 1, outCubic(lands3)) + 0.02 * Math.sin(Math.PI * settles3) * (1 - settles3)));
  return { cam: camB, focus: d, open: openB(t), sum };
}
// The count on the figure is the sum of the shares of the states that have risen. Drawn once a frame.
let drawn = "";
function drawFigure(t) {
  let sum = 0;
  for (const s of six) sum += s.share * outCubic(rise(s.i, t));
  const value = t >= LANDED ? Number(FIGURE) : Math.min(sum, Number(FIGURE));
  const caption = inOutCubic(span(t, LANDED - 0.05, LANDED + 0.4));
  const key = `${value.toFixed(1)} ${caption.toFixed(3)}`;
  if (key !== drawn) { figure.redraw(value, caption); drawn = key; }
  if (t > GO) {
    const rolls = inOutCubic(span(t, STOOD - 0.3, STOOD + 0.1)) * (1 - inOutCubic(span(t, THIN + 0.05, THIN + 0.4))), sunday = inOutCubic(span(t, THINNED - 0.25, THINNED + 0.15));
    const key2 = `${people.count(t)} ${rolls.toFixed(3)} ${sunday.toFixed(3)}`;
    if (key2 !== drawn2) { count.redraw(people.count(t), rolls, sunday); drawn2 = key2; }
  }
  if (t > PARISH_AT - 0.5) { const key3 = inOutCubic(span(t, PARISH_AT + 0.25, PARISH_AT + 0.7)).toFixed(3); if (key3 !== drawn3) { parishes.redraw(Number(key3)); drawn3 = key3; } }
}
let drawn2 = "", drawn3 = "";
/** The key to the points, flat on the glass over the source: its figure in the numerals' face. */
function keyLine(alpha, measureOnly = false) {
  let x = 44 * K; const y = S - 86 * K;
  pen.save(); pen.globalAlpha = alpha; pen.fillStyle = "#d6d6d6"; pen.textAlign = "left"; pen.textBaseline = "alphabetic";
  KEY.forEach((piece, i) => { pen.font = i === 1 ? `${NUM}${32 * K}px ${NUMFACE}` : `400 ${30 * K}px ${SANS}`; if (!measureOnly) pen.fillText(piece, x, y); x += pen.measureText(piece).width; });
  pen.restore();
  return x;
}
if (Math.abs(SIX.reduce((n, s) => n + s.share, 0) - Number(FIGURE)) > 0.051) throw new Error("the six shares do not add up to the figure");

// ---- One frame --------------------------------------------------------------
const coprime = (n) => { const gcd = (a, b) => (b ? gcd(b, a % b) : a); let p = Math.max(1, Math.round(n * 0.618)); while (gcd(p, n) !== 1) p++; return p; };
const right = new THREE.Vector3(), upv = new THREE.Vector3();
let hideWords = false;

function drawFrame(t, quality = 1) {
  const n = Math.max(6, Math.round(samples(t) * quality)), step = coprime(n), open = shutter(t) / FPS;
  drawFigure(t);
  renderer.setClearColor(0x000000, 1);
  renderer.setRenderTarget(rtSum); renderer.clear();
  for (let i = 0; i < n; i++) {
    const ts = t + ((i + 0.5) / n - 0.5) * open;
    const useB = ((i * 0.6180339887) % 1) < shotMix(ts);
    const { cam, focus, open: lens } = useB ? poseB(ts) : poseA(ts);
    // A point of the lens for this drawing (a sunflower's seeds over the disc), and a place within the pixel.
    const k = (i * step) % n, rad = Math.sqrt((k + 0.5) / n) * lens, ang = k * 2.39996323;
    const ox = rad * Math.cos(ang), oy = rad * Math.sin(ang);
    const jx = halton(i + 1, 2) - 0.5, jy = halton(i + 1, 3) - 0.5;
    cam.updateProjectionMatrix();
    const e = cam.projectionMatrix.elements;
    e[8] += -(e[0] * ox) / focus - (2 * jx) / S;
    e[9] += -(e[5] * oy) / focus - (2 * jy) / S - lift(ts);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    right.set(1, 0, 0).applyQuaternion(cam.quaternion); upv.set(0, 1, 0).applyQuaternion(cam.quaternion);
    cam.position.addScaledVector(right, ox).addScaledVector(upv, oy);
    cam.updateMatrixWorld(true);
    if (useB && ts > GO3) church.light(i, n, ts, cam);
    for (const w of words) w.mesh.visible = !hideWords && w.mesh.material.opacity > 0.001;
    for (const s of six) s.pin.visible = !hideWords;
    renderer.setRenderTarget(rtScene); renderer.clear();
    renderer.render(useB ? sceneB : sceneA, cam);
    addPass.mat.uniforms.weight.value = 1 / n;
    addPass.run(rtSum, false);
  }
  // The dust, once, through the middle of the lens.
  const mix = shotMix(t) * (1 - span(t, GO + 0.2, GO + 1.2));
  if (mix > 0) {
    const { focus, open: lens } = poseB(t);
    camB.updateProjectionMatrix(); camB.projectionMatrix.elements[9] -= lift(t); camB.updateMatrixWorld(true);
    Object.assign(dust.mat.uniforms.focus, { value: focus }); dust.mat.uniforms.open.value = lens; dust.mat.uniforms.power.value = mix; dust.mat.uniforms.drift.value = t - CUT;
    renderer.setRenderTarget(rtSum); renderer.render(dust.scene, camB);
  }
  // The glow, then the picture.
  brightPass.run(rtG1);
  for (const [a, b, size] of [[rtG1, rtG2, q4], [rtW1, rtW2, q8]]) {
    if (a === rtW1) { copyPass.mat.uniforms.src.value = rtG1.texture; copyPass.run(rtW1); }
    for (let pass = 0; pass < (a === rtW1 ? 2 : 1); pass++) {
      blurPass.mat.uniforms.src.value = a.texture; blurPass.mat.uniforms.step.value.set(1 / size, 0); blurPass.run(b);
      blurPass.mat.uniforms.src.value = b.texture; blurPass.mat.uniforms.step.value.set(0, 1 / size); blurPass.run(a);
    }
  }
  lastPass.run(null);
  pen.drawImage(glCanvas, 0, 0);
  // The source, flat on the glass: it is not part of the scene and takes none of its blur.
  const src = hideWords ? 0 : inOutCubic(span(t, LANDED + 0.1, LANDED + 0.55));
  if (src > 0) {
    pen.save(); pen.globalAlpha = src; pen.fillStyle = "#d6d6d6"; pen.textAlign = "left"; pen.textBaseline = "alphabetic";
    pen.font = `400 ${30 * K}px ${SANS}`; pen.fillText(SOURCE_LINE, 44 * K, S - 42 * K); pen.restore();
  }
  const keyed = hideWords ? 0 : inOutCubic(span(t, STOOD, STOOD + 0.4)) * (1 - inOutCubic(span(t, KEY_OFF - 0.5, KEY_OFF)));
  if (keyed > 0) keyLine(keyed);
  return n;
}

// ---- What render.mjs calls ---------------------------------------------------
window.__info = { fps: FPS, seconds: SECONDS, frames: FPS * SECONDS, size: S, landed: LANDED, cut: CUT, beat: BEAT, go: GO, stood: STOOD, thin: THIN, thinned: THINNED, shareAt: SHARE_AT, go3: GO3, built: BUILT, signed: SIGNED, parishAt: PARISH_AT, keyOff: KEY_OFF, flock: church.flock, tradition: TRADITION, stone: church.stone, camera3: [GO3, GO3 + 4.6, SETTLE, SECONDS].map((t) => ({ t, turn: Math.round(turn(t) * 10) / 10, tilt: Math.round(tilt(t) * 10) / 10, lift: Math.round(lift(t) * 1000) / 1000, away: Math.round(cameraB(t, facing3) * 100) / 100 })),
  points: N_ROLLS, stay: N_SUNDAY, fromSix: people.fromSix, digitWidths, count: [GO, STOOD - 0.01, STOOD, THIN, THINNED - 0.01, THINNED, SECONDS].map((t) => people.count(t)), renderer: renderer.getContext().getParameter(renderer.getContext().getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL) };
window.__frame = (i, quality = 1) => { const n = drawFrame(i / FPS, quality); return { n, png: out.toDataURL("image/png") }; };
window.__still = (t, quality = 1) => { drawFrame(t, quality); return out.toDataURL("image/png"); };
/** Every plane of words at time t: where it is on screen, its smallest letters in px, and the brightest ground behind it. */
window.__words = (t, quality = 0.5) => {
  hideWords = true; drawFrame(t, quality); hideWords = false;
  const useB = shotMix(t) >= 0.5, { cam } = useB ? poseB(t) : poseA(t);
  cam.updateProjectionMatrix(); cam.projectionMatrix.elements[9] -= lift(t); cam.updateMatrixWorld(true);
  const found = [];
  const measure = (name, x0, y0, x1, y1, px, opacity) => {
    const bx = Math.max(0, Math.floor(x0)), by = Math.max(0, Math.floor(y0)), bw = Math.min(S, Math.ceil(x1)) - bx, bh = Math.min(S, Math.ceil(y1)) - by;
    const inside = x0 >= 0 && y0 >= 0 && x1 <= S && y1 <= S;
    let lumas = [];
    if (bw > 0 && bh > 0) { const d = pen.getImageData(bx, by, bw, bh).data; for (let i = 0; i < d.length; i += 4) lumas.push(d[i]); }
    lumas.sort((a, b) => a - b);
    found.push({ name, box: [x0, y0, x1, y1].map(Math.round), px: Math.round(px * 10) / 10, opacity: Math.round(opacity * 100) / 100, inside, behind: lumas.length ? lumas[Math.floor(lumas.length * 0.99)] : 0, brightest: lumas.length ? lumas[lumas.length - 1] : 0 });
  };
  for (const w of words) {
    if (w.mesh.parent !== (useB ? sceneB : sceneA) || w.mesh.material.opacity < 0.5) continue;
    w.mesh.updateMatrixWorld(true);
    const xs = [], ys = [];
    const [ix0, iy0, ix1, iy1] = w.ink; // the words' own box on the plane, in the plane's px from its top left
    for (const [px0, py0] of [[ix0, iy0], [ix1, iy0], [ix1, iy1], [ix0, iy1]]) {
      const p = new THREE.Vector3(px0 - w.w / 2, w.h / 2 - py0, 0).applyMatrix4(w.mesh.matrixWorld).applyMatrix4(cam.matrixWorldInverse).applyMatrix4(cam.projectionMatrix);
      xs.push((p.x * 0.5 + 0.5) * S); ys.push((1 - (p.y * 0.5 + 0.5)) * S);
    }
    const tall = (Math.max(...ys) - Math.min(...ys)) / (iy1 - iy0); // screen px for each px the word was drawn at
    measure(w.name, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), (w.smallest * tall) / K, w.mesh.material.opacity);
  }
  if (t >= LANDED + 0.55) { pen.font = `400 ${30 * K}px ${SANS}`; measure("source", 44 * K, S - 72 * K, 44 * K + pen.measureText(SOURCE_LINE).width, S - 34 * K, 30, 1); }
  if (t >= STOOD + 0.4 && t < KEY_OFF - 0.5) measure("key", 44 * K, S - 116 * K, keyLine(1, true), S - 78 * K, 30, 1);
  return found;
};
window.__ready = true;
