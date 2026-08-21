// Not a guard. A printout.
//
// The projection is only useful if somebody looks at what it actually says,
// and a number that is never read is a number nobody can object to. This
// prints the three scenarios and the localization ranking so a `vitest run
// lib/owner` shows the model's own answers next to the assertions that keep
// them sane.

import { describe, it } from "vitest";
import { SCENARIOS, project, localizationLift } from "../projection";

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const pct = (n: number) => (n * 100).toFixed(2) + "%";

describe("what the model currently says", () => {
  it("prints the three scenarios", () => {
    for (const key of ["conservative", "moderate", "aggressive"] as const) {
      const p = project(SCENARIOS[key]);
      console.log(`\n  ${key.toUpperCase()}`);
      console.log(`    addressable      ${Math.round(p.totals.addressable).toLocaleString("en-US")}`);
      console.log(`    installs         ${Math.round(p.totals.installs).toLocaleString("en-US")}`);
      console.log(`    subscribers      ${Math.round(p.totals.subscribers).toLocaleString("en-US")}`);
      console.log(`    annual revenue   ${usd(p.totals.annualRevenueUsd)}`);
      console.log(
        `    penetration      ${pct(p.penetration.purify)} vs comparable ${pct(
          p.penetration.comparable,
        )}  =  ${p.penetration.ratio.toFixed(2)}x deeper`,
      );
      console.log(
        `    top three        ${p.markets
          .slice(0, 3)
          .map((m) => `${m.market.name} ${usd(m.annualRevenueUsd)}`)
          .join("  |  ")}`,
      );
    }
  });

  it("ranks what each localization is worth", () => {
    const rows = ["russia", "ukraine", "romania", "greece", "serbia", "bulgaria", "georgia", "levant"]
      .map((id) => localizationLift(id, SCENARIOS.moderate))
      .sort((a, b) => b.deltaAnnualRevenueUsd - a.deltaAnnualRevenueUsd);
    console.log("\n  LOCALIZATION LIFT, moderate case, one at a time");
    for (const r of rows) {
      console.log(
        `    ${r.marketId.padEnd(9)} ${usd(r.deltaAnnualRevenueUsd).padStart(12)}  ` +
          `(+${Math.round(r.deltaSubscribers).toLocaleString("en-US")} subscribers)`,
      );
    }
  });
});
