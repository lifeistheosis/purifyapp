"use client";

import type { ReactNode } from "react";

import { ADMIN_TAB_ICONS, ADMIN_TAB_ICON_FALLBACK } from "../nav-icons";
import { STARTED_ITEMS, startedComplete, useGettingStarted } from "@/lib/admin/ledger/pins";

/**
 * The left rail, 232px, on the rail ground with a hairline on its right.
 *
 * Top to bottom: the wordmark in the serif (one of the two places the serif
 * is allowed), the workspace line, whatever the shell wants above the nav
 * (the Operations | Owner switch), the six groups, the live rows, the
 * Getting started card, and the footer. Only the nav region scrolls.
 *
 * The active item is a filled row: --adm-nav-active-bg behind full-contrast
 * ink, with the icon tinted in the accent. AdminShell owns the groups and the
 * active id; this file owns how they look.
 *
 * RESTORED 2026-09-13. v1.4 drew the active item as gold text with a 2px bar
 * down its left edge and no fill. That bar is the same rule the owner had
 * asked to have removed before v1.4 (see --adm-nav-bar in admin-theme.css),
 * and the owner rejected the v1.4 theme, so the row goes back to the fill.
 */
export type RailTab = {
  id: string;
  label: string;
  /** Title attribute: one line on what the tab is for. */
  eyebrow?: string;
  badge?: { count: number; title: string } | null;
};

export type RailGroup = { group: string; tabs: RailTab[] };

export function Rail({
  groups,
  active,
  onSelect,
  workspace = "Production",
  roleLabel,
  top,
  live,
  footer,
  showGettingStarted = true,
}: {
  groups: RailGroup[];
  active: string;
  onSelect: (id: string) => void;
  workspace?: string;
  /** "Admin" or "Owner": which gate this session cleared. */
  roleLabel?: string;
  top?: ReactNode;
  live?: ReactNode;
  footer?: ReactNode;
  showGettingStarted?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Wordmark workspace={workspace} roleLabel={roleLabel} />
      {top}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <nav aria-label="Admin sections">
          {groups.map((g, i) => (
            <div
              key={g.group}
              className={i === 0 ? "" : "mt-3 border-t pt-3"}
              style={i === 0 ? undefined : { borderColor: "var(--adm-line)" }}
            >
              <p className="mb-1 px-2 font-sans text-[11.5px] font-medium" style={{ color: "var(--adm-ink-3)" }}>
                {g.group}
              </p>
              <ul>
                {g.tabs.map((t) => (
                  <RailItem key={t.id} tab={t} on={t.id === active} onSelect={onSelect} />
                ))}
              </ul>
            </div>
          ))}
        </nav>
        {live}
        {showGettingStarted ? <GettingStarted onOpen={onSelect} /> : null}
      </div>
      {footer}
    </div>
  );
}

function Wordmark({ workspace, roleLabel }: { workspace: string; roleLabel?: string }) {
  return (
    <div className="mb-3 px-2 pt-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="adm-serif text-[19px] leading-none" style={{ color: "var(--adm-ink)" }}>
          Purify
        </span>
        {roleLabel ? (
          <span
            className="rounded-[var(--adm-radius-pill)] border px-1.5 py-px font-sans text-[10px] font-medium uppercase tracking-wide"
            style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink-3)" }}
          >
            {roleLabel}
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        Purify · {workspace}
      </p>
    </div>
  );
}

function RailItem({
  tab,
  on,
  onSelect,
}: {
  tab: RailTab;
  on: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(tab.id)}
        aria-current={on ? "page" : undefined}
        title={tab.eyebrow}
        className="adm-rail-item flex w-full items-center gap-2 rounded-[var(--adm-radius-sm)] px-2 py-[6px] text-left font-sans text-[13px]"
        style={
          on
            ? {
                // The surface carries the state: a neutral fill behind
                // full-contrast ink, not a tinted label on a tinted wash.
                background: "var(--adm-nav-active-bg)",
                color: "var(--adm-nav-active-fg)",
                fontWeight: 600,
              }
            : { color: "var(--adm-ink-2)" }
        }
      >
        <span className="grid shrink-0 place-items-center" style={{ color: on ? "var(--adm-nav-bar)" : "var(--adm-ink-3)" }}>
          {ADMIN_TAB_ICONS[tab.id] ?? ADMIN_TAB_ICON_FALLBACK}
        </span>
        <span className="min-w-0 flex-1 truncate">{tab.label}</span>
        {tab.badge ? (
          <span
            className="shrink-0 rounded-[var(--adm-radius-pill)] px-1.5 py-px font-sans text-[11px] font-semibold"
            style={{ background: "var(--adm-badge-bg)", color: "var(--adm-badge-fg)" }}
            title={tab.badge.title}
          >
            {tab.badge.count}
          </span>
        ) : null}
      </button>
    </li>
  );
}

/**
 * Five things a new operator does once. A checkbox each, a hairline
 * progress line, and the card removes itself when all five are ticked.
 * State is per browser (localStorage), which is the right scope for a
 * card that exists to be dismissed.
 */
function GettingStarted({ onOpen }: { onOpen: (id: string) => void }) {
  const [done, toggle] = useGettingStarted();
  if (startedComplete(done)) return null;
  const n = STARTED_ITEMS.filter((i) => done.has(i.id)).length;
  return (
    <section
      aria-label="Getting started"
      className="mt-4 rounded-[var(--adm-radius)] border p-3"
      style={{ background: "var(--adm-card)", borderColor: "var(--adm-line)", boxShadow: "var(--adm-shadow-card)" }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-sans text-[12.5px] font-medium" style={{ color: "var(--adm-ink)" }}>
          Getting started
        </p>
        <p className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)", fontVariantNumeric: "tabular-nums" }}>
          {n} of {STARTED_ITEMS.length}
        </p>
      </div>
      <div className="mt-2 h-px w-full" style={{ background: "var(--adm-line)" }}>
        <div className="h-px" style={{ width: `${(n / STARTED_ITEMS.length) * 100}%`, background: "var(--adm-accent)" }} />
      </div>
      <ul className="mt-2 flex flex-col">
        {STARTED_ITEMS.map((i) => {
          const checked = done.has(i.id);
          return (
            <li key={i.id} className="flex items-center gap-2">
              <input
                id={`gs-${i.id}`}
                type="checkbox"
                checked={checked}
                onChange={() => toggle(i.id)}
                className="h-4 w-4 shrink-0"
                style={{ accentColor: "var(--adm-accent)" }}
              />
              <label htmlFor={`gs-${i.id}`} className="sr-only">
                {i.label}
              </label>
              <button
                type="button"
                onClick={() => onOpen(i.tab)}
                className="min-w-0 flex-1 truncate py-2 text-left font-sans text-[12px]"
                style={{
                  color: checked ? "var(--adm-ink-3)" : "var(--adm-ink-2)",
                  textDecoration: checked ? "line-through" : undefined,
                }}
              >
                {i.label}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
