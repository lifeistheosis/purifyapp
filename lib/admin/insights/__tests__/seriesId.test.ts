import { describe, expect, it } from "vitest";
import {
  labelOf,
  legacyIdMap,
  legacySeriesId,
  parseHeader,
  seriesIdOf,
} from "../seriesId";

/** The real headers, from the owner's two Play Console exports. */
const AUDIENCE = (dim: string) =>
  `Installed audience (All users, Unique users, Per interval, Daily): ${dim}`;
const IMPRESSIONS = (dim: string) =>
  `Device impressions (Per interval, Daily): ${dim}`;

describe("parseHeader", () => {
  it("splits the Play Console shape into metric, qualifiers and dimension", () => {
    const p = parseHeader(AUDIENCE("United States"));
    expect(p.metric).toBe("Installed audience");
    expect(p.qualifiers).toBe("All users, Unique users, Per interval, Daily");
    expect(p.dimension).toBe("United States");
    expect(p.structured).toBe(true);
  });

  it("handles a dimension with no qualifiers", () => {
    const p = parseHeader("Installs: Germany");
    expect(p.metric).toBe("Installs");
    expect(p.qualifiers).toBe("");
    expect(p.dimension).toBe("Germany");
  });

  it("treats a plain column as a metric with no dimension", () => {
    const p = parseHeader("Installs");
    expect(p.metric).toBe("Installs");
    expect(p.dimension).toBe("");
    expect(p.structured).toBe(false);
  });

  it("keeps a slash inside the dimension", () => {
    expect(parseHeader(AUDIENCE("All countries / regions")).dimension).toBe(
      "All countries / regions",
    );
  });
});

describe("seriesIdOf", () => {
  it("NEVER truncates the dimension, which the old scheme did", () => {
    // The regression this module exists for. The old id cut at 80 characters,
    // and the metric prefix is 61 of them, so "All countries / regions" was
    // stored as "...all-countries-regio" in real production data.
    const id = seriesIdOf(AUDIENCE("All countries / regions"));
    expect(id).toContain("all-countries-regions");
    expect(id).not.toContain("all-countries-regio|");
    expect(legacySeriesId(AUDIENCE("All countries / regions"))).toContain(
      "all-countries-regio",
    );
    expect(legacySeriesId(AUDIENCE("All countries / regions"))).not.toContain(
      "all-countries-regions",
    );
  });

  it("keeps every sibling country distinct", () => {
    const ids = [
      "All countries / regions",
      "United States",
      "Philippines",
      "Germany",
      "South Africa",
    ].map((d) => seriesIdOf(AUDIENCE(d)));
    expect(new Set(ids).size).toBe(5);
  });

  it("separates two long dimensions that share a long prefix", () => {
    // Exactly the case the old scheme could merge silently once the metric
    // prefix ate the character budget.
    const a = seriesIdOf(AUDIENCE("United States Minor Outlying Islands"));
    const b = seriesIdOf(AUDIENCE("United States Virgin Islands"));
    expect(a).not.toBe(b);
  });

  it("separates two metrics that share a dimension", () => {
    expect(seriesIdOf(AUDIENCE("Germany"))).not.toBe(seriesIdOf(IMPRESSIONS("Germany")));
  });

  it("treats different qualifiers as different series", () => {
    // "Per interval" and "Cumulative" measure different things. Folding them
    // together would sum a running total as though it were a daily count.
    const perInterval = "Installed audience (Per interval, Daily): Germany";
    const cumulative = "Installed audience (Cumulative, Daily): Germany";
    expect(seriesIdOf(perInterval)).not.toBe(seriesIdOf(cumulative));
  });

  it("is stable for the same header", () => {
    expect(seriesIdOf(AUDIENCE("Germany"))).toBe(seriesIdOf(AUDIENCE("Germany")));
  });

  it("is insensitive to surrounding whitespace", () => {
    expect(seriesIdOf(`  ${AUDIENCE("Germany")}  `)).toBe(seriesIdOf(AUDIENCE("Germany")));
  });

  it("produces something usable for a junk header", () => {
    // A header of pure punctuation must not collapse every such column into one
    // shared series.
    // Two junk headers must still be told apart, or every unparseable column
    // in a report would merge into one series.
    expect(seriesIdOf("***")).not.toBe(seriesIdOf("### zeta"));
    expect(seriesIdOf("***")).toBeTruthy();
    expect(seriesIdOf("")).toBeTruthy();
  });

  it("stays a reasonable length even for an absurd header", () => {
    const id = seriesIdOf(`${"Metric ".repeat(40)}(${"q ".repeat(40)}): ${"Dim ".repeat(40)}`);
    expect(id.length).toBeLessThanOrEqual(48 + 48 + 64 + 2);
  });
});

describe("legacy remapping", () => {
  it("maps every old id to its new one exactly", () => {
    const headers = [
      AUDIENCE("All countries / regions"),
      AUDIENCE("United States"),
      IMPRESSIONS("Google Play explore"),
    ];
    const map = legacyIdMap(headers);
    for (const h of headers) {
      expect(map.get(legacySeriesId(h))).toBe(seriesIdOf(h));
    }
  });

  it("covers the real id currently stored in the owner's browser", () => {
    // Verbatim from localStorage on 2026-08-22, truncated mid-word by the old
    // scheme. The remap has to recognise it.
    const stored =
      "installed-audience-all-users-unique-users-per-interval-daily-all-countries-regio";
    const map = legacyIdMap([AUDIENCE("All countries / regions")]);
    expect(map.has(stored)).toBe(true);
    expect(map.get(stored)).toBe(seriesIdOf(AUDIENCE("All countries / regions")));
  });

  it("does not lose a goal whose series is still present", () => {
    const headers = [AUDIENCE("United States"), AUDIENCE("Philippines")];
    const map = legacyIdMap(headers);
    expect(map.size).toBe(2);
    for (const v of map.values()) expect(v).toContain("|");
  });
});

describe("labelOf", () => {
  it("names the dimension, which is what distinguishes siblings", () => {
    expect(labelOf(AUDIENCE("United States"))).toBe("United States");
    expect(labelOf(IMPRESSIONS("Google Play explore"))).toBe("Google Play explore");
  });

  it("calls the all-countries column a total rather than repeating the metric", () => {
    expect(labelOf(AUDIENCE("All countries / regions"))).toBe("Installed audience, total");
  });

  it("falls back to the metric when there is no dimension", () => {
    expect(labelOf("Installs")).toBe("Installs");
  });
});
