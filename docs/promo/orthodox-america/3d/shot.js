// The signature shot, in real 3D (three.js, WebGL2): the globe turns in space,
// the camera pushes down through it onto the United States, the six states
// rise as forms whose height is their share, and the figure lands as they do.
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
import { FPS, SECONDS, TITLE, SIX, FIGURE, CAPTION, SOURCE_LINE } from "/words.mjs";

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
const turn = (t) => 23.4 - 32.4 * push(span(t, BEAT, BEAT + WHIP)) - 5 * (softLine(t - BEAT - WHIP) / softLine(SECONDS - BEAT - WHIP));
/** How far the picture is lifted off the frame's centre (a lens shift): the globe sits high, the map low. */
const lift = (t) => 0.2 * (1 - inOutCubic(span(t, BEAT, CUT))) - 0.34 * inOutCubic(span(t, CUT + 0.05, CUT + 1.4));
const tilt = (t) => 90 - 52 * inOutCubic(span(t, CUT + 0.05, CUT + 1.4)); // straight down, then a low angle
/** The lens opening, in the shot's own units: wide while the map tilts (near and far go soft), then stopped down for the words. */
const openA = () => 0.003;
const openB = (t) => lerp(0.26, 0.07, inOutCubic(span(t, 4.5, 5.6)));
const shutter = (t) => lerp(0.5, 0.95, span(t, BEAT + 0.3, BEAT + 0.9) * (1 - span(t, CUT + 0.25, CUT + 0.6))); // of a frame
const samples = (t) => Math.round(lerp(20, 72, span(t, BEAT + 0.2, BEAT + 0.8) * (1 - span(t, 4.7, 5.5))) + 8 * (1 - span(t, 0, 2.9)));
/** 0 is the globe, 1 is the map; three frames of one dissolving into the other inside the blur. */
const shotMix = (t) => span(t, CUT - 0.05, CUT + 0.05);

const rise = (i, t) => span(t, RISE + i * STAGGER, RISE + i * STAGGER + RISE_FOR);

// ---- A deterministic dice --------------------------------------------------
function dice(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

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
await Promise.all(['400 40px "DM Serif Display"', '400 40px "DM Sans"', '500 40px "DM Sans"'].map((f) => document.fonts.load(f)));
for (const f of ["DM Serif Display", "DM Sans"]) if (!document.fonts.check(`40px "${f}"`)) throw new Error(`the face ${f} did not load`);
const SERIF = '"DM Serif Display"', SANS = '"DM Sans"';
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
const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
  vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
  fragmentShader: `varying vec3 vW; ${LATTICE} void main(){ float far = 1. - smoothstep(5., 17., length(vW.xz)); gl_FragColor = vec4(vec3(.002 + lattice(vW.xz, .03) * .03 * far), 1.); }`,
}));
sceneB.add(ground);

const stateVert = "varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normal; gl_Position = projectionMatrix * viewMatrix * w; }";
const stateFrag = `uniform float lit, top, flash; varying vec3 vW; varying vec3 vN; ${LATTICE}
  void main(){
    float up = step(.5, vN.y);
    float low = mix(.016, .010 + .04 * flash + lattice(vW.xz, mix(.03, .068, flash)) * mix(.15, 1.7, flash), up);
    float k = clamp(vW.y / max(top, 1e-3), 0., 1.);
    float wall = mix(.02, .46, pow(k, 1.7)) * (.9 + .1 * abs(dot(normalize(vN.xz + 1e-5), normalize(vec2(-.55, .83)))));
    float high = mix(wall, 1.5, up);
    gl_FragColor = vec4(vec3(mix(low, high, lit)), 1.);
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
  const mat = new THREE.ShaderMaterial({ vertexShader: stateVert, fragmentShader: stateFrag, uniforms: { lit: { value: 0 }, top: { value: BASE }, flash: { value: 0 } } });
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
  states.set(st.id, { group, mat, edge, ...best });
}
const EDGE_LOW = 0.085;
for (const s of states.values()) s.edge.color.setScalar(EDGE_LOW);

// Where the camera comes to rest, and the pose the words face.
const albers = geoAlbersUsa().scale(1300).translate([487.5, 305]);
const [ux, uy] = albers([-97, 38.5]);
const T0 = new THREE.Vector3((ux - 487.5) / 100, 0, (uy - 305) / 100); // where the globe's centre was: under the camera at the cut
const T1 = new THREE.Vector3(0.05, 0, 0.1);
function cameraB(t, cam) {
  const e = inOutCubic(span(t, CUT + 0.05, CUT + 1.4));
  const at = T0.clone().lerp(T1, e);
  qa.setFromAxisAngle(Y_AXIS, THREE.MathUtils.degToRad(-turn(t)));
  qb.setFromAxisAngle(X_AXIS, THREE.MathUtils.degToRad(-tilt(t)));
  cam.quaternion.copy(qa).multiply(qb);
  const d = height(t) * R_UNITS;
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
    ctx.font = `400 48px ${SERIF}`; ctx.fillText(`${s.share.toFixed(1)}%`, 130, 84); half = Math.max(half, ctx.measureText(`${s.share.toFixed(1)}%`).width / 2);
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
  ctx.font = `400 208px ${SERIF}`;
  // Each digit in a cell of its own, so the number does not shiver as it counts.
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
  const flash = 1 - inOutCubic(span(t, CUT + 0.05, CUT + 1.0));
  for (const s of states.values()) { s.mat.uniforms.flash.value = flash; s.edge.color.setScalar(lerp(EDGE_LOW, 0.5, flash)); }
  let sum = 0;
  for (const s of six) {
    const p = rise(s.i, t), up = p <= 0 ? 0 : outBack(p), lit = clamp(p * 3.2);
    const top = BASE + s.share * PER_POINT * up;
    s.st.group.scale.y = top; s.st.mat.uniforms.top.value = top; s.st.mat.uniforms.lit.value = lit;
    s.st.edge.color.setScalar(lerp(EDGE_LOW, 1, lit));
    s.pool.material.uniforms.power.value = 0.12 * clamp(p * 2) * (1 + 0.5 * (1 - span(p, 0.3, 1)));
    placeLabel(s, top);
    const shown = span(t, RISE + s.i * STAGGER + 0.28, RISE + s.i * STAGGER + 0.62);
    s.label.mesh.material.opacity = inOutCubic(shown);
    s.label.mesh.position.addScaledVector(faceUp, -(1 - outCubic(shown)) * 26 * UNIT);
    s.pin.material.opacity = 0.85 * inOutCubic(shown);
    sum += s.share * outCubic(p);
  }
  const arrive = span(t, RISE + 0.42, RISE + 0.8), settle = span(t, LANDED - 0.05, LANDED + 0.3);
  figure.mesh.material.opacity = inOutCubic(arrive);
  figure.mesh.scale.setScalar(UNIT * (lerp(1.12, 1, outCubic(arrive)) + 0.022 * Math.sin(Math.PI * settle) * (1 - settle)));
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
}
if (Math.abs(SIX.reduce((n, s) => n + s.share, 0) - Number(FIGURE)) > 0.051) throw new Error("the six shares do not add up to the figure");

// ---- One frame --------------------------------------------------------------
const coprime = (n) => { const gcd = (a, b) => (b ? gcd(b, a % b) : a); let p = Math.max(1, Math.round(n * 0.618)); while (gcd(p, n) !== 1) p++; return p; };
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
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
    for (const w of words) w.mesh.visible = !hideWords;
    for (const s of six) s.pin.visible = !hideWords;
    renderer.setRenderTarget(rtScene); renderer.clear();
    renderer.render(useB ? sceneB : sceneA, cam);
    addPass.mat.uniforms.weight.value = 1 / n;
    addPass.run(rtSum, false);
  }
  // The dust, once, through the middle of the lens.
  const mix = shotMix(t);
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
  return n;
}

// ---- What render.mjs calls ---------------------------------------------------
window.__info = { fps: FPS, seconds: SECONDS, frames: FPS * SECONDS, size: S, landed: LANDED, cut: CUT, beat: BEAT, renderer: renderer.getContext().getParameter(renderer.getContext().getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL) };
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
  return found;
};
window.__ready = true;
