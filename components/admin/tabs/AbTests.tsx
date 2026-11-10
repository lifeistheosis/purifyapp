"use client";

import type { AbAdminPayload } from "@/app/api/admin/ab/route";
import { SMALLEST_CELL, WAIT_DAYS, type PanelCell, type TestPanel } from "@/lib/ab/panel";

import { useAdminFetch } from "../adminFetch";
import { Card } from "../primitives";

/**
 * Reach > Onboarding, "Tests" (1.9): each test of two versions as the owner
 * reads it. The question, one line on where it stands, and for each version
 * how many were shown it, how many are past their two weeks, the count it is
 * judged by, the counts that must not get worse, and today's share of new
 * devices. A count under twenty reads "too few to show" (lib/ab/panel.ts).
 * The words are the panel's own; nothing here decides anything.
 */

const ink2 = { color: "var(--adm-ink-2)" };
const ink3 = { color: "var(--adm-ink-3)" };
const few = "too few to show";

const count = (n: number | null) => (n === null ? few : n.toLocaleString("en-US"));
const pct = (x: number) => `${Math.round(x * 100)}%`;
function reads(c: PanelCell): string {
  return c === null ? few : `${c.n.toLocaleString("en-US")}${c.rate === null ? "" : ` (${pct(c.rate)})`}`;
}

function Test({ test }: { test: TestPanel }) {
  return (
    <Card title={test.asks}>
      <p className="font-sans text-[14px] font-semibold" style={{ color: "var(--adm-ink)" }}>
        {test.line}
      </p>
      <p className="mt-1 font-sans text-[13px]" style={ink3}>
        Judged by how many {test.judge}. A device is read once {WAIT_DAYS} days have passed since it was shown its version.
        {test.running ? ` Last day ${test.ends}.` : ""}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse font-sans text-[13px]">
          <thead>
            <tr style={ink3}>
              <th className="py-2 pe-4 text-start font-semibold">Version</th>
              <th className="py-2 pe-4 text-start font-semibold">Shown</th>
              <th className="py-2 pe-4 text-start font-semibold">Past two weeks</th>
              <th className="py-2 pe-4 text-start font-semibold">{capital(test.judge)}</th>
              {test.arms[0]?.guards.map((g) => (
                <th key={g.what} className="py-2 pe-4 text-start font-semibold">
                  {capital(g.words)}
                </th>
              ))}
              <th className="py-2 text-start font-semibold">Share today</th>
            </tr>
          </thead>
          <tbody>
            {test.arms.map((arm) => (
              <tr key={arm.arm} className="border-t" style={{ borderColor: "var(--adm-line)", ...ink2 }}>
                <td className="py-2 pe-4 font-semibold" style={{ color: "var(--adm-ink)" }}>
                  {arm.arm}
                </td>
                <td className="py-2 pe-4 tabular-nums">{count(arm.shown)}</td>
                <td className="py-2 pe-4 tabular-nums">{count(arm.matured)}</td>
                <td className="py-2 pe-4 tabular-nums">{reads(arm.judge)}</td>
                {arm.guards.map((g) => (
                  <td key={g.what} className="py-2 pe-4 tabular-nums">
                    {reads(g.cell)}
                  </td>
                ))}
                <td className="py-2 tabular-nums">{pct(arm.weight)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-sans text-[12px]" style={ink3}>
        Every number is a total with no reader in it, and none under {SMALLEST_CELL} is shown.
      </p>
    </Card>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AbTests() {
  const { data, error } = useAdminFetch<AbAdminPayload>("/api/admin/ab");
  if (error || (data && "unavailable" in data)) {
    return (
      <Card title="Tests">
        <p className="font-sans text-[13px]" style={ink3}>
          {data && "unavailable" in data ? data.unavailable : error}
        </p>
      </Card>
    );
  }
  if (!data || !data.tests.length) return null;
  return (
    <div className="space-y-6">
      {data.tests.map((test) => (
        <Test key={test.id} test={test} />
      ))}
    </div>
  );
}
