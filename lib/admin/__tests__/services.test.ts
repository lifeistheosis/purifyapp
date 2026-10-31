import { describe, expect, it } from "vitest";

import { libraryLine, servicesPage, type ProbeIn } from "../services";

/**
 * Services, his pick A on r3-17 (2026-10-30): one sentence, a box for each
 * problem (dashed for a warning, solid for a failure), the rest one line
 * each, the library one line. Every figure below is made up for the test.
 */

const NOW = Date.parse("2026-10-30T18:12:00Z");

const ok = (service: string, latencyMs = 50): ProbeIn => ({ service, status: "ok", detail: "", latencyMs });
const ALL_OK: ProbeIn[] = [
  ok("Supabase Postgres", 82),
  ok("Rate limiter (rate_limit_hit)", 41),
  { service: "API.Bible (licensed Scripture)", status: "skipped", detail: "Licensed translations switched off (LICENSED_BIBLE is not on)", latencyMs: null },
  ok("Buy Me a Coffee", 210),
  ok("ipwho.is (geo enrichment)", 95),
];

const failedDeploy: ProbeIn = {
  service: "Render (deploys)",
  status: "fail",
  detail: "latest deploy build_failed (1a2b3c4); the site still serves 9f8e7d6",
  latencyMs: 300,
  deploy: {
    failed: true,
    status: "build_failed",
    commit: "1a2b3c4",
    at: "2026-10-30T18:00:00Z",
    serving: { commit: "9f8e7d6", at: "2026-10-29T10:00:00Z" },
    url: "https://dashboard.render.com/web/srv/deploys/dep",
  },
  url: "https://dashboard.render.com/web/srv/deploys/dep",
};

describe("the Services page in words", () => {
  it("is one sentence on a quiet day, and every service is a line", () => {
    const p = servicesPage(ALL_OK, NOW);
    expect(p.sentence).toBe("Everything answers.");
    expect(p.problems).toEqual([]);
    expect(p.lines.map((l) => [l.name, l.says, l.ms, l.tone])).toEqual([
      ["Supabase", "the profiles table answers", 82, "good"],
      ["Rate limiter", "writes are throttled", 41, "good"],
      ["API.Bible", "off: licensed translations switched off (LICENSED_BIBLE is not on)", null, "idle"],
      ["Buy Me a Coffee", "supporters answer", 210, "good"],
      ["ipwho.is", "lookups answer", 95, "good"],
    ]);
    for (const l of p.lines) expect(l.note.length, l.name).toBeGreaterThan(20);
  });

  it("gives a failed deploy its own dashed box, says what it means, and links to Render", () => {
    const p = servicesPage([...ALL_OK, failedDeploy], NOW);
    expect(p.sentence).toBe("One thing to look at.");
    expect(p.problems).toHaveLength(1);
    const [render] = p.problems;
    expect(render.box).toBe("warn");
    expect(render.title).toBe("Render: the latest deploy failed");
    expect(render.body).toBe(
      "Build 1a2b3c4 failed 12 minutes ago. The site still serves the deploy before it, so readers see nothing wrong. Render's log says why.",
    );
    expect(render.open).toEqual({ label: "Open Render", href: failedDeploy.url });
    // And it is not also a line.
    expect(p.lines.map((l) => l.name)).not.toContain("Render");
  });

  it("puts a failure (solid) before a warning (dashed)", () => {
    const p = servicesPage(
      [failedDeploy, { service: "Rate limiter (rate_limit_hit)", status: "fail", detail: "rpc error", latencyMs: 5 }],
      NOW,
    );
    expect(p.sentence).toBe("Two things to look at.");
    expect(p.problems.map((x) => [x.key, x.box])).toEqual([
      ["limiter", "fail"],
      ["render", "warn"],
    ]);
    expect(p.problems[0].body).toContain("rpc error");
  });

  it("says when Render itself did not answer, which is not a failed deploy", () => {
    const p = servicesPage([{ service: "Render (deploys)", status: "fail", detail: "HTTP 503", latencyMs: 20, deploy: null }], NOW);
    expect(p.problems[0].title).toBe("Render did not answer");
    expect(p.problems[0].body).toContain("HTTP 503");
  });

  it("names a live deploy on its line", () => {
    const live: ProbeIn = {
      ...failedDeploy,
      status: "ok",
      deploy: { ...failedDeploy.deploy!, failed: false, status: "live" },
    };
    expect(servicesPage([live], NOW).lines[0].says).toBe("the latest deploy is live (1a2b3c4)");
  });
});

describe("the library as one line", () => {
  it("sums up the list it opens", () => {
    expect(
      libraryLine({
        saints: { total: 79, incomplete: 12, missingIcons: 0, noIconAtAll: 0 },
        calendar: { days: 366, expectedDays: 366 },
        bible: { books: Array.from({ length: 86 }, (_, i) => ({ book: `b${i}`, chapters: 1 })) },
      }),
    ).toBe("79 saints, 12 not complete, every icon on file, 366 of 366 days, 86 Bible books.");
  });

  it("counts the saints without an icon file", () => {
    expect(
      libraryLine({
        saints: { total: 2, incomplete: 0, missingIcons: 1, noIconAtAll: 1 },
        calendar: { days: 300, expectedDays: 366 },
        bible: { books: [{ book: "genesis", chapters: 50 }] },
      }),
    ).toBe("2 saints, every one complete, 2 without an icon file, 300 of 366 days, 1 Bible book.");
  });
});
