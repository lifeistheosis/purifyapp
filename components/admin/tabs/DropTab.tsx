"use client";

// Drop: everything that tells people about a release, in one place.
//
// The owner asked for the drop kit as its own section of the panel, "and
// some extra stuff": plan the days, see all the content, copy every message,
// send the release email. So this is the kit (docs/DROP.md) with the panel
// around it.
//
// TWO HALVES. The words come from the bundle: lib/drop/current.ts carries
// the release's drop.json, so the tab draws every piece even when the server
// says nothing. What is true this minute comes from /api/admin/drop: the
// days he planned, what he marked as sent, which notes What's New is really
// showing, and what the drop's own rules say about all of it.
//
// IT SENDS ONE THING, THROUGH THE CARD THAT ALREADY SENDS IT. The release
// email goes out from the same CampaignCard the Email tab uses, with its
// draft, its blockers and its confirm. Everything else is copied from here
// and sent by him, and "Mark sent" only writes down that he did. The server
// refuses a mark the order of a drop does not allow yet.
//
// The plan is kept in the Calendar's own table, so a day set here is on the
// Calendar tab as soon as it is saved.

import Image from "next/image";
import { useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import type { Finding } from "@/lib/drop/check";
import { CURRENT_DROP, DROP_RELEASE } from "@/lib/drop/current";
import { CHANNELS, MOMENTS, MOMENT_LABEL, hasOwnWords, length, pasted, type Drop, type Piece } from "@/lib/drop/kit";
import { STORES, STORE_NAME, type Plan } from "@/lib/drop/live";
import { copyText } from "@/lib/ui/copyText";

import { DROP_CARDS } from "../drop/cards.generated";
import { CampaignCard } from "../email/CampaignCard";
import { Card, Mark, Pill, SubTabs, ToolbarButton } from "../primitives";

type Live = {
  release: string | null;
  ready: boolean;
  error?: string;
  plan: Plan;
  /** For each note the drop covers: whether What's New is showing it. Null when that could not be read. */
  notes: { version: string; published: boolean | null }[];
  /** The newest note the site is showing. */
  showing: string | null;
  findings: Finding[];
  counts: { sent: number; waits: number; ready: number; empty: number };
  /** Every line of every covered note, as one text. */
  whole: string;
  today: string;
};

type View = "kit" | "schedule" | "content";
const VIEWS: readonly (readonly [View, string])[] = [
  ["kit", "Send"],
  ["schedule", "Schedule"],
  ["content", "Content and cards"],
];

type Tone = "neutral" | "gold" | "rose" | "emerald";

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;
const line = { borderColor: "var(--adm-line)" } as const;
const field = { borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" } as const;
const FIELD = "min-h-9 rounded-[var(--adm-radius-sm)] border px-2.5 py-1.5 font-sans text-[12.5px]";
const SMALL = "font-sans text-[12.5px] leading-[1.6]";

/** "Tue 7 Oct", from 2026-10-07. Built from the parts, so no time zone can move the day. */
function shortDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** Where a piece stands: the file, with what the owner marked laid over it. */
function standing(drop: Drop, piece: Piece, live: Live | null): { label: string; tone: Tone } {
  if (piece.channel === "note") {
    const version = piece.id.replace(/^note-/, "");
    if (live?.notes.find((n) => n.version === version)?.published) return { label: "Showing on What's New", tone: "emerald" };
    const state = drop.notes.find((n) => n.version === version)?.state;
    return state === "queued" ? { label: "In your queue", tone: "gold" } : state === "accepted" ? { label: "Accepted", tone: "emerald" } : { label: "Not filed yet", tone: "rose" };
  }
  const doing = !CHANNELS[piece.channel].paste;
  const on = piece.sent?.on ?? live?.plan.done[piece.id]?.on;
  if (on) return { label: `${doing ? "Done" : "Sent"} ${shortDay(on)}`, tone: "emerald" };
  if (piece.waits) return { label: "Waits", tone: "gold" };
  if (hasOwnWords(piece) && !piece.text) return { label: "No words yet", tone: "rose" };
  return { label: doing ? "To do" : "Ready", tone: "neutral" };
}

const WHO = { owner: "Yours", us: "Ours, on your word" } as const;

/** The mark of a step: a box, ticked once the step is done. Drawn in the rail's stroke. */
function StepBox({ done }: { done: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mt-[4.5px] shrink-0"
      style={{ color: "var(--adm-ink)" }}
    >
      <rect x="3.2" y="3.2" width="13.6" height="13.6" rx="2.4" />
      {done ? <path d="m6.6 10.3 2.4 2.4 4.4-5.1" /> : null}
    </svg>
  );
}

export function DropTab() {
  const drop = CURRENT_DROP;
  const [live, setLive] = useState<Live | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>("kit");
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await adminJson<Live>("/api/admin/drop");
      if (!alive) return;
      if (d?.release) setLive(d);
      else setFailed(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!drop) {
    return (
      <Card title={`No drop for ${DROP_RELEASE} yet`} subtitle="A release is not finished until people have been told.">
        <p className={SMALL} style={ink2}>
          A drop is one file that holds every piece that goes out: the stores&apos; texts, the Discord posts, the board, the release email, the
          captions and the steps between them. It is started from the release&apos;s note, in the repository, with{" "}
          <code>node scripts/drop.mjs new {DROP_RELEASE}</code>. Once it is there, this tab shows it.
        </p>
      </Card>
    );
  }

  /** One change to the plan. The server answers with the drop as it now stands. */
  async function change(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setSaid(null);
    try {
      const res = await fetch("/api/admin/drop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => null)) as (Live & { ok?: boolean; error?: string }) | null;
      if (!res.ok || !data?.ok) setSaid(data?.error ?? `That did not save (${res.status}).`);
      else setLive(data);
    } catch (e) {
      setSaid((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function copy(key: string, text: string) {
    if (await copyText(text)) {
      setCopied(key);
      window.setTimeout(() => setCopied((now) => (now === key ? null : now)), 1600);
    } else {
      setSaid("The clipboard refused. Open the piece and copy it by hand.");
    }
  }

  const wordsOf = (piece: Piece) => (piece.channel === "notes-all" ? (live?.whole ?? "") : (piece.text ?? ""));
  const canSave = Boolean(live?.ready);
  const errors = live?.findings.filter((f) => f.level === "error") ?? [];
  const warns = live?.findings.filter((f) => f.level === "warn") ?? [];
  const next = MOMENTS.find((m) => drop.pieces.some((p) => p.moment === m && standing(drop, p, live).tone !== "emerald"));

  const everything = drop.pieces
    .filter((p) => CHANNELS[p.channel].paste && wordsOf(p))
    .map((p) => `${p.title}\n${p.where ?? CHANNELS[p.channel].where}\n\n${p.channel === "notes-all" ? wordsOf(p) : pasted(p)}`)
    .join(`\n\n${"=".repeat(48)}\n\n`);

  // Always the outlined button. Each piece's Copy used to be the filled one,
  // which put some twenty solid buttons down the page: on a panel where a fill
  // means "the one thing to do here", twenty of them mean nothing.
  const copyButton = (key: string, text: string, label: string) => (
    <ToolbarButton onClick={() => copy(key, text)}>{copied === key ? "Copied" : label}</ToolbarButton>
  );

  // ------------------------------------------------------------ one piece

  const pieceRow = (piece: Piece) => {
    const channel = CHANNELS[piece.channel];
    const words = wordsOf(piece);
    const state = standing(drop, piece, live);
    const marked = Boolean(live?.plan.done[piece.id]);
    const canMark = canSave && piece.channel !== "note" && !piece.waits && !piece.sent;
    return (
      <li key={piece.id} className="space-y-2 border-t py-3 first:border-t-0 first:pt-0" style={line}>
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
          {/* A step is something to do, so its mark is a box that is empty
              until it is done. The kit's mark for a step is a ticked box,
              which in one ink read as "done" on rows that said "To do". */}
          {piece.channel === "step" ? (
            <StepBox done={state.tone === "emerald"} />
          ) : (
            <Mark className="text-[15px] leading-6">{channel.icon}</Mark>
          )}
          <div className="min-w-[10rem] flex-1">
            <p className="font-sans text-[13px] font-semibold" style={ink}>
              {piece.title}
            </p>
            <p className="font-sans text-[11.5px]" style={ink3}>
              {piece.where ?? channel.where}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {channel.limit && hasOwnWords(piece) ? (
              <Pill tone={length(words) > channel.limit ? "rose" : "neutral"}>
                {length(words)} / {channel.limit}
              </Pill>
            ) : null}
            {piece.who ? <Pill>{WHO[piece.who]}</Pill> : null}
            <Pill tone={state.tone}>{state.label}</Pill>
          </div>
        </div>

        {piece.waits ? (
          <p className={SMALL} style={{ color: "var(--adm-warn)" }}>
            Waits on: {piece.waits}
          </p>
        ) : null}
        {piece.note ? (
          <p className={SMALL} style={ink3}>
            {piece.note}
          </p>
        ) : null}

        {channel.paste && words ? (
          <details className="rounded-[var(--adm-radius-sm)] border" style={{ ...line, background: "var(--adm-panel-2)" }}>
            <summary className="cursor-pointer px-3 py-2 font-sans text-[12px] font-medium" style={ink2}>
              Read it
            </summary>
            <div className="space-y-2 px-3 pb-3">
              {piece.subject ? (
                <p className="font-sans text-[12.5px] font-semibold" style={ink}>
                  {piece.subject}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap break-words font-sans text-[12.5px] leading-[1.6]" style={ink2}>
                {words}
              </p>
            </div>
          </details>
        ) : !channel.paste && words ? (
          <p className={SMALL} style={ink2}>
            {words}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {channel.paste && piece.subject ? copyButton(`s-${piece.id}`, piece.subject, "Copy title") : null}
          {channel.paste && words ? copyButton(`t-${piece.id}`, words, piece.subject ? "Copy text" : "Copy") : null}
          {canMark || marked ? (
            <ToolbarButton loading={busy === piece.id} onClick={() => change(piece.id, { action: "mark", piece: piece.id, done: !marked })}>
              {marked ? "Take the mark back" : channel.paste || piece.channel === "cards" || piece.channel === "video" ? "Mark sent" : "Mark done"}
            </ToolbarButton>
          ) : null}
          {piece.channel === "note" ? (
            <a href="#tab=patch-notes" className="font-sans text-[12.5px] underline underline-offset-2" style={{ color: "var(--adm-accent)" }}>
              Open Patch notes
            </a>
          ) : null}
          {piece.channel === "push" ? (
            <a href="#tab=push" className="font-sans text-[12.5px] underline underline-offset-2" style={{ color: "var(--adm-accent)" }}>
              Open Push
            </a>
          ) : null}
        </div>

        {piece.channel === "email" ? <CampaignCard only="release" /> : null}
      </li>
    );
  };

  // ------------------------------------------------------------ the three views

  const kit = (
    <div className="space-y-4">
      {MOMENTS.map((moment, i) => {
        const pieces = drop.pieces.filter((p) => p.moment === moment);
        if (!pieces.length) return null;
        const open = pieces.filter((p) => standing(drop, p, live).tone !== "emerald").length;
        const planned = live?.plan.moments[moment];
        return (
          <Card
            key={moment}
            title={`${i + 1}. ${MOMENT_LABEL[moment].name}`}
            subtitle={`${MOMENT_LABEL[moment].when}. ${planned ? `Planned for ${shortDay(planned)}.` : "No day set."}`}
            accent={moment === next}
            action={<Pill tone={open ? (moment === next ? "gold" : "neutral") : "emerald"}>{open ? `${open} to go` : "All done"}</Pill>}
          >
            <ul>{pieces.map(pieceRow)}</ul>
          </Card>
        );
      })}
    </div>
  );

  const schedule = (
    <div className="space-y-4">
      <Card title="The five moments" subtitle="Give a moment its day and it is on the Calendar tab, with everything else your week holds. Nothing here sends anything by itself.">
        <ul>
          {MOMENTS.map((moment, i) => {
            const planned = live?.plan.moments[moment] ?? "";
            const count = drop.pieces.filter((p) => p.moment === moment).length;
            return (
              <li key={moment} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t py-3 first:border-t-0 first:pt-0" style={line}>
                <div className="min-w-[12rem] flex-1">
                  <p className="font-sans text-[13px] font-semibold" style={ink}>
                    {i + 1}. {MOMENT_LABEL[moment].name}
                  </p>
                  <p className="font-sans text-[11.5px]" style={ink3}>
                    {MOMENT_LABEL[moment].when}. {count} piece{count === 1 ? "" : "s"}.
                  </p>
                </div>
                <label className="flex items-center gap-2 font-sans text-[12px]" style={ink3}>
                  <span>Day</span>
                  <input
                    type="date"
                    id={`drop-day-${moment}`}
                    className={FIELD}
                    style={field}
                    value={planned}
                    disabled={!canSave || busy === `plan-${moment}`}
                    onChange={(e) => change(`plan-${moment}`, { action: "plan", moment, dueOn: e.target.value || null })}
                  />
                </label>
                {planned ? (
                  <ToolbarButton loading={busy === `plan-${moment}`} onClick={() => change(`plan-${moment}`, { action: "plan", moment, dueOn: null })}>
                    Clear
                  </ToolbarButton>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="The stores" subtitle="Say when a store starts serving the build. Until then the store-day pieces cannot be marked as sent.">
        <ul>
          {STORES.map((store) => {
            const build = drop.builds[store];
            const day = build.served ?? live?.plan.stores[store];
            return (
              <li key={store} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t py-3 first:border-t-0 first:pt-0" style={line}>
                <div className="min-w-[12rem] flex-1">
                  <p className="font-sans text-[13px] font-semibold" style={ink}>
                    {STORE_NAME[store].replace(/^the /, "The ")}, build {build.build}
                  </p>
                  <p className="font-sans text-[11.5px]" style={ink3}>
                    {build.made ? `Made ${shortDay(build.made)}. ` : ""}
                    {day ? `Serving it since ${shortDay(day)}.` : "Not serving it yet."}
                  </p>
                </div>
                <Pill tone={day ? "emerald" : "neutral"}>{day ? "Live in the store" : "Waiting for the store"}</Pill>
                {canSave && !build.served ? (
                  <ToolbarButton loading={busy === `served-${store}`} onClick={() => change(`served-${store}`, { action: "served", store, done: !day })}>
                    {day ? "Take it back" : "It is live"}
                  </ToolbarButton>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <ComingNext live={live} canSave={canSave} busy={busy} change={change} />
    </div>
  );

  const cards = DROP_CARDS[drop.release] ?? [];
  const captions = drop.pieces.filter((p) => p.channel === "instagram" || p.channel === "tiktok" || p.channel === "youtube");
  const content = (
    <div className="space-y-4">
      <Card title="What the release is" subtitle="Said once here, and used in every piece. Each point is tied to a line of a note.">
        <ul>
          {drop.points.map((pt) => (
            <li key={pt.id} className="flex gap-3 border-t py-2.5 first:border-t-0 first:pt-0" style={line}>
              <Mark className="text-[15px] leading-6">{pt.emoji}</Mark>
              <div className="min-w-0">
                <p className="font-sans text-[13px] font-semibold" style={ink}>
                  {pt.name} {pt.needs === "apps" ? <Pill>In the apps only</Pill> : null}
                </p>
                <p className={SMALL} style={ink2}>
                  {pt.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {drop.also.length ? (
          <>
            <p className="mt-4 font-sans text-[12px] font-semibold" style={ink3}>
              Also worth a line
            </p>
            <ul className={`mt-1 list-disc space-y-0.5 pl-5 ${SMALL}`} style={ink2}>
              {drop.also.map((a) => (
                <li key={a.text}>{a.text}</li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>

      {cards.length ? (
        <Card title="The cards" subtitle="Small copies of the stills. The full files, and the moving versions, are with the piece in purify-ads.">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map((card) => (
              <li key={card.file} className="space-y-1.5">
                {/* Already small (540 wide), so they are served as they are: nothing for the image optimizer to do. */}
                <Image src={card.src} alt={`The ${card.label} card`} unoptimized className="h-auto w-full rounded-[var(--adm-radius-sm)] border" style={line} />
                <p className="font-sans text-[11.5px]" style={ink3}>
                  {card.label}
                </p>
              </li>
            ))}
          </ul>
          {captions.length ? (
            <ul className="mt-4">
              {captions.map((piece) => (
                <li key={piece.id} className="space-y-2 border-t py-3" style={line}>
                  <p className="font-sans text-[12.5px] font-semibold" style={ink}>
                    {piece.title}
                  </p>
                  <p className={`${SMALL} whitespace-pre-wrap`} style={ink2}>
                    {piece.text}
                  </p>
                  {piece.text ? copyButton(`c-${piece.id}`, piece.text, "Copy caption") : null}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <Card title="What may not be said yet" subtitle="Switched off, not built, or not seen working. The check refuses any piece that says one.">
        <ul className={`space-y-1 ${SMALL}`} style={ink2}>
          {drop.never.map((n) => (
            <li key={n.word}>
              <span className="font-semibold" style={ink}>
                {n.word}
              </span>
              : {n.why}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Links, tags and figures" subtitle="What every piece draws on.">
        <ul className={`space-y-2 ${SMALL}`} style={ink2}>
          {(
            [
              ["What's New", drop.links.whatsNew],
              ["App Store", drop.links.appStore],
              ["Google Play", drop.links.play],
              ["Hashtags", drop.hashtags.join(" ")],
            ] as const
          ).map(([label, value]) => (
            <li key={label} className="flex flex-wrap items-center gap-2">
              <span className="min-w-[6rem] font-semibold" style={ink}>
                {label}
              </span>
              <span className="min-w-0 flex-1 break-all">{value}</span>
              {copyButton(`l-${label}`, value, "Copy")}
            </li>
          ))}
          <li>
            <span className="font-semibold" style={ink}>
              Figures a caption may carry
            </span>
            : {drop.figures.map((f) => f.figure).join(", ")}
          </li>
        </ul>
      </Card>

      {live?.whole ? (
        <Card
          title={`Everything in ${drop.release}, in one note`}
          subtitle="Every line of every note this drop covers, set out from the notes themselves."
          action={copyButton("whole", live.whole, "Copy all of it")}
        >
          <details>
            <summary className="cursor-pointer font-sans text-[12px] font-medium" style={ink2}>
              Read it
            </summary>
            <p className="mt-2 whitespace-pre-wrap break-words font-sans text-[12.5px] leading-[1.6]" style={ink2}>
              {live.whole}
            </p>
          </details>
        </Card>
      ) : null}
    </div>
  );

  // ------------------------------------------------------------ the page

  const { android, ios } = drop.builds;
  return (
    <div className="space-y-4">
      <Card
        title={`Purify ${drop.release}`}
        subtitle={`${drop.name}. ${drop.covers.length > 1 ? `One drop for ${drop.covers.join(", ")}, carried by the ${drop.version} builds.` : ""}`}
        action={copyButton("everything", everything, "Copy every message")}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {live ? (
            <>
              <Pill tone="gold">{live.counts.ready + live.counts.empty} to go</Pill>
              <Pill tone={live.counts.waits ? "gold" : "neutral"}>{live.counts.waits} waiting</Pill>
              <Pill tone={live.counts.sent ? "emerald" : "neutral"}>{live.counts.sent} done</Pill>
              <Pill tone={errors.length ? "rose" : "emerald"}>{errors.length ? `${errors.length} refused by the check` : "The check passes"}</Pill>
              {live.showing ? <Pill tone={live.showing === drop.version ? "emerald" : "rose"}>What&apos;s New shows {live.showing}</Pill> : null}
            </>
          ) : (
            <Pill>{failed ? "Live state did not load" : "Reading the live state"}</Pill>
          )}
          <Pill>Android build {android.build}</Pill>
          <Pill>iOS build {ios.build}</Pill>
        </div>

        {failed ? (
          <p className={`mt-3 ${SMALL}`} style={{ color: "var(--adm-warn)" }}>
            The plan and the marks did not load, so days and marks cannot be saved right now. Every piece below is still here to read and copy.
          </p>
        ) : null}
        {live && !live.ready ? (
          <p className={`mt-3 ${SMALL}`} style={{ color: "var(--adm-warn)" }}>
            The Calendar&apos;s table could not be read, so days and marks cannot be saved{live.error ? ` (${live.error})` : ""}.
          </p>
        ) : null}
        {said ? (
          <p role="alert" className={`mt-3 ${SMALL}`} style={{ color: "var(--adm-critical)" }}>
            {said}
          </p>
        ) : null}

        {errors.length + warns.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {[...errors, ...warns].map((f) => (
              <li key={`${f.rule}-${f.where}-${f.says}`} className={`flex flex-wrap items-baseline gap-2 ${SMALL}`} style={ink2}>
                <Pill tone={f.level === "error" ? "rose" : "gold"}>{f.level === "error" ? "Refused" : "Look"}</Pill>
                <span>
                  <span className="font-semibold" style={ink}>
                    {f.where}
                  </span>{" "}
                  {f.says}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4">
          <SubTabs tabs={VIEWS} active={view} onChange={setView} />
        </div>
      </Card>

      {view === "kit" ? kit : view === "schedule" ? schedule : content}
    </div>
  );
}

/** Updates still to come: a version, what it is for, and the day it is meant for. They show on the Calendar. */
function ComingNext({
  live,
  canSave,
  busy,
  change,
}: {
  live: Live | null;
  canSave: boolean;
  busy: string | null;
  change: (key: string, body: Record<string, unknown>) => Promise<void>;
}) {
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState("");
  const valid = /^\d+\.\d+(\.\d+)?$/.test(version.trim()) && Boolean(dueOn);

  async function add() {
    await change("update-new", { action: "update", version: version.trim(), title: title.trim() || undefined, dueOn });
    setVersion("");
    setTitle("");
    setDueOn("");
  }

  return (
    <Card title="Coming next" subtitle="Updates you are planning, each with its day. They sit on the Calendar as an update, and get a drop of their own once their note is written.">
      {live?.plan.upcoming.length ? (
        <ul>
          {live.plan.upcoming.map((u) => (
            <li key={u.version} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t py-3 first:border-t-0 first:pt-0" style={line}>
              <div className="min-w-[12rem] flex-1">
                <p className="font-sans text-[13px] font-semibold" style={ink}>
                  {u.title}
                </p>
                <p className="font-sans text-[11.5px]" style={ink3}>
                  {u.version}, {shortDay(u.dueOn)}
                  {u.notes ? `. ${u.notes}` : ""}
                </p>
              </div>
              <Pill tone={u.done ? "emerald" : u.dueOn < live.today ? "rose" : "neutral"}>{u.done ? "Shipped" : u.dueOn < live.today ? "Past its day" : "Planned"}</Pill>
              {canSave ? (
                <>
                  <ToolbarButton
                    loading={busy === `update-${u.version}`}
                    onClick={() => change(`update-${u.version}`, { action: "update", version: u.version, title: u.title, notes: u.notes ?? undefined, dueOn: u.dueOn, done: !u.done })}
                  >
                    {u.done ? "Not shipped yet" : "Shipped"}
                  </ToolbarButton>
                  <ToolbarButton variant="danger" loading={busy === `remove-${u.version}`} onClick={() => change(`remove-${u.version}`, { action: "update", version: u.version, dueOn: null })}>
                    Remove
                  </ToolbarButton>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={SMALL} style={ink3}>
          Nothing planned yet.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4" style={line}>
        <label className="flex flex-col gap-1 font-sans text-[11.5px]" style={ink3}>
          Version
          <input id="drop-next-version" className={`${FIELD} w-24`} style={field} placeholder="1.6" value={version} onChange={(e) => setVersion(e.target.value)} />
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 font-sans text-[11.5px]" style={ink3}>
          What it is for
          <input id="drop-next-title" className={FIELD} style={field} placeholder="October saints, and their cards" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 font-sans text-[11.5px]" style={ink3}>
          Day
          <input id="drop-next-day" type="date" className={FIELD} style={field} value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
        </label>
        {canSave && valid ? (
          <ToolbarButton variant="primary" loading={busy === "update-new"} onClick={add}>
            Plan it
          </ToolbarButton>
        ) : (
          <span className="pb-2 font-sans text-[11.5px]" style={ink3}>
            {canSave ? "A version like 1.6, and a day." : "Saving is off until the live state loads."}
          </span>
        )}
      </div>
    </Card>
  );
}
