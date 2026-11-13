"use client";

// The owner's desk, above the week board (docs/plans/owner-desk.md, sections
// 2 and 3, on his answers of 2026-11-13): today's emails, each with its Hold;
// when his brief comes and which day it is the weekly one; and whether the
// Sunday email, the monthly note and the feast shop email go out by
// themselves. The rules are lib/admin/ownerDesk.ts; the read and the writes
// are app/api/admin/desk/route.ts.
//
// The brief's Hold links land here (#tab=calendar), so a hold is two taps
// from the email: the link, then Hold. Holding never needs a link that acts
// on its own, which a mail client's link checker could press.

import { useCallback, useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import { clockLabel, OWNER_ZONE, WEEKDAYS, type DeskSettings } from "@/lib/admin/ownerDesk";
import type { PieceView, TodayPart } from "@/lib/admin/briefToday";

import { Card, Modal, ToolbarButton } from "../primitives";
import { Select } from "../Select";

const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

export type DeskView = {
  present: boolean;
  ok: boolean;
  settings: DeskSettings;
  saved: { at: string; by: string | null } | null;
  limits: { brief: [string, string]; send: [string, string]; holdMinutes: number };
  brief: { sent: boolean | null; at: string | null; weekly: boolean };
  today: TodayPart;
  /** The first-send guard (lib/email/look.ts): the reader emails' look, the one he cleared, and his copy of the first in a new look. */
  look: { current: string; seen: string; at: string | null; firstSent: { sent: boolean; at: string | null } | null };
  error?: string;
};

/** Every quarter hour between two "HH:MM" times, inclusive. */
function quarterHours([lo, hi]: [string, string]): { value: string; label: string }[] {
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const out: { value: string; label: string }[] = [];
  for (let m = toMin(lo); m <= toMin(hi); m += 15) {
    const v = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    out.push({ value: v, label: clockLabel(v) });
  }
  return out;
}

function pieceLine(p: PieceView): string {
  switch (p.state) {
    case "goes":
      return `Goes out at ${p.at} New York time unless you hold it.`;
    case "held":
      return "Held. It waits for you: send it from the Email page when you are ready.";
    case "by hand":
      return `Yours to send today: ${p.why}.`;
    case "nothing":
      return `Nothing to send today. ${p.why ?? ""}`.trim();
    case "gone":
      return "Gone out, or going out now.";
    case "first look":
      return `Goes to you alone at ${p.at} New York time, in the reader emails' new look. Readers get none by itself until you clear the look below.`;
    case "waits for your look":
      return "Waits for your look: the first email in the new look is in your inbox. Clear the look below and the emails go to readers again.";
  }
}

async function post<T>(body: unknown): Promise<{ data: T | null; error: string | null }> {
  try {
    const r = await fetch("/api/admin/desk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!r.ok) return { data: null, error: data?.error ?? `Request failed (${r.status})` };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

export function OwnerDesk() {
  const [view, setView] = useState<DeskView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);

  const load = useCallback(async () => {
    const d = await adminJson<DeskView>("/api/admin/desk");
    if (d) setView(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the mount
       read shares its path with every write's reload; each set is past an await. */
    void load();
  }, [load]);

  async function act(name: string, body: Record<string, unknown>) {
    setBusy(name);
    setError(null);
    const r = await post<DeskView>(body);
    setBusy(null);
    if (r.error) setError(r.error);
    else if (r.data) setView(r.data);
  }

  async function save(next: Partial<DeskSettings>) {
    if (!view) return;
    await act("settings", { action: "settings", settings: { ...view.settings, ...next } });
  }

  async function openPreview() {
    setBusy("preview");
    setError(null);
    const r = await post<{ subject: string; html: string }>({ action: "preview" });
    setBusy(null);
    if (r.error) setError(r.error);
    else if (r.data) setPreview(r.data);
  }

  if (loading && !view) {
    return (
      <Card title="The owner's desk" subtitle="Your morning brief, and the emails that send themselves.">
        <p className="text-sm" style={ink3}>
          Reading the desk…
        </p>
      </Card>
    );
  }
  if (!view) {
    return (
      <Card title="The owner's desk" subtitle="Your morning brief, and the emails that send themselves.">
        <p className="text-sm" style={ink2}>
          The desk could not be read just now. The brief still comes at its hour.
        </p>
        <div className="mt-3">
          <ToolbarButton onClick={() => void load()}>Try again</ToolbarButton>
        </div>
      </Card>
    );
  }

  const s = view.settings;
  const writable = view.present && view.ok;
  const { today } = view;

  return (
    <Card title="The owner's desk" subtitle="Your morning brief, and the emails that send themselves.">
      <div className="space-y-6">
        {!writable && (
          <p className="text-sm" style={ink2}>
            {view.present
              ? "The desk's settings could not be read just now, so nothing goes out by itself today. The brief still comes."
              : "site_settings is not on this database, so the defaults stand and nothing goes out by itself."}
          </p>
        )}

        {view.look.current !== view.look.seen ? (
          <section aria-labelledby="desk-look">
            <h3 id="desk-look" className="font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
              The reader emails have a new look
            </h3>
            <p className="mt-1 text-sm" style={ink2}>
              {view.look.firstSent?.sent
                ? `The first one in it went to you alone${view.look.firstSent.at ? ` at ${new Date(view.look.firstSent.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: OWNER_ZONE })} New York time` : ""}. Look at it in your own inbox: once you have, the emails go to readers by themselves again.`
                : "The next email due to go out by itself goes to you alone first, so your inbox is the first to see the new look. Readers get none by itself until you have seen it."}
            </p>
            {writable ? (
              <div className="mt-3">
                <ToolbarButton loading={busy === "look"} onClick={() => void act("look", { action: "look-seen" })}>
                  I have seen it in my inbox
                </ToolbarButton>
              </div>
            ) : null}
          </section>
        ) : null}

        <section aria-labelledby="desk-today">
          <h3 id="desk-today" className="font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
            Today&apos;s emails
          </h3>
          {today.pieces.length === 0 && !today.board ? (
            <p className="mt-1 text-sm" style={ink2}>
              Nothing is due to go out today.
            </p>
          ) : (
            <ul className="mt-2 space-y-3">
              {today.pieces.map((p) => (
                <li key={p.ruleKey} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--adm-ink)" }}>
                      {p.name}
                      {p.subject ? <span style={ink3}>{`: "${p.subject}"`}</span> : null}
                    </p>
                    <p className="text-sm" style={ink2}>
                      {pieceLine(p)}
                    </p>
                  </div>
                  {(p.state === "goes" || p.state === "first look") && writable ? (
                    <ToolbarButton loading={busy === `hold:${p.ruleKey}`} onClick={() => void act(`hold:${p.ruleKey}`, { action: "hold", ruleKey: p.ruleKey })}>
                      Hold
                    </ToolbarButton>
                  ) : p.state === "held" && writable ? (
                    <ToolbarButton
                      loading={busy === `release:${p.ruleKey}`}
                      onClick={() => void act(`release:${p.ruleKey}`, { action: "release", ruleKey: p.ruleKey })}
                    >
                      Let it go out
                    </ToolbarButton>
                  ) : p.state === "by hand" ? (
                    <a className="inline-flex min-h-11 items-center text-sm underline" href="#tab=email" style={{ color: "var(--adm-ink)" }}>
                      Send it
                    </a>
                  ) : null}
                </li>
              ))}
              {today.board ? (
                <li>
                  <p className="text-sm font-medium" style={{ color: "var(--adm-ink)" }}>
                    The board message
                  </p>
                  <p className="text-sm" style={ink2}>
                    Due today. It never posts itself: it waits for your tap in Patch notes.
                  </p>
                  {today.board.text ? (
                    <p
                      className="mt-2 rounded-[var(--adm-radius-sm)] px-3 py-2 text-sm"
                      style={{ background: "var(--adm-panel-2)", color: "var(--adm-ink)" }}
                    >
                      {today.board.text}
                    </p>
                  ) : null}
                  <a className="mt-1 inline-flex min-h-11 items-center text-sm underline" href="#tab=patch-notes" style={{ color: "var(--adm-ink)" }}>
                    Open Patch notes
                  </a>
                </li>
              ) : null}
            </ul>
          )}
        </section>

        <section aria-labelledby="desk-brief">
          <h3 id="desk-brief" className="font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
            Your brief
          </h3>
          <p className="mt-1 text-sm" style={ink2}>
            One email a day, in place of the morning board email and the Monday letter. Yesterday on one screen, what needs you,
            and what goes out today. No reader&apos;s name or address is ever in it.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm" style={ink2}>
            <span id="desk-brief-at">Comes at</span>
            <div className="w-[9.5rem]">
              <Select
                ariaLabelledBy="desk-brief-at"
                value={s.briefAt}
                options={quarterHours(view.limits.brief)}
                onChange={(v) => void save({ briefAt: v })}
                disabled={!writable || busy !== null}
              />
            </div>
            <span id="desk-weekly">New York time. The weekly one comes on</span>
            <div className="w-[9.5rem]">
              <Select
                ariaLabelledBy="desk-weekly"
                value={String(s.weeklyDay)}
                options={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))}
                onChange={(v) => void save({ weeklyDay: Number(v) })}
                disabled={!writable || busy !== null}
              />
            </div>
          </div>
          <p className="mt-2 text-sm" style={ink3}>
            {view.brief.sent === null
              ? "Whether today's brief has gone could not be read."
              : view.brief.sent
                ? `Today's ${view.brief.weekly ? "weekly " : ""}brief went${view.brief.at ? ` at ${new Date(view.brief.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: OWNER_ZONE })} New York time` : ""}.`
                : `Today's ${view.brief.weekly ? "weekly " : ""}brief has not gone yet.`}
          </p>
          <div className="mt-3">
            <ToolbarButton loading={busy === "preview"} onClick={() => void openPreview()}>
              Preview today&apos;s brief
            </ToolbarButton>
          </div>
        </section>

        <section aria-labelledby="desk-auto">
          <h3 id="desk-auto" className="font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
            Sending by itself: {s.autoSend ? "on" : "off"}
          </h3>
          <p className="mt-1 text-sm" style={ink2}>
            The Sunday email, the monthly note and the feast shop email go out on their day once the morning brief has named
            them with a Hold, at least {view.limits.holdMinutes / 60} hours after it. A day with nothing to send sends nothing.
            The board message always waits for you.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm" style={ink2}>
            <span id="desk-send-at">They go at</span>
            <div className="w-[9.5rem]">
              <Select
                ariaLabelledBy="desk-send-at"
                value={s.sendAt}
                options={quarterHours(view.limits.send)}
                onChange={(v) => void save({ sendAt: v })}
                disabled={!writable || busy !== null}
              />
            </div>
            <span>New York time.</span>
            {writable ? (
              <ToolbarButton loading={busy === "settings-auto"} onClick={() => void act("settings-auto", { action: "settings", settings: { ...s, autoSend: !s.autoSend } })}>
                {s.autoSend ? "Turn off" : "Turn on"}
              </ToolbarButton>
            ) : null}
          </div>
          {view.saved ? (
            <p className="mt-2 text-xs" style={ink3}>
              {`Last changed ${new Date(view.saved.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${view.saved.by ? ` by ${view.saved.by}` : ""}.`}
            </p>
          ) : null}
        </section>

        {error ? (
          <p role="alert" className="text-sm" style={{ color: "var(--adm-ink)" }}>
            {error}
          </p>
        ) : null}
      </div>

      {preview ? (
        <Modal title="Today's brief" subtitle={preview.subject} onClose={() => setPreview(null)} wide>
          <iframe
            title="Today's brief, as it would arrive"
            srcDoc={preview.html}
            sandbox=""
            className="h-[70vh] w-full rounded-[var(--adm-radius-sm)] border-0"
          />
        </Modal>
      ) : null}
    </Card>
  );
}
