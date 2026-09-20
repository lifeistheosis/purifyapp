import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";
import { HERESIES } from "@/lib/heresies/heresies";
import { listAkathists } from "@/lib/prayers/akathists";
import { listHours } from "@/lib/prayers/hours";
import { RULES } from "@/lib/prayers/rules";
import { SAINTS } from "@/lib/saints/saints";

import { parseSourceRef, resolveSourceRef, type Registries } from "../sourceRef";

const registries: Registries = {
  topicTitle: (slug) => (slug === "the-holy-trinity" ? "The Holy Trinity" : null),
};

const saintWithWork = SAINTS.find((s) => s.works.length > 0)!;
const work = saintWithWork.works[0];
const rule = RULES.find((r) => !r.planned)!;
const hour = listHours()[0];
const akathist = listAkathists()[0];

describe("resolveSourceRef", () => {
  it("resolves every route shape against the registries", () => {
    const cases: [string, string][] = [
      [`/saints/${SAINTS[0].slug}`, SAINTS[0].name],
      [`/saints/${saintWithWork.slug}/${work.slug}#s1`, work.title],
      [`/heresies/${HERESIES[0].slug}`, HERESIES[0].name],
      [`/councils/${COUNCILS[0].slug}`, COUNCILS[0].name],
      ["/topics/the-holy-trinity", "The Holy Trinity"],
      ["/bible/john/1", "John 1"],
      ["/bible/john/3#v16", "John 3"],
      ["/prayers", "Prayers"],
      [rule.href, rule.title],
      [`/prayers/hours/${hour.slug}`, hour.title],
      [`/prayers/akathists/${akathist.slug}`, akathist.title],
    ];
    for (const [ref, label] of cases) {
      const r = resolveSourceRef(ref, registries);
      expect(r, ref).not.toBeNull();
      expect(r!.href).toBe(ref);
      expect(r!.label).toContain(label);
    }
  });

  it("fails a ref that is well formed but names nothing", () => {
    for (const ref of [
      "/saints/no-such-saint",
      `/saints/${saintWithWork.slug}/no-such-work#s1`,
      `/saints/${saintWithWork.slug}/${work.slug}#s0`,
      "/heresies/no-such-heresy",
      "/councils/no-such-council",
      "/topics/no-such-topic",
      "/bible/john/22",
      "/bible/nowhere/1",
      "/prayers/no-such-rule",
      "/prayers/hours/no-such-hour",
    ]) {
      expect(resolveSourceRef(ref, registries), ref).toBeNull();
    }
  });

  it("fails a ref that is not one of the allowed shapes", () => {
    for (const ref of [
      "https://purifyapp.net/saints/theotokos",
      "/admin",
      "/shop/icons/x",
      "saints/theotokos",
      "/saints/Theotokos",
      "/saints/theotokos/",
      "/bible/john",
      "/bible/john/1/2",
      "",
    ]) {
      expect(parseSourceRef(ref), ref).toBeNull();
      expect(resolveSourceRef(ref, registries), ref).toBeNull();
    }
  });

  it("parses the work shape into its parts", () => {
    expect(parseSourceRef("/saints/a-b/c-d#s12")).toMatchObject({
      kind: "work",
      saint: "a-b",
      work: "c-d",
      section: 12,
    });
    expect(parseSourceRef("/bible/1-john/3")).toMatchObject({ kind: "bible", book: "1-john", chapter: 3 });
  });
});
