// The glide from one saint's web to another's (1.8, the build 80 note 55;
// lib/saints/webGlide.ts). The owner: "make sure the transition from their
// web to the other person's web is smooth." There is no browser here, so the
// glide is held by its plan and its numbers. What a reader would notice if
// this broke: the chosen saint jumping to the middle instead of gliding there,
// the old middle vanishing instead of taking his place in the new web, a
// saint who is on both webs blinking out and back, the new saints popping in
// anywhere but out of the new middle, a glide that never settles or stops a
// pixel short, or Back not gliding the same way.

import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { WebAvatar } from "@/components/saints/web/WebAvatar";
import { WebConstellation } from "@/components/saints/web/WebConstellation";
import { getMessages } from "@/lib/i18n";
import { saintWeb, webSlugs } from "@/lib/saints/web";
import { isWebOf, knownWeb, loadWeb, rememberWeb } from "@/lib/saints/webFiles";
import {
  ARRIVE_FROM,
  LAUNCH,
  advanceGlideRun,
  finishGlideRun,
  followAt,
  glideFrame,
  glideLeavers,
  glidePlan,
  glideRun,
  slugOfWebFile,
  stepGlideRun,
  webFileName,
  webFileUrl,
  webPathFor,
  webSlugOfPath,
  type GlideEnd,
  type GlideRun,
  type GlideStart,
} from "@/lib/saints/webGlide";
import { CENTER_SIZE, NODE_SIZE, webLayout, type SaintWebData } from "@/lib/saints/webLayout";
import { STEP, type Point } from "@/lib/saints/webMotion";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const code = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const far = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * St A's web: B (the saint the reader centres on), C (on both webs, dimmed by
 * the card pulled up), D (on A's alone) and the council K. St B's web: A, C,
 * E (new) and K. Where A's saints stood on the screen is given in B's units.
 */
const OLD_AT: Record<string, Point> = {
  middle: { x: 195, y: 300 },
  "saint:b": { x: 336, y: 300 },
  "saint:c": { x: 54, y: 300 },
  "saint:d": { x: 195, y: 168 },
  "council:k": { x: 195, y: 432 },
};
const OLD_NODES = ["saint:b", "saint:c", "saint:d", "council:k"];
const NEW_NODES = ["saint:a", "saint:c", "saint:e", "council:k"];

function startOf(nodes = OLD_NODES, middle = "a"): GlideStart {
  return {
    web: { middle, nodes },
    middle: { at: OLD_AT.middle, size: CENTER_SIZE },
    nodes: nodes.map((id) => ({ at: OLD_AT[id] ?? { x: 100, y: 100 }, size: NODE_SIZE, opacity: id === "saint:c" ? 0.3 : 1 })),
  };
}

function endOf(nodes = NEW_NODES, middle = "b"): GlideEnd {
  const layout = webLayout(nodes.length);
  return { web: { middle, nodes }, rest: [layout.center, ...layout.places] };
}

/** Run a glide to its end, frame by frame at 60 a second; how long it took. */
function runOut(g: GlideRun, limit = 4): number {
  let t = 0;
  while (advanceGlideRun(g, 1 / 60)) {
    t += 1 / 60;
    if (t > limit) break;
  }
  return t;
}

describe("who goes where", () => {
  const end = endOf();
  const plan = glidePlan(startOf(), end);
  const body = (id: string) => plan.bodies[NEW_NODES.indexOf(id) + 1];

  it("plans every saint of the new web once, in order", () => {
    expect(plan.bodies.map((b) => b.body)).toEqual([0, 1, 2, 3, 4]);
  });

  it("glides the saint chosen to the middle, growing to the middle's size, on the middle saint's spring", () => {
    const b = plan.bodies[0];
    expect(b.role).toBe("grow");
    expect(b.from).toEqual(OLD_AT["saint:b"]);
    expect(b.to).toEqual(end.rest[0]);
    expect([b.fromSize, b.toSize]).toEqual([NODE_SIZE, CENTER_SIZE]);
    expect(b.spring).toBe("middle");
  });

  it("shrinks the old middle to his place in the new web, on the place spring", () => {
    const a = body("saint:a");
    expect(a.role).toBe("shrink");
    expect(a.from).toEqual(OLD_AT.middle);
    expect(a.to).toEqual(end.rest[1]);
    expect([a.fromSize, a.toSize]).toEqual([CENTER_SIZE, NODE_SIZE]);
    expect(a.spring).toBe("place");
  });

  it("moves the saints of both webs from their old places to their new ones, brightening any the card had dimmed", () => {
    const c = body("saint:c");
    expect(c.role).toBe("move");
    expect(c.from).toEqual(OLD_AT["saint:c"]);
    expect(c.to).toEqual(end.rest[2]);
    expect(c.fromOpacity).toBeCloseTo(0.3);
    const k = body("council:k");
    expect(k.role).toBe("move");
    expect(k.from).toEqual(OLD_AT["council:k"]);
  });

  it("brings the saints new to the web out of the new middle, small and unseen at first", () => {
    const e = body("saint:e");
    expect(e.role).toBe("arrive");
    expect(e.from).toEqual(end.rest[0]);
    expect(e.to).toEqual(end.rest[3]);
    expect(e.fromSize).toBe(NODE_SIZE * ARRIVE_FROM);
    expect(e.fromOpacity).toBe(0);
  });

  it("lets those of the old web alone fade where they stood, and never the saint chosen or the old middle", () => {
    expect(plan.leavers.map((l) => l.id)).toEqual(["saint:d"]);
    expect(plan.leavers[0].at).toEqual(OLD_AT["saint:d"]);
    expect(glideLeavers({ middle: "a", nodes: OLD_NODES }, { middle: "b", nodes: NEW_NODES })).toEqual([2]);
    const ids = new Set(NEW_NODES);
    for (const l of plan.leavers) expect(ids.has(l.id)).toBe(false);
  });

  it("draws each old thread to whoever stands for its saint now", () => {
    // The old middle is the new web's saint:a; the saint chosen is the new middle; D is leaving.
    expect(plan.old[0]).toEqual({ body: 1 });
    expect(plan.old[1]).toEqual({ body: 0 });
    expect(plan.old[2]).toEqual({ body: 2 });
    expect(plan.old[3]).toEqual({ leaver: 0 });
    expect(plan.old[4]).toEqual({ body: 4 });
    const first = glideFrame(glideRun(plan));
    expect(followAt(plan, first, 0)).toEqual(OLD_AT.middle);
    expect(followAt(plan, first, 1)).toEqual(OLD_AT["saint:b"]);
    expect(followAt(plan, first, 3)).toEqual(OLD_AT["saint:d"]);
  });

  it("fades the old middle where he stood when he is not on the new web", () => {
    const nodes = ["saint:c", "saint:e"];
    const p = glidePlan(startOf(), endOf(nodes));
    expect(p.leavers.map((l) => [l.old, l.id, l.size])).toEqual([
      [-1, "saint:a", CENTER_SIZE],
      [2, "saint:d", NODE_SIZE],
      [3, "council:k", NODE_SIZE],
    ]);
    expect(p.old[0]).toEqual({ leaver: 0 });
  });

  it("brings a middle who was not on the old web in where he will stand, and lets the old web go", () => {
    const p = glidePlan(startOf(), endOf(["saint:x", "saint:y"], "z"));
    expect(p.bodies[0].role).toBe("arrive");
    expect(p.bodies[0].from).toEqual(p.bodies[0].to);
    expect(p.bodies[0].fromOpacity).toBe(0);
    expect(p.leavers.map((l) => l.id)).toEqual(["saint:a", ...OLD_NODES]);
  });

  it("walks Back the same way: the two who changed places change back, and who arrived leaves", () => {
    // B's web as it stood at the end of the glide, given in A's units.
    const back = glidePlan(
      {
        web: { middle: "b", nodes: NEW_NODES },
        middle: { at: end.rest[0], size: CENTER_SIZE },
        nodes: NEW_NODES.map((_, i) => ({ at: end.rest[i + 1], size: NODE_SIZE, opacity: 1 })),
      },
      { web: { middle: "a", nodes: OLD_NODES }, rest: [OLD_AT.middle, ...OLD_NODES.map((id) => OLD_AT[id])] },
    );
    expect(back.bodies[0]).toMatchObject({ role: "grow", from: end.rest[1], to: OLD_AT.middle, spring: "middle" });
    expect(back.bodies[1]).toMatchObject({ role: "shrink", from: end.rest[0], to: OLD_AT["saint:b"] });
    expect(back.bodies[3].role).toBe("arrive");
    expect(back.bodies[3].to).toEqual(OLD_AT["saint:d"]);
    expect(back.leavers.map((l) => l.id)).toEqual(["saint:e"]);
  });
});

describe("the glide on the house springs", () => {
  const end = endOf();
  const plan = glidePlan(startOf(), end);

  it("begins exactly as the old web stood: same places, sizes and light, old names and threads shown, new ones not", () => {
    const g = glideRun(plan);
    const now = glideFrame(g);
    plan.bodies.forEach((b, i) => {
      if (b.role === "arrive") {
        expect(now.bodies[i].opacity, `#${i}`).toBe(0);
        return;
      }
      expect(now.bodies[i].p, `#${i}`).toEqual(b.from);
      expect(now.bodies[i].size, `#${i}`).toBe(b.fromSize);
      expect(now.bodies[i].opacity, `#${i}`).toBeCloseTo(b.fromOpacity);
    });
    expect(now.bodies[0]).toMatchObject({ nameIn: 0, nameOut: 1 });
    expect(now.bodies[1]).toMatchObject({ nameIn: 0, nameOut: 1 });
    expect(now.bodies[2]).toMatchObject({ nameIn: 1, nameOut: 0 });
    expect(now.leavers[0]).toEqual({ opacity: 1, scale: 1 });
    expect([now.threadsOut, now.threadsIn, now.arrive]).toEqual([1, 0, 0]);
  });

  it("keeps the new saints in the middle until he is half way there, then brings them out", () => {
    const g = glideRun(plan);
    const e = 3;
    while (g.u[0] < LAUNCH) {
      expect(g.u[e]).toBe(0);
      expect(glideFrame(g).bodies[e].opacity).toBe(0);
      stepGlideRun(g);
    }
    for (let s = 0; s < 24; s++) stepGlideRun(g);
    expect(g.u[e]).toBeGreaterThan(0);
    expect(glideFrame(g).bodies[e].opacity).toBeGreaterThan(0);
  });

  it("brings the saint chosen to the middle before the old middle reaches his place: the middle's spring is the stiffer", () => {
    const g = glideRun(plan);
    let middleAt = -1;
    let oldAt = -1;
    for (let s = 1; s < 2400 && (middleAt < 0 || oldAt < 0); s++) {
      stepGlideRun(g);
      const now = glideFrame(g);
      if (middleAt < 0 && far(now.bodies[0].p, end.rest[0]) < 1) middleAt = s;
      if (oldAt < 0 && far(now.bodies[1].p, end.rest[1]) < 1) oldAt = s;
    }
    expect(middleAt).toBeGreaterThan(0);
    expect(oldAt).toBeGreaterThan(middleAt);
  });

  it("ends with every saint at rest in his place, at his size and fully lit, the leavers and old threads gone, and stops", () => {
    const g = glideRun(plan);
    const took = runOut(g);
    expect(g.done).toBe(true);
    expect(took).toBeGreaterThan(0.3);
    expect(took).toBeLessThan(1.6);
    const now = glideFrame(g);
    plan.bodies.forEach((b, i) => {
      expect(now.bodies[i].p, `#${i}`).toEqual(b.to);
      expect(now.bodies[i].size, `#${i}`).toBe(b.toSize);
      expect(now.bodies[i].opacity, `#${i}`).toBe(1);
      expect(now.bodies[i].nameIn, `#${i}`).toBe(1);
      expect(now.bodies[i].nameOut, `#${i}`).toBe(0);
    });
    expect(now.leavers[0].opacity).toBe(0);
    expect([now.threadsOut, now.threadsIn, now.arrive]).toEqual([0, 1, 1]);
    expect(advanceGlideRun(g, 1 / 60)).toBe(false);
  });

  it("never leaps: each frame moves a saint smoothly, and the middle never swings past his place by more than a pixel", () => {
    const g = glideRun(plan);
    let last = glideFrame(g);
    let overshoot = 0;
    for (let f = 0; f < 120; f++) {
      advanceGlideRun(g, 1 / 60);
      const now = glideFrame(g);
      now.bodies.forEach((b, i) => {
        expect(Number.isFinite(b.p.x) && Number.isFinite(b.p.y) && Number.isFinite(b.size), `#${i}`).toBe(true);
        // Nothing crosses the screen in one frame: well under the whole way.
        expect(far(b.p, last.bodies[i].p), `#${i} frame ${f}`).toBeLessThan(40);
      });
      const from = plan.bodies[0].from;
      const to = plan.bodies[0].to;
      const along = ((now.bodies[0].p.x - from.x) * (to.x - from.x) + (now.bodies[0].p.y - from.y) * (to.y - from.y)) / far(from, to);
      overshoot = Math.max(overshoot, along - far(from, to));
      last = now;
    }
    expect(overshoot).toBeLessThan(1);
  });

  it("steps a frame's worth at most a thirtieth of a second, so a page come back to does not leap", () => {
    const a = glideRun(plan);
    const b = glideRun(plan);
    advanceGlideRun(a, 5);
    for (let s = 0; s < 8; s++) stepGlideRun(b);
    expect(a.u).toEqual(b.u);
    expect(STEP).toBe(1 / 240);
  });

  it("is at its end at once with the motion off, or a finger on the web before it is done", () => {
    const g = glideRun(plan);
    stepGlideRun(g);
    finishGlideRun(g);
    expect(g.done).toBe(true);
    const now = glideFrame(g);
    plan.bodies.forEach((b, i) => expect(now.bodies[i].p).toEqual(b.to));
    expect(now.leavers[0].opacity).toBe(0);
  });

  it("starts still where nothing has to move, grow or brighten", () => {
    const same = glidePlan(
      { web: { middle: "a", nodes: ["saint:c"] }, middle: { at: OLD_AT.middle, size: CENTER_SIZE }, nodes: [{ at: { x: 54, y: 300 }, size: NODE_SIZE, opacity: 1 }] },
      { web: { middle: "a", nodes: ["saint:c"] }, rest: [OLD_AT.middle, { x: 54, y: 300 }] },
    );
    const g = glideRun(same);
    expect(g.done).toBe(true);
    expect(advanceGlideRun(g, 1 / 60)).toBe(false);
  });
});

describe("on the app's own webs", () => {
  const slugs = webSlugs();

  it("finds the saint the reader came from on the web he glides to, for every saint on every web: the old middle always has a place", () => {
    expect(slugs.length).toBeGreaterThan(20);
    for (const slug of slugs) {
      const web = saintWeb(slug)!;
      for (const node of web.nodes) {
        if (node.kind !== "saint") continue;
        const theirs = saintWeb(node.person.slug);
        expect(theirs, `${slug} -> ${node.person.slug}`).not.toBeNull();
        expect(theirs!.nodes.some((n) => n.id === `saint:${slug}`), `${node.person.slug}'s web holds ${slug}`).toBe(true);
      }
    }
  });

  it("plans a real glide with every saint of the new web once and nobody both arriving and leaving", () => {
    const from = saintWeb("john-chrysostom")!;
    const chosen = from.nodes.find((n) => n.kind === "saint")!;
    expect(chosen.kind).toBe("saint");
    const to = saintWeb(chosen.kind === "saint" ? chosen.person.slug : "")!;
    const oldLayout = webLayout(from.nodes.length);
    const newLayout = webLayout(to.nodes.length);
    const plan = glidePlan(
      {
        web: { middle: from.center.slug, nodes: from.nodes.map((n) => n.id) },
        middle: { at: oldLayout.center, size: CENTER_SIZE },
        nodes: oldLayout.places.map((at) => ({ at, size: NODE_SIZE, opacity: 1 })),
      },
      { web: { middle: to.center.slug, nodes: to.nodes.map((n) => n.id) }, rest: [newLayout.center, ...newLayout.places] },
    );
    expect(plan.bodies).toHaveLength(to.nodes.length + 1);
    expect(plan.bodies[0].role).toBe("grow");
    expect(plan.bodies.filter((b) => b.role === "shrink")).toHaveLength(1);
    const newIds = new Set(to.nodes.map((n) => n.id));
    for (const l of plan.leavers) expect(newIds.has(l.id)).toBe(false);
    const g = glideRun(plan);
    runOut(g);
    expect(g.done).toBe(true);
  });
});

describe("a web's address and its file", () => {
  it("reads the saint from a web's address, with or without the apps' trailing slash, and nothing else", () => {
    expect(webSlugOfPath("/saints/basil-the-great/web")).toBe("basil-the-great");
    expect(webSlugOfPath("/saints/basil-the-great/web/")).toBe("basil-the-great");
    for (const other of ["/saints/basil-the-great", "/saints/basil-the-great/web/x", "/saints/../web", "/saints/Basil/web", "/web", "", null, undefined]) {
      expect(webSlugOfPath(other), String(other)).toBeNull();
    }
  });

  it("writes the next web's address the way the address is written now", () => {
    expect(webPathFor("gregory-the-theologian", "/saints/basil-the-great/web")).toBe("/saints/gregory-the-theologian/web");
    expect(webPathFor("gregory-the-theologian", "/saints/basil-the-great/web/")).toBe("/saints/gregory-the-theologian/web/");
  });

  it("names a file for every saint with a web, and reads each name back", () => {
    for (const slug of webSlugs()) {
      expect(webSlugOfPath(`/saints/${slug}/web`), slug).toBe(slug);
      expect(slugOfWebFile(webFileName(slug)), slug).toBe(slug);
    }
    expect(webFileUrl("basil-the-great")).toBe("/saint-webs/basil-the-great.json");
    for (const bad of ["basil-the-great", "../basil.json", "Basil.json", ".json", "a..json", "x/y.json"]) expect(slugOfWebFile(bad), bad).toBeNull();
  });

  it("is written by the build as a file in the apps' export, outside app/api, and holds exactly the web the page hands over", async () => {
    const route = code("app/saint-webs/[file]/route.ts");
    expect(route).toContain('export const dynamic = "force-static"');
    expect(route).toContain("export const dynamicParams = false");
    expect(route).toContain("webSlugs().map((slug) => ({ file: webFileName(slug) }))");
    const mod = (await import("../../../app/saint-webs/[file]/route")) as {
      GET: (req: Request, ctx: { params: Promise<{ file: string }> }) => Promise<Response>;
      generateStaticParams: () => { file: string }[];
    };
    expect(mod.generateStaticParams()).toHaveLength(webSlugs().length);
    const res = await mod.GET(new Request("http://localhost/saint-webs/john-chrysostom.json"), { params: Promise.resolve({ file: "john-chrysostom.json" }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(JSON.parse(JSON.stringify(saintWeb("john-chrysostom"))));
    const none = await mod.GET(new Request("http://localhost/saint-webs/x.json"), { params: Promise.resolve({ file: "no-such-saint.json" }) });
    expect(none.status).toBe(404);
  });
});

describe("the webs on the device", () => {
  const john = saintWeb("john-chrysostom")!;
  const fileOf = (web: unknown, status = 200) => async () => new Response(JSON.stringify(web), { status });

  it("takes only the web of the saint asked for, in the shape the screen draws", () => {
    expect(isWebOf(john, "john-chrysostom")).toBe(true);
    expect(isWebOf(john, "basil-the-great")).toBe(false);
    expect(isWebOf({ center: { slug: "john-chrysostom" } }, "john-chrysostom")).toBe(false);
    expect(isWebOf(null, "john-chrysostom")).toBe(false);
  });

  it("reads a web once from its file and keeps it for the visit, one read for many askers", async () => {
    let reads = 0;
    const web: SaintWebData = { ...john, center: { ...john.center, slug: "test-one" } };
    const read = (async () => {
      reads += 1;
      return new Response(JSON.stringify(web));
    }) as unknown as typeof fetch;
    const [a, b] = await Promise.all([loadWeb("test-one", read), loadWeb("test-one", read)]);
    expect(a?.center.slug).toBe("test-one");
    expect(b).toBe(a);
    expect(reads).toBe(1);
    expect(knownWeb("test-one")).toBe(a);
    expect(await loadWeb("test-one", read)).toBe(a);
    expect(reads).toBe(1);
  });

  it("answers nothing for a web the build has no file for, without asking again and again", async () => {
    let reads = 0;
    const read = (async () => {
      reads += 1;
      return new Response("Not found", { status: 404 });
    }) as unknown as typeof fetch;
    expect(await loadWeb("test-none", read)).toBeNull();
    expect(reads).toBe(1);
  });

  it("refuses a file that is not that saint's web", async () => {
    expect(await loadWeb("test-wrong", fileOf(john) as unknown as typeof fetch)).toBeNull();
    expect(knownWeb("test-wrong")).toBeUndefined();
  });

  it("tries a failed read again, and a later call asks afresh", async () => {
    let reads = 0;
    const read = (async () => {
      reads += 1;
      throw new Error("slow device");
    }) as unknown as typeof fetch;
    expect(await loadWeb("test-fail", read)).toBeNull();
    expect(reads).toBe(3);
    const web: SaintWebData = { ...john, center: { ...john.center, slug: "test-fail" } };
    expect((await loadWeb("test-fail", fileOf(web) as unknown as typeof fetch))?.center.slug).toBe("test-fail");
  });

  it("keeps the page's own web for Back without a read", () => {
    rememberWeb(john);
    expect(knownWeb("john-chrysostom")).toBe(john);
  });
});

describe("the screen that glides", () => {
  it("glides from Center the web here in place of opening a page, and keeps the link for a new tab", () => {
    const card = code("components/saints/web/WebCard.tsx");
    expect(card).toContain("href={`/saints/${node.person.slug}/web`}");
    expect(card).toMatch(/onNavigate=\{\(e\) => \{[\s\S]*?e\.preventDefault\(\);[\s\S]*?onCenter\(node\.person\.slug\);/);
    expect(card).toContain("prefetch={false}");
  });

  it("pushes the new web's address, follows the address for Back and Forward, and reads the web from the device", () => {
    const screen = code("components/saints/web/SaintWebScreen.tsx");
    expect(screen).toContain('window.history.pushState({}, "", webPathFor(slug, window.location.pathname));');
    expect(screen).toContain("webSlugOfPath(usePathname())");
    expect(screen).toContain("loadWeb(");
    // The registry stays on the server: the screen reads the web from its file.
    expect(screen).not.toMatch(/from "@\/lib\/saints\/(?:saints|web)"/);
    // With the motion off, no picture to glide from: the new web is simply there.
    expect(screen).toContain("!prefersReducedMotion() ? (live.current?.snapshot() ?? null) : null");
  });

  it("chooses the saint the reader came from as a web arrives, so the card tells how the two are joined", () => {
    const john = saintWeb("john-chrysostom")!;
    const from = john.nodes.filter((n) => n.kind === "saint")[2];
    expect(from.kind).toBe("saint");
    const slug = from.kind === "saint" ? from.person.slug : "";
    type ProviderProps = Parameters<typeof MessagesProvider>[0];
    const html = renderToString(
      createElement(
        MessagesProvider,
        { locale: "en", messages: getMessages("en") } as ProviderProps,
        createElement(WebConstellation, { data: john, arrival: { from: slug, glide: null } }),
      ),
    ).replace(/<!-- -->/g, "");
    const card = /<section[^>]*data-saint-web-card[^>]*aria-label="([^"]*)"/.exec(html);
    expect(card?.[1]).toBe(from.kind === "saint" ? from.person.name.replace(/'/g, "&#x27;") : "");
    // Nothing of a glide on the first paint.
    expect(html).not.toContain("saint-web-ghost");
    expect(html).not.toContain("data-gliding");
  });

  it("paints the glide itself: nothing in the style sheet eases a saint, a ring, a ghost or a light while it lasts", () => {
    const css = code("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/\.saint-web-canvas\[data-gliding\] \.saint-web-node,\s*\.saint-web-canvas\[data-gliding\] \.saint-web-ring,\s*\.saint-web-ghost,\s*\.saint-web-ghost \* \{\s*transition: none;/);
    expect(css).toContain("opacity: calc(0.3 * var(--saint-web-arrive, 1));");
    expect(css).toContain("opacity: calc(0.12 * var(--saint-web-arrive, 1));");
    // The saint chosen in the new web takes his lit ring once the glide is done, on the ring's own fade.
    expect(css).toMatch(/\.saint-web-canvas\[data-gliding\] \.saint-web-node \.saint-web-ring-on \{\s*box-shadow: none;/);
    // The new web's key fades in, and is simply there with the motion off.
    expect(css).toContain('.saint-web-key-place[data-new] {');
    expect(css).toContain(':where([data-motion="reduce"]) .saint-web-key-place[data-new] {');
  });
});

describe("a picture on the web (the build 85 note 52)", () => {
  it("never paints in halves: unseen until loaded and decoded, then faded in on the app's motion switch", () => {
    const avatar = code("components/saints/web/WebAvatar.tsx");
    expect(avatar).toContain("e.currentTarget.decode().then(done, done)");
    expect(avatar).toContain('shown === "waiting" ? "opacity-0" : "opacity-100"');
    expect(avatar).toContain("motion-safe:transition-opacity");
    // A picture that finished before the page could listen is read off the element, before the first paint.
    expect(avatar).toContain("useLayoutEffect(");
    expect(avatar).toContain("img.complete");
    // Another saint's icon is another picture, waited for in its turn.
    expect(avatar).toContain("<WebIcon key={icon} src={icon} />");
  });

  it("arrives on the first paint unseen over the circle's ground, cut at his face", () => {
    // St Anthony's standing icon has a point of its own (lib/saints/iconFaces.ts); St John's mosaic no longer does.
    const html = renderToString(
      createElement(WebAvatar, {
        node: { kind: "saint", id: "saint:x", person: { slug: "anthony-the-great", name: "St. Anthony the Great", short: "Anthony the Great", icon: "/saints/icons/anthony-the-great.jpg", initial: "A", pronoun: "his" }, ties: [] },
        size: 48,
      }),
    );
    expect(html).toMatch(/<img[^>]*src="\/saints\/icons\/anthony-the-great\.jpg"[^>]*class="[^"]*opacity-0[^"]*"[^>]*style="object-position:50% 2%"/);
    expect(html).toContain("bg-night-soft");
  });
});
