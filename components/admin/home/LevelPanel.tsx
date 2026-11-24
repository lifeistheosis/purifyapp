"use client";

/**
 * Home's lead: Level 1, "Purify pays its own bills" (docs/plans/levels.md).
 * One bar, net Plus against the running costs, and the four figures that
 * move it: paying members, trials, members set to end, and new accounts this
 * week against last. docs/plans/admin-levels-rework.md, step 1.
 *
 * Each thing once: paying members stand here and nowhere else on Home (the
 * "Paying for Plus" card leaves the numbers row). Costs not read is said in
 * words, never a bar at 0.
 */

import { formatPrice } from "@/lib/shop/format";
import { SENSITIVE } from "@/lib/admin/streamer";
import type { Level } from "@/lib/admin/level";

import { Figure, Panel, PanelLink, Quiet } from "../daily/parts";

const usd = (c: number) => formatPrice(c, "usd");
const n = new Intl.NumberFormat("en-US");

export function LevelPanel({ level, onOpen, failed = false }: { level: Level | null; onOpen?: () => void; failed?: boolean }) {
  if (!level) {
    return (
      <Panel title="Level 1: Purify pays its own bills">
        <Quiet>{failed ? "Level 1 could not be read just now." : "Reading."}</Quiet>
      </Panel>
    );
  }
  const from = level.costsFrom === "bank" ? "the bank" : "your cost lines";
  return (
    <Panel
      title="Level 1: Purify pays its own bills"
      action={onOpen ? <PanelLink onClick={onOpen}>Open Money</PanelLink> : undefined}
      pad="px-4 pt-3.5 pb-3"
    >
      {level.pct === null ? (
        <Quiet>The running costs could not be read, so the level is not measured.</Quiet>
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <Figure size={34} lit sensitive>
              {level.pct}%
            </Figure>
            <span className="font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
              {level.reached ? "reached" : "of the way"}
            </span>
          </p>
          <span
            className="mt-2.5 block h-2 w-full overflow-hidden rounded-full"
            style={{ background: "var(--adm-line)" }}
            role="img"
            aria-label={`${level.pct}% of the way to Purify paying its own bills`}
          >
            <span className="block h-full rounded-full" style={{ width: `${level.pct}%`, background: "var(--adm-accent)" }} />
          </span>
          <p className={"mt-2 font-sans text-[12.5px] " + SENSITIVE} style={{ color: "var(--adm-ink-3)" }}>
            {usd(level.netPlusCents)} of {usd(level.costsCents ?? 0)} a month, from {from}
            {level.reached ? "." : `. About ${n.format(level.membersToGo ?? 0)} more members to go.`}
          </p>
        </>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 sm:grid-cols-4" style={{ borderColor: "var(--adm-line)" }}>
        {[
          { k: "Paying members", v: n.format(level.paid), sub: "Plus and Pro" },
          { k: "In a free trial", v: n.format(level.trials), sub: "not paying yet" },
          { k: "Set to end", v: n.format(level.cancelling), sub: "auto renew off" },
          {
            k: "New accounts",
            v: n.format(level.newWeek),
            sub: level.newChangePct === null ? "this week" : `${level.newChangePct > 0 ? "+" : ""}${level.newChangePct}% on last week`,
          },
        ].map((f) => (
          <div key={f.k} className="min-w-0">
            <dt className="truncate font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
              {f.k}
            </dt>
            <dd className="mt-1">
              <Figure size={22}>{f.v}</Figure>
              <span className="mt-0.5 block truncate font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                {f.sub}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
