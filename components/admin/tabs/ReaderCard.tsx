"use client";

/**
 * A reader's card: everything about one reader, and everything done for
 * them, in one place. The owner's pick C for Users on sheet r3-15
 * (2026-10-30): "one directory with the reader's card does verification,
 * badges and comps without a switch".
 *
 * The card reads /api/admin/readers?id=. Every action goes to the route that
 * already holds it, behind the same admin gate, and each is recorded in the
 * activity log by that route: the blue check (/api/admin/verification), the
 * clergy seal (/api/admin/clergy), a badge (/api/admin/badges), comped Plus
 * (/api/admin/subscriptions/comp, which writes the entitlement through the
 * service role) and a gift (/api/admin/gifts, which writes nothing until the
 * reader claims it). Comping and gifting ask once more before they go.
 */

import { useEffect, useState, type ReactNode } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import { badgeLabel, BADGE_LABEL, initialsOf, PROVIDER_LABEL, sourceWord, type Reader } from "@/lib/admin/readers";
import { formatPrice } from "@/lib/shop/format";
import { GRANTED_BADGES, type GrantedBadge } from "@/lib/profile/badges";

import { patchJson } from "../adminFetch";
import { Chevron, Quiet, Segmented } from "../daily/parts";
import { StatusDot } from "../primitives";
import { SENSITIVE } from "@/lib/admin/streamer";

type CardPayload = {
  reader: Reader;
  plan: { plus_until: string | null; pro_until: string | null; plus_source: string | null; auto_renew: boolean | null; billing_issue_at: string | null } | null;
  badges: { badge: string; granted_at: string; granted_by: string | null; note: string | null }[];
  check: { status: "requested" | "verified" | "declined"; claim: string | null; requested_at: string; decided_at: string | null; decided_by: string | null } | null;
  seal: {
    status: "requested" | "verified" | "declined";
    rank: string | null;
    jurisdiction: string | null;
    parish: string | null;
    evidence: string | null;
    requested_at: string;
    decided_at: string | null;
    decided_by: string | null;
  } | null;
  orders: { total_cents: number; payment_status: string; created_at: string }[];
  unread: string[];
};

const date = (iso: string | null | undefined, withYear = true) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: withYear ? "long" : "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) })
    : "";

const time = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  const clock = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return today ? `today at ${clock}` : `${date(iso, false)} at ${clock}`;
};

function Kv({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2.5 border-t py-2 font-sans text-[13px] first:border-t-0" style={{ borderColor: "var(--adm-line)" }}>
      <span className="w-[96px] shrink-0 text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        {k}
      </span>
      <span className="min-w-0" style={{ color: "var(--adm-ink)" }}>
        {children}
      </span>
    </div>
  );
}

const btn = (primary: boolean) =>
  ({
    className: "adm-control inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[6px] border px-3 font-sans text-[12.5px] md:min-h-[32px]",
    style: primary
      ? ({
          "--_bg": "var(--adm-accent)",
          "--_bg-hover": "color-mix(in oklab, var(--adm-accent), var(--adm-bg) 14%)",
          borderColor: "var(--adm-accent)",
          color: "var(--adm-on-accent)",
          fontWeight: 600,
          boxShadow: "var(--adm-lit-soft)",
        } as React.CSSProperties)
      : ({
          "--_bg": "transparent",
          "--_bg-hover": "var(--adm-panel-2)",
          borderColor: "var(--adm-line-strong)",
          color: "var(--adm-ink-2)",
        } as React.CSSProperties),
  });

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4.5 10.4 8.2 14l7.3-8" />
  </svg>
);

const inputStyle = {
  background: "var(--adm-control)",
  borderColor: "var(--adm-line-strong)",
  color: "var(--adm-ink)",
} as React.CSSProperties;

type Panel = null | "badge" | "comp" | "gift" | "decline-seal" | "give-seal";

type Rank = "bishop" | "priest" | "deacon" | "monastic";
const RANKS: readonly (readonly [Rank, string])[] = [
  ["bishop", "Bishop"],
  ["priest", "Priest"],
  ["deacon", "Deacon"],
  ["monastic", "Monastic"],
];
const isRank = (v: string | null | undefined): v is Rank => v === "bishop" || v === "priest" || v === "deacon" || v === "monastic";

export function ReaderCard({ id, onChanged, onBack }: { id: string; onChanged: () => void; onBack?: () => void }) {
  const [got, setGot] = useState<{ id: string; data: CardPayload | null; v: number } | null>(null);
  const [version, setVersion] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  // The forms' fields.
  const [badge, setBadge] = useState<GrantedBadge>("beta_tester");
  const [why, setWhy] = useState("");
  const [tier, setTier] = useState<"plus" | "pro">("plus");
  const [days, setDays] = useState<"30" | "90" | "365">("90");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  // The rank the seal is given at: what they asked as, until changed.
  const [rank, setRank] = useState<Rank | null>(null);

  useEffect(() => {
    let alive = true;
    void adminJson<CardPayload>(`/api/admin/readers?id=${encodeURIComponent(id)}${version > 0 ? "&fresh=1" : ""}`).then((d) => {
      if (alive) setGot({ id, data: d, v: version });
    });
    return () => {
      alive = false;
    };
  }, [id, version]);

  const data = got?.id === id ? got.data : null;
  const loading = got?.id !== id;
  const r = data?.reader;

  async function act(run: () => Promise<string | null>, done: string) {
    setBusy(true);
    setSaid(null);
    const err = await run();
    setBusy(false);
    if (err) {
      setSaid({ ok: false, text: err });
      return;
    }
    setSaid({ ok: true, text: done });
    setPanel(null);
    setConfirming(false);
    setWhy("");
    setMessage("");
    setVersion((v) => v + 1);
    onChanged();
  }

  const who = r?.email ? { email: r.email } : r?.handle ? { handle: r.handle } : null;

  if (loading) {
    return (
      <div className="rounded-[8px] border p-4" style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}>
        <Quiet>Opening the card.</Quiet>
      </div>
    );
  }
  if (!data || !r) {
    return (
      <div className="rounded-[8px] border p-4" style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}>
        <Quiet>The card could not be read just now.</Quiet>
      </div>
    );
  }

  const planText = (() => {
    const p = data.plan;
    if (!r.plan || !p) return "Free";
    const until = r.plan === "pro" ? p.pro_until : p.plus_until;
    const tierWord = r.plan === "pro" ? "Pro" : "Plus";
    const paying = p.plus_source === "apple" || p.plus_source === "google" || p.plus_source === "stripe";
    const renew = p.auto_renew === false ? `ends ${date(until, false)}` : paying ? `renews ${date(until, false)}` : `until ${date(until, false)}`;
    return `${tierWord}, ${paying ? "paying" : sourceWord(p.plus_source)}${paying ? `, ${sourceWord(p.plus_source)}` : ""}, ${renew}${
      p.billing_issue_at ? `; a renewal charge failed ${date(p.billing_issue_at, false)}` : ""
    }`;
  })();

  return (
    <div className="rounded-[8px] border p-4" style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}>
      {onBack ? (
        <button type="button" onClick={onBack} className="mb-2 flex min-h-11 items-center gap-1.5 font-sans text-[13px] lg:hidden" style={{ color: "var(--adm-ink-2)" }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 4.5 6.5 10l5.5 5.5" />
          </svg>
          Readers
        </button>
      ) : null}

      <div className="flex items-center gap-3">
        <span
          className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full font-sans text-[15px] font-semibold"
          style={{ background: "var(--adm-ink)", color: "var(--adm-on-accent)" }}
          aria-hidden
        >
          {initialsOf(r)}
        </span>
        <div className="min-w-0">
          <p className={"truncate font-sans text-[16px] font-semibold " + SENSITIVE} style={{ color: "var(--adm-ink)" }}>
            {r.name ?? r.handle ?? r.email ?? "A reader"}
          </p>
          <p className={"truncate font-sans text-[12.5px] " + SENSITIVE} style={{ color: "var(--adm-ink-3)" }}>
            {[r.handle ? `@${r.handle}` : null, r.email].filter(Boolean).join(", ")}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <Kv k="Joined">{date(r.joinedAt)}</Kv>
        <Kv k="Signs in with">
          {r.provider ? PROVIDER_LABEL[r.provider] : "not known"}
          {r.lastSignInAt ? `, last ${time(r.lastSignInAt)}` : ""}
        </Kv>
        <Kv k="Plus">{planText}</Kv>
        <Kv k="Badges">
          {data.badges.length === 0
            ? "none given"
            : data.badges.map((b) => `${badgeLabel(b.badge)}, given ${date(b.granted_at, false)}`).join("; ")}
        </Kv>
      </div>

      {/* The requests, each with its decision in it. */}
      {data.check && data.check.status === "requested" ? (
        <div className="mt-2 rounded-[8px] border p-3" style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-panel-2)" }}>
          <p className="flex items-center gap-2 font-sans text-[13px]" style={{ color: "var(--adm-ink)" }}>
            <StatusDot tone="wait" />
            Asked for the blue check
            <span className="ml-auto text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
              {date(data.check.requested_at, false)}
            </span>
          </p>
          {data.check.claim ? (
            <p className={"mt-2 font-sans text-[12.5px] leading-snug " + SENSITIVE} style={{ color: "var(--adm-ink-2)" }}>
              &ldquo;{data.check.claim}&rdquo;
            </p>
          ) : null}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={busy}
              {...btn(true)}
              onClick={() => void act(() => patchJson("/api/admin/verification", { userId: id, status: "verified" }), "Verified. The blue check is on their profile.")}
            >
              <Check />
              Verify
            </button>
            <button
              type="button"
              disabled={busy}
              {...btn(false)}
              onClick={() => void act(() => patchJson("/api/admin/verification", { userId: id, status: "declined" }), "Declined.")}
            >
              Decline
            </button>
          </div>
        </div>
      ) : null}

      {data.seal && data.seal.status === "requested" ? (
        <div className="mt-2 rounded-[8px] border p-3" style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-panel-2)" }}>
          <p className="flex items-center gap-2 font-sans text-[13px]" style={{ color: "var(--adm-ink)" }}>
            <StatusDot tone="wait" />
            Asked for the clergy seal
            <span className="ml-auto text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
              {date(data.seal.requested_at, false)}
            </span>
          </p>
          <div className={"mt-1.5 " + SENSITIVE}>
            {data.seal.rank ? <Kv k="Rank">{data.seal.rank}</Kv> : null}
            {data.seal.jurisdiction ? <Kv k="Jurisdiction">{data.seal.jurisdiction}</Kv> : null}
            {data.seal.parish ? <Kv k="Parish">{data.seal.parish}</Kv> : null}
            {data.seal.evidence ? <Kv k="How to check">{data.seal.evidence}</Kv> : null}
          </div>
          {panel === "decline-seal" ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Why, in a few words. They see this."
                className="w-full rounded-[6px] border px-2.5 py-2 font-sans text-[13px] outline-none"
                style={inputStyle}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  {...btn(true)}
                  onClick={() =>
                    void act(
                      () => patchJson("/api/admin/clergy", { userId: id, status: "declined", note: why.trim() || null }),
                      "Declined, with your note.",
                    )
                  }
                >
                  Decline with this note
                </button>
                <button type="button" {...btn(false)} onClick={() => setPanel(null)}>
                  Keep it open
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Check before verifying: the parish or diocese page they
                  named. The rank is what they asked as until it is changed. */}
              <div className="mt-2.5">
                <Segmented<Rank>
                  label="Rank"
                  options={RANKS}
                  value={rank ?? (isRank(data.seal.rank) ? data.seal.rank : "priest")}
                  onChange={setRank}
                  scroll
                />
              </div>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  {...btn(true)}
                  onClick={() =>
                    void act(
                      () =>
                        patchJson("/api/admin/clergy", {
                          userId: id,
                          status: "verified",
                          rank: rank ?? (isRank(data.seal?.rank) ? data.seal?.rank : "priest"),
                          jurisdiction: data.seal?.jurisdiction ?? null,
                          parish: data.seal?.parish ?? null,
                        }),
                      "Verified. The clergy seal is on their profile.",
                    )
                  }
                >
                  <Check />
                  Verify
                </button>
                <button type="button" {...btn(false)} onClick={() => setPanel("decline-seal")}>
                  Decline with a note
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* The marks already decided, each with its way back, and a mark for
          someone who never asked: the team verifies people it knows. */}
      <div className="mt-2">
        <Kv k="Blue check">
          <span className="flex flex-wrap items-center gap-x-2">
            {data.check?.status === "verified"
              ? `verified ${date(data.check.decided_at, false)}${data.check.decided_by ? ` by ${data.check.decided_by}` : ""}`
              : data.check?.status === "declined"
                ? `declined ${date(data.check.decided_at, false)}`
                : data.check?.status === "requested"
                  ? "asked, above"
                  : "never asked"}
            {data.check?.status !== "requested" ? (
              <button
                type="button"
                disabled={busy}
                className="min-h-[30px] rounded-[4px] px-1 text-[12px] underline underline-offset-[3px]"
                style={{ color: "var(--adm-ink-3)" }}
                onClick={() =>
                  void act(
                    () => patchJson("/api/admin/verification", { userId: id, status: data.check?.status === "verified" ? "declined" : "verified" }),
                    data.check?.status === "verified" ? "Took the blue check back." : "Gave the blue check.",
                  )
                }
              >
                {data.check?.status === "verified" ? "Take it back" : "Give it"}
              </button>
            ) : null}
          </span>
        </Kv>
        <Kv k="Clergy seal">
          <span className="flex flex-wrap items-center gap-x-2">
            {data.seal?.status === "verified"
              ? `${data.seal.rank ? `${data.seal.rank}, ` : ""}verified ${date(data.seal.decided_at, false)}`
              : data.seal?.status === "declined"
                ? `declined ${date(data.seal.decided_at, false)}`
                : data.seal?.status === "requested"
                  ? "asked, above"
                  : "never asked"}
            {data.seal?.status === "verified" ? (
              <button
                type="button"
                disabled={busy}
                className="min-h-[30px] rounded-[4px] px-1 text-[12px] underline underline-offset-[3px]"
                style={{ color: "var(--adm-ink-3)" }}
                onClick={() => void act(() => patchJson("/api/admin/clergy", { userId: id, status: "declined", note: null }), "Took the clergy seal back.")}
              >
                Take it back
              </button>
            ) : data.seal?.status !== "requested" ? (
              <button
                type="button"
                className="min-h-[30px] rounded-[4px] px-1 text-[12px] underline underline-offset-[3px]"
                style={{ color: "var(--adm-ink-3)" }}
                onClick={() => setPanel(panel === "give-seal" ? null : "give-seal")}
              >
                Give it
              </button>
            ) : null}
          </span>
        </Kv>
        {panel === "give-seal" ? (
          <div className="space-y-2 pb-1 pt-1.5">
            <Segmented<Rank> label="Rank" options={RANKS} value={rank ?? "priest"} onChange={setRank} scroll />
            <button
              type="button"
              disabled={busy}
              {...btn(true)}
              onClick={() =>
                void act(() => patchJson("/api/admin/clergy", { userId: id, status: "verified", rank: rank ?? "priest" }), "Gave the clergy seal.")
              }
            >
              <Check />
              Give the seal as {RANKS.find(([k]) => k === (rank ?? "priest"))?.[1]}
            </button>
          </div>
        ) : null}
      </div>

      {said ? (
        <p role="status" className="mt-2.5 font-sans text-[12.5px]" style={{ color: said.ok ? "var(--adm-ink-2)" : "var(--adm-critical)" }}>
          {said.text}
        </p>
      ) : null}

      {/* What can be done for them. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" {...btn(panel === "badge")} onClick={() => setPanel(panel === "badge" ? null : "badge")}>
          Give a badge
        </button>
        <button type="button" {...btn(panel === "comp")} onClick={() => { setPanel(panel === "comp" ? null : "comp"); setConfirming(false); }}>
          Comp Plus
        </button>
        <button type="button" {...btn(panel === "gift")} onClick={() => { setPanel(panel === "gift" ? null : "gift"); setConfirming(false); }}>
          Send a gift
        </button>
        <button type="button" {...btn(false)} onClick={() => { window.location.hash = "tab=orders"; }}>
          Open their orders
        </button>
      </div>

      {panel === "badge" ? (
        <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--adm-line)" }}>
          {!who ? (
            <Quiet>This account has no email or handle to give a badge to.</Quiet>
          ) : (
            <>
              <div role="radiogroup" aria-label="Badge" className="divide-y rounded-[8px] border" style={{ borderColor: "var(--adm-line)" }}>
                {GRANTED_BADGES.map((b) => {
                  const held = data.badges.some((x) => x.badge === b);
                  return (
                    <label key={b} className="flex min-h-11 cursor-pointer items-center gap-2.5 border-[color:var(--adm-line)] px-3 font-sans text-[13px] md:min-h-[34px]" style={{ color: "var(--adm-ink)" }}>
                      <input type="radio" name={`badge-${id}`} checked={badge === b} onChange={() => setBadge(b)} disabled={held} />
                      {BADGE_LABEL[b]}
                      {held ? (
                        <span className="ml-auto text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                          holds it
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
              <input
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                maxLength={200}
                placeholder="Why, in a few words"
                className="w-full rounded-[6px] border px-2.5 py-2 font-sans text-[13px] outline-none"
                style={inputStyle}
              />
              <button
                type="button"
                disabled={busy || data.badges.some((x) => x.badge === badge)}
                {...btn(true)}
                onClick={() =>
                  void act(
                    () => patchJson("/api/admin/badges", { ...who, badge, grant: true, note: why.trim() || null }),
                    `Gave ${BADGE_LABEL[badge]}.`,
                  )
                }
              >
                Give {BADGE_LABEL[badge]}
              </button>
              {data.badges.length > 0 ? (
                <div className="pt-1">
                  {data.badges.map((b) => (
                    <div key={b.badge} className="flex min-h-[34px] items-center gap-2 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
                      {badgeLabel(b.badge)}
                      <button
                        type="button"
                        disabled={busy}
                        className="ml-auto min-h-[30px] rounded-[4px] px-1 underline underline-offset-[3px]"
                        style={{ color: "var(--adm-ink-3)" }}
                        onClick={() =>
                          void act(
                            () => patchJson("/api/admin/badges", { ...who, badge: b.badge, grant: false }),
                            `Took ${badgeLabel(b.badge)} back.`,
                          )
                        }
                      >
                        Take it back
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {panel === "comp" || panel === "gift" ? (
        <div className="mt-3 space-y-2.5 border-t pt-3" style={{ borderColor: "var(--adm-line)" }}>
          {!r.email ? (
            <Quiet>This account has no email, and comps and gifts are sent to one.</Quiet>
          ) : (
            <>
              <Quiet>
                {panel === "comp"
                  ? "Comped Plus starts now and nobody is billed. It is written to their account at once."
                  : "A gift waits for them to open it, and costs nothing until they do."}
              </Quiet>
              <Segmented<"plus" | "pro">
                label="Tier"
                options={[
                  ["plus", "Plus"],
                  ["pro", "Pro"],
                ]}
                value={tier}
                onChange={setTier}
              />
              <Segmented<"30" | "90" | "365">
                label="How long"
                options={[
                  ["30", "30 days"],
                  ["90", "90 days"],
                  ["365", "A year"],
                ]}
                value={days}
                onChange={setDays}
              />
              {panel === "gift" ? (
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={280}
                  placeholder="A message with it, if you like"
                  className="w-full rounded-[6px] border px-2.5 py-2 font-sans text-[13px] outline-none"
                  style={inputStyle}
                />
              ) : null}
              {confirming ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className={"font-sans text-[12.5px] " + SENSITIVE} style={{ color: "var(--adm-ink)" }}>
                    {panel === "comp" ? "Comp" : "Send"} {tier === "pro" ? "Pro" : "Plus"} for {days} days to {r.email}?
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    {...btn(true)}
                    onClick={() =>
                      void act(
                        () =>
                          panel === "comp"
                            ? patchJson("/api/admin/subscriptions/comp", { email: r.email, tier, days: Number(days) }, "POST")
                            : patchJson("/api/admin/gifts", { email: r.email, tier, days: Number(days), message: message.trim() || null }, "POST"),
                        panel === "comp" ? `Comped ${tier === "pro" ? "Pro" : "Plus"} for ${days} days.` : "The gift is waiting for them.",
                      )
                    }
                  >
                    Yes, {panel === "comp" ? "comp it" : "send it"}
                  </button>
                  <button type="button" {...btn(false)} onClick={() => setConfirming(false)}>
                    Not yet
                  </button>
                </div>
              ) : (
                <button type="button" {...btn(true)} onClick={() => setConfirming(true)}>
                  {panel === "comp" ? "Comp" : "Send"} {tier === "pro" ? "Pro" : "Plus"}
                  <Chevron size={12} />
                </button>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* Their newest orders, signed in. */}
      <div className="mt-3 border-t pt-2.5" style={{ borderColor: "var(--adm-line)" }}>
        <p className="mb-1 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Their orders
        </p>
        {data.orders.length === 0 ? (
          <Quiet>None placed while signed in.</Quiet>
        ) : (
          <ul>
            {data.orders.map((o, i) => (
              <li key={`${o.created_at}-${i}`} className="flex min-h-[30px] items-center gap-2 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
                <StatusDot tone={o.payment_status === "paid" ? "good" : o.payment_status === "pending" ? "wait" : "idle"} />
                {date(o.created_at, false)}
                <span className="text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                  {o.payment_status}
                </span>
                <span className={"ml-auto font-mono " + SENSITIVE} style={{ color: "var(--adm-ink)" }}>
                  {formatPrice(o.total_cents, "usd")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.unread.length > 0 ? <Quiet className="mt-2">{`Not read just now: ${data.unread.join(", ")}.`}</Quiet> : null}
    </div>
  );
}
