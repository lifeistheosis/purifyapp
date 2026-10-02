"use client";

import { useState } from "react";

import { Card, DataTable, Pill, StatCard, ToolbarButton, Email, FilterSelect } from "../primitives";
import { patchJson, shortDate, useAdminFetch } from "../adminFetch";
import { GRANTED_BADGES, type GrantedBadge } from "@/lib/profile/badges";

/**
 * Profile badges the team gives by hand.
 *
 * Plus, Pro, Verified, Early Reader and Ambassador are not here: they follow
 * the subscription, the blue check, the account's age and the ambassador
 * list, and a profile works them out each time it is opened. This tab is for
 * the six that say something only a person can know: who is on the team, who
 * moderates, who tested a beta, found a bug, translated, or contributed.
 *
 * A reader is named by @handle or by email and resolved on the server, the
 * same as Verification, so no auth id reaches this screen.
 */

type GrantRow = {
  handle: string | null;
  name: string | null;
  email: string | null;
  badge: string;
  granted_at: string;
  granted_by: string | null;
  note: string | null;
};

const LABEL: Record<GrantedBadge, string> = {
  team: "Purify Team",
  moderator: "Moderator",
  clergy: "Clergy",
  beta_tester: "Beta Tester",
  bug_hunter: "Bug Hunter",
  translator: "Translator",
  contributor: "Contributor",
};

const OPTIONS = GRANTED_BADGES.map((b) => [b, LABEL[b]] as const);

function labelOf(badge: string): string {
  return (LABEL as Record<string, string>)[badge] ?? badge;
}

/** "@name" or an email, whichever was typed, as the request body wants it. */
function target(who: string): { handle: string } | { email: string } {
  const v = who.trim();
  return v.includes("@") && !v.startsWith("@") ? { email: v } : { handle: v };
}

export function BadgesTab() {
  const { data, error, reload } = useAdminFetch<{ grants: GrantRow[]; unavailable?: boolean }>(
    "/api/admin/badges",
  );
  const [who, setWho] = useState("");
  const [badge, setBadge] = useState<GrantedBadge>("beta_tester");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const rows = data?.grants ?? [];
  const count = (b: GrantedBadge) => rows.filter((r) => r.badge === b).length;

  async function write(body: Record<string, unknown>, key: string, done: string): Promise<boolean> {
    setBusy(key);
    setStatus(null);
    setNote(null);
    const err = await patchJson("/api/admin/badges", body);
    setBusy(null);
    if (err) {
      setStatus(err);
      return false;
    }
    setNote(done);
    reload();
    return true;
  }

  async function grantTyped(grant: boolean): Promise<void> {
    const name = who.trim();
    if (!name) return;
    const ok = await write(
      { ...target(name), badge, grant, note: grant ? why.trim() || null : null },
      "typed",
      grant ? `Gave ${LABEL[badge]} to ${name}.` : `Took ${LABEL[badge]} back from ${name}.`,
    );
    if (ok) {
      setWho("");
      setWhy("");
    }
  }

  const inputStyle = {
    background: "var(--adm-control)",
    borderColor: "var(--adm-line)",
    color: "var(--adm-ink)",
  } as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Badges given" value={rows.length} accent />
        <StatCard label="Beta testers" value={count("beta_tester")} />
        <StatCard label="Bug hunters" value={count("bug_hunter")} />
        <StatCard label="Team and moderators" value={count("team") + count("moderator")} />
      </div>

      {data?.unavailable && (
        <p role="status" className="font-sans text-detail" style={{ color: "var(--adm-ink-2)" }}>
          Badges open once the profiles migration (20261001_profiles_badges.sql) has run.
        </p>
      )}
      {(error ?? status) && (
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)]">
          {error ?? status}
        </p>
      )}

      <Card
        title="Give a badge"
        subtitle="Name the reader by @handle or email. It shows on their profile right away"
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
              Reader
            </span>
            <input
              type="text"
              value={who}
              onChange={(e) => setWho(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && who.trim() && !busy) {
                  e.preventDefault();
                  void grantTyped(true);
                }
              }}
              placeholder="@handle or someone@example.com"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[13px] outline-none"
              style={inputStyle}
            />
          </label>
          <FilterSelect
            label="Badge"
            value={badge}
            onChange={(v) => setBadge(v as GrantedBadge)}
            options={OPTIONS}
          />
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
              Why (only the team sees this)
            </span>
            <input
              type="text"
              value={why}
              maxLength={200}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="Found the Psalm 151 bug"
              autoComplete="off"
              className="w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[13px] outline-none"
              style={inputStyle}
            />
          </label>
          <ToolbarButton
            variant="primary"
            loading={busy === "typed"}
            title="Give this badge"
            onClick={() => void grantTyped(true)}
          >
            Give
          </ToolbarButton>
          <ToolbarButton
            variant="danger"
            loading={busy === "typed"}
            title="Take this badge back"
            onClick={() => void grantTyped(false)}
          >
            Take back
          </ToolbarButton>
        </div>
        {note && (
          <p role="status" className="mt-2 font-sans text-[12.5px]" style={{ color: "var(--adm-good)" }}>
            {note}
          </p>
        )}
      </Card>

      <Card title="Who holds what" subtitle="Newest first. Every grant records who gave it">
        <DataTable<GrantRow>
          csvFilename="profile-badges.csv"
          columns={[
            {
              key: "who",
              label: "Reader",
              render: (r) => (
                <span className="flex flex-col">
                  <span className="text-paper/85">
                    {r.name ?? "Reader"}
                    {r.handle ? <span className="text-paper/55">{` @${r.handle}`}</span> : null}
                  </span>
                  {r.email ? <Email value={r.email} className="text-paper/55" /> : null}
                </span>
              ),
              csv: (r) => r.handle ?? r.email ?? "",
            },
            {
              key: "badge",
              label: "Badge",
              render: (r) => (
                <Pill tone={r.badge === "team" || r.badge === "moderator" || r.badge === "clergy" ? "gold" : "emerald"}>
                  {labelOf(r.badge)}
                </Pill>
              ),
              csv: (r) => r.badge,
            },
            {
              key: "why",
              label: "Why",
              render: (r) => <span className="text-paper/70">{r.note?.trim() || "No note"}</span>,
              csv: (r) => r.note ?? "",
            },
            {
              key: "given",
              label: "Given",
              render: (r) => (
                <span className="whitespace-nowrap text-paper/60">
                  {shortDate(r.granted_at)}
                  {r.granted_by ? ` · ${r.granted_by}` : ""}
                </span>
              ),
              csv: (r) => r.granted_at,
            },
            {
              key: "actions",
              label: "",
              render: (r) => {
                const key = `${r.handle ?? r.email}:${r.badge}`;
                const who = r.handle ? { handle: r.handle } : r.email ? { email: r.email } : null;
                if (!who) return null;
                return (
                  <div className="flex justify-end">
                    <ToolbarButton
                      variant="danger"
                      loading={busy === key}
                      title="Take this badge back"
                      onClick={() =>
                        void write(
                          { ...who, badge: r.badge, grant: false },
                          key,
                          `Took ${labelOf(r.badge)} back from ${r.handle ? `@${r.handle}` : r.email}.`,
                        )
                      }
                    >
                      Take back
                    </ToolbarButton>
                  </div>
                );
              },
              csv: () => "",
            },
          ]}
          rows={rows}
          rowKey={(r) => `${r.handle ?? r.email}:${r.badge}`}
          empty="No badges given yet."
        />
      </Card>
    </div>
  );
}
