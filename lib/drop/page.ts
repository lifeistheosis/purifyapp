/**
 * A drop, written out for the person who sends it.
 *
 * Three shapes of the same file:
 *   - the kit, one page the owner works from: every piece in the order it
 *     goes out, with a button that copies it and a count against the place's
 *     limit. He posts from his phone, so it is built for one;
 *   - a text file per piece, for pasting from a computer;
 *   - drop.md beside drop.json, so a change to a drop can be read in a diff.
 *
 * The page is his own tool and follows the house look for those (near-black,
 * one grotesque, a violet accent, facts as pills), not the reader's app. It
 * is published as an artifact, so it carries no document skeleton of its own
 * and takes every colour from a token that both themes define.
 *
 * Pure: it returns text. lib/drop/files.ts writes it.
 */

import type { Entry } from "@/lib/whatsNew/entries";

import type { Finding } from "./check";
import { tally } from "./check";
import { listOf, wholeNote } from "./compose";
import { CHANNELS, MOMENTS, MOMENT_LABEL, hasOwnWords, length, pieceState, type Drop, type Moment, type Piece } from "./kit";

type Notes = Pick<Entry, "version" | "items">[];

const esc = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** What is pasted for a piece. The whole note is set out from the notes; everything else is its own text. */
export function wordsOf(drop: Drop, piece: Piece, entries: Notes): string {
  return piece.channel === "notes-all" ? wholeNote(drop, entries) : (piece.text ?? "");
}

/** Where a piece stands, in a word or two, and how it is coloured. */
function standing(drop: Drop, piece: Piece): { label: string; tone: "good" | "warn" | "plain" | "bad" } {
  if (piece.channel === "note") {
    const note = drop.notes.find((n) => piece.id === `note-${n.version}`);
    if (note?.state === "accepted") return { label: "Accepted", tone: "good" };
    if (note?.state === "queued") return { label: "In your queue", tone: "warn" };
    return { label: "Not filed yet", tone: "bad" };
  }
  const state = pieceState(piece);
  const doing = !CHANNELS[piece.channel].paste;
  if (state === "sent") return { label: `${doing ? "Done" : "Sent"} ${piece.sent?.on ?? ""}`.trim(), tone: "good" };
  if (state === "waits") return { label: "Waits", tone: "warn" };
  if (state === "empty") return { label: "No words yet", tone: "bad" };
  return { label: doing ? "To do" : "Ready", tone: "plain" };
}

const WHO = { owner: "Yours", us: "Ours, on your word" } as const;

function pieceRow(drop: Drop, piece: Piece, entries: Notes): string {
  const channel = CHANNELS[piece.channel];
  const words = wordsOf(drop, piece, entries);
  const state = standing(drop, piece);
  const pills: string[] = [];
  if (channel.limit && hasOwnWords(piece)) {
    const n = length(words);
    pills.push(`<span class="pill ${n > channel.limit ? "pill-bad" : ""}">${n} / ${channel.limit}</span>`);
  }
  if (piece.who) pills.push(`<span class="pill">${WHO[piece.who]}</span>`);
  pills.push(`<span class="pill pill-${state.tone}">${esc(state.label)}</span>`);

  const where = piece.where ?? channel.where;
  const body: string[] = [];
  if (piece.waits) body.push(`<p class="hold">Waits on: ${esc(piece.waits)}</p>`);
  if (piece.note) body.push(`<p class="know">${esc(piece.note)}</p>`);
  if (piece.madeIn) body.push(`<p class="know">The files are with the piece <b>${esc(piece.madeIn)}</b> in purify-ads.</p>`);

  if (channel.paste) {
    const fields: string[] = [];
    const buttons: string[] = [];
    if (piece.subject) {
      fields.push(`<p class="field">Title</p><pre id="s-${esc(piece.id)}">${esc(piece.subject)}</pre>`);
      buttons.push(`<button type="button" class="btn" data-copy="s-${esc(piece.id)}">Copy title</button>`);
    }
    if (words) {
      fields.push(`${piece.subject ? '<p class="field">Text</p>' : ""}<pre id="t-${esc(piece.id)}">${esc(words)}</pre>`);
      buttons.push(`<button type="button" class="btn btn-main" data-copy="t-${esc(piece.id)}">Copy${piece.subject ? " text" : ""}</button>`);
    }
    if (fields.length) {
      body.push(`<details><summary>Read it</summary>${fields.join("")}</details>`);
      body.push(`<div class="actions">${buttons.join("")}</div>`);
    }
  } else if (words) {
    body.push(`<p class="doing">${esc(words)}</p>`);
  }

  return `<li class="piece">
<div class="piece-head">
<span class="glyph" aria-hidden="true">${channel.icon}</span>
<div class="piece-what"><p class="piece-title">${esc(piece.title)}</p>${where ? `<p class="piece-where">${esc(where)}</p>` : ""}</div>
<div class="pills">${pills.join("")}</div>
</div>
${body.join("\n")}
</li>`;
}

function momentPanel(drop: Drop, moment: Moment, index: number, entries: Notes): string {
  const pieces = drop.pieces.filter((p) => p.moment === moment);
  if (!pieces.length) return "";
  const label = MOMENT_LABEL[moment];
  const open = pieces.filter((p) => pieceState(p) !== "sent").length;
  return `<section class="panel" id="${moment}">
<header class="panel-head">
<span class="step" aria-hidden="true">${index + 1}</span>
<div><p class="tag">${esc(label.when)}</p><h2>${esc(label.name)}</h2></div>
<span class="pill ${open ? "" : "pill-good"}">${open ? `${open} to go` : "All done"}</span>
</header>
<ul class="pieces">
${pieces.map((p) => pieceRow(drop, p, entries)).join("\n")}
</ul>
</section>`;
}

const STYLE = `
/* Layout: one column. A panel for each moment of the drop, in the order they happen, its pieces as rows inside. */
:root{color-scheme:dark;--bg:#0b0b0e;--panel:#131318;--nest:#1a1a21;--line:rgb(255 255 255/.09);--fg:#f3f3f6;--dim:#a6a6b2;--faint:#74747f;--accent:#8b5cf6;--accent-soft:rgb(139 92 246/.16);--on-accent:#fff;--good:#34d399;--good-soft:rgb(52 211 153/.13);--warn:#fbbf24;--warn-soft:rgb(251 191 36/.13);--bad:#f87171;--bad-soft:rgb(248 113 113/.13);--bloom:rgb(255 255 255/.055)}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){color-scheme:light;--bg:#f5f5f8;--panel:#fff;--nest:#f0f0f5;--line:rgb(17 17 24/.11);--fg:#14141a;--dim:#55555f;--faint:#80808c;--accent:#6d28d9;--accent-soft:rgb(109 40 217/.1);--on-accent:#fff;--good:#047857;--good-soft:rgb(4 120 87/.1);--warn:#a16207;--warn-soft:rgb(161 98 7/.11);--bad:#b91c1c;--bad-soft:rgb(185 28 28/.09);--bloom:rgb(17 17 24/.055)}}
:root[data-theme="light"]{color-scheme:light;--bg:#f5f5f8;--panel:#fff;--nest:#f0f0f5;--line:rgb(17 17 24/.11);--fg:#14141a;--dim:#55555f;--faint:#80808c;--accent:#6d28d9;--accent-soft:rgb(109 40 217/.1);--on-accent:#fff;--good:#047857;--good-soft:rgb(4 120 87/.1);--warn:#a16207;--warn-soft:rgb(161 98 7/.11);--bad:#b91c1c;--bad-soft:rgb(185 28 28/.09);--bloom:rgb(17 17 24/.055)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg) radial-gradient(1100px 520px at 18% -6%,var(--bloom),transparent 68%) no-repeat;color:var(--fg);font:15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:860px;margin:0 auto;padding-inline:16px;padding-block:28px 56px;display:flex;flex-direction:column;gap:18px}
h1,h2,p,ul{margin:0}
ul{padding:0;list-style:none}
.top{display:flex;flex-direction:column;gap:14px;padding-bottom:18px;border-bottom:1px solid var(--line)}
.top-row{display:flex;gap:14px;align-items:center}
.mark{flex:none;width:46px;height:46px;border-radius:13px;background:var(--accent-soft);display:grid;place-items:center;font-size:22px}
.tag{font-size:12.5px;color:var(--faint);font-weight:500}
h1{font-size:clamp(26px,6vw,34px);font-weight:800;letter-spacing:-.03em;line-height:1.1;text-wrap:balance}
.deck{color:var(--dim);max-width:62ch}
.pills{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--nest);color:var(--dim);font-size:12px;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.pill-good{color:var(--good);background:var(--good-soft);border-color:transparent}
.pill-warn{color:var(--warn);background:var(--warn-soft);border-color:transparent}
.pill-bad{color:var(--bad);background:var(--bad-soft);border-color:transparent}
.pill-accent{color:var(--accent);background:var(--accent-soft);border-color:transparent}
.jump{display:flex;flex-wrap:wrap;gap:6px}
.jump a{color:var(--dim);text-decoration:none;font-size:13px;font-weight:600;padding:5px 11px;border-radius:999px;border:1px solid var(--line)}
.jump a:hover,.jump a:focus-visible{color:var(--fg);border-color:var(--accent)}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.panel-head{display:flex;gap:12px;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line)}
.panel-head>div{flex:1;min-width:0}
h2{font-size:17px;font-weight:700;letter-spacing:-.015em}
.step{flex:none;width:32px;height:32px;border-radius:9px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:800;font-size:14px}
.pieces>li+li{border-top:1px solid var(--line)}
.piece{padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.piece-head{display:flex;flex-wrap:wrap;gap:10px 12px;align-items:flex-start}
.glyph{flex:none;width:30px;height:30px;border-radius:9px;background:var(--nest);display:grid;place-items:center;font-size:15px}
.piece-what{flex:1;min-width:150px}
.piece-title{font-weight:650;letter-spacing:-.01em}
.piece-where{font-size:13px;color:var(--faint)}
.know,.hold,.doing{font-size:13.5px;color:var(--dim);max-width:68ch}
.hold{color:var(--warn)}
.doing{color:var(--fg);font-size:14px}
details{border:1px solid var(--line);border-radius:12px;background:var(--nest)}
summary{cursor:pointer;padding:9px 13px;font-size:13px;font-weight:600;color:var(--dim)}
summary:focus-visible,.btn:focus-visible,.jump a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
pre{margin:0;padding:4px 13px 13px;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.55 Inter,ui-sans-serif,system-ui,sans-serif;color:var(--fg)}
.field{padding:6px 13px 0;font-size:12px;font-weight:600;color:var(--faint)}
.actions{display:flex;flex-wrap:wrap;gap:8px}
.btn{font:inherit;font-size:13.5px;font-weight:650;padding:8px 15px;border-radius:9px;border:1px solid var(--line);background:var(--nest);color:var(--fg);cursor:pointer}
.btn-main{background:var(--accent);border-color:transparent;color:var(--on-accent)}
.btn[data-done]{background:var(--good-soft);color:var(--good);border-color:transparent}
.points>li{display:flex;gap:12px;padding:12px 16px}
.points>li+li{border-top:1px solid var(--line)}
.points b{font-weight:650}
.points p{color:var(--dim);font-size:14px;max-width:66ch}
.finds>li{padding:10px 16px;font-size:13.5px;color:var(--dim);display:flex;flex-wrap:wrap;gap:8px;align-items:baseline}
.finds>li+li{border-top:1px solid var(--line)}
.foot{color:var(--faint);font-size:12.5px;max-width:70ch}
@media (prefers-reduced-motion:no-preference){.btn{transition:background-color .15s ease,color .15s ease}}
`;

const SCRIPT = `
document.addEventListener("click", async function (event) {
  var button = event.target.closest("[data-copy]");
  if (!button) return;
  var source = document.getElementById(button.getAttribute("data-copy"));
  if (!source) return;
  var label = button.textContent;
  var done = function (word) {
    button.textContent = word;
    button.setAttribute("data-done", "");
    setTimeout(function () { button.textContent = label; button.removeAttribute("data-done"); }, 1600);
  };
  try {
    await navigator.clipboard.writeText(source.textContent);
    done("Copied");
  } catch (err) {
    // Some app views refuse the clipboard: open the text and select it, so it can be copied by hand.
    var box = source.closest("details");
    if (box) box.open = true;
    var range = document.createRange();
    range.selectNodeContents(source);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    done("Selected, now copy");
  }
});
`;

export type KitInput = { drop: Drop; findings: Finding[]; entries: Notes; made: string };

/** The page the owner works from. Published as an artifact: content only, no document skeleton. */
export function renderKit({ drop, findings, entries, made }: KitInput): string {
  const counts = tally(drop);
  const errors = findings.filter((f) => f.level === "error");
  const warns = findings.filter((f) => f.level === "warn");
  const { android, ios } = drop.builds;
  const next = MOMENTS.find((m) => drop.pieces.some((p) => p.moment === m && pieceState(p) !== "sent"));

  const head = `<header class="top">
<div class="top-row"><span class="mark" aria-hidden="true">🚀</span><div><p class="tag">Release drop, written out ${esc(made)}</p><h1>Purify ${esc(drop.release)}</h1></div></div>
<p class="deck">${esc(drop.name)}. ${drop.covers.length > 1 ? `One drop for ${esc(listOf(drop.covers))}, carried by the ${esc(drop.version)} builds.` : ""}</p>
<div class="pills">
<span class="pill pill-accent">${counts.ready + counts.empty} to go</span>
<span class="pill ${counts.waits ? "pill-warn" : ""}">${counts.waits} waiting</span>
<span class="pill ${counts.sent ? "pill-good" : ""}">${counts.sent} done</span>
<span class="pill">Android build ${android.build}${android.served ? `, served ${esc(android.served)}` : ""}</span>
<span class="pill">iOS build ${ios.build}${ios.served ? `, served ${esc(ios.served)}` : ""}</span>
<span class="pill ${errors.length ? "pill-bad" : "pill-good"}">${errors.length ? `${errors.length} refused by the check` : "The check passes"}</span>
</div>
<nav class="jump" aria-label="Moments">${MOMENTS.filter((m) => drop.pieces.some((p) => p.moment === m)).map((m) => `<a href="#${m}">${esc(MOMENT_LABEL[m].name)}${m === next ? " · next" : ""}</a>`).join("")}</nav>
</header>`;

  const finds = findings.length
    ? `<section class="panel"><header class="panel-head"><span class="step" aria-hidden="true">!</span><div><p class="tag">Read these before anything goes out</p><h2>What the check found</h2></div></header>
<ul class="finds">${[...errors, ...warns].map((f) => `<li><span class="pill ${f.level === "error" ? "pill-bad" : "pill-warn"}">${f.level === "error" ? "Refused" : "Look"}</span><span><b>${esc(f.where)}</b> ${esc(f.says)}</span></li>`).join("")}</ul></section>`
    : "";

  const points = `<section class="panel" id="points"><header class="panel-head"><span class="step" aria-hidden="true">${drop.points.length}</span><div><p class="tag">Said once here, used in every piece below</p><h2>What the release is</h2></div></header>
<ul class="points">${drop.points.map((p) => `<li><span class="glyph" aria-hidden="true">${p.emoji}</span><div><b>${esc(p.name)}</b>${p.needs === "apps" ? ' <span class="pill">In the apps only</span>' : ""}<p>${esc(p.text)}</p></div></li>`).join("")}</ul></section>`;

  return `<title>Purify Drop Kit</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap">
<style>${STYLE}</style>
<div class="wrap">
${head}
${finds}
${MOMENTS.map((m, i) => momentPanel(drop, m, i, entries)).join("\n")}
${points}
<p class="foot">Made from docs/plans/v${esc(drop.release)}/drop.json. Nothing on this page sends anything: every piece is copied from here and sent by you, and a step marked ours is done on your word.</p>
</div>
<script>${SCRIPT}</script>
`;
}

/** The drop as a few lines in a terminal: each moment, each piece, where it stands. */
export function renderStatus(drop: Drop, findings: Finding[]): string {
  const counts = tally(drop);
  const lines = [
    `Purify ${drop.release} drop: ${listOf(drop.covers)}, carried by ${drop.version} (Android ${drop.builds.android.build}, iOS ${drop.builds.ios.build})`,
    `${counts.ready + counts.empty} to go, ${counts.waits} waiting, ${counts.sent} done`,
  ];
  MOMENTS.forEach((moment, i) => {
    const pieces = drop.pieces.filter((p) => p.moment === moment);
    if (!pieces.length) return;
    lines.push("", `${i + 1}. ${MOMENT_LABEL[moment].name}`);
    for (const piece of pieces) {
      const state = standing(drop, piece);
      const mark = state.tone === "good" ? "x" : state.tone === "warn" ? "~" : " ";
      const who = piece.who ? `  (${WHO[piece.who].toLowerCase()})` : "";
      lines.push(`   [${mark}] ${piece.id.padEnd(24)} ${state.label}${who}`);
      if (piece.waits) lines.push(`       waits on: ${piece.waits}`);
    }
  });
  const errors = findings.filter((f) => f.level === "error");
  const warns = findings.filter((f) => f.level === "warn");
  if (findings.length) lines.push("");
  for (const f of errors) lines.push(`  NO  ${f.rule}  ${f.where}: ${f.says}`);
  for (const f of warns) lines.push(`  ..  ${f.rule}  ${f.where}: ${f.says}`);
  lines.push("", errors.length ? `${errors.length} thing(s) refused. Nothing goes out until they are put right.` : "The check passes. Read each piece before it is sent.");
  return `${lines.join("\n")}\n`;
}

/** One text file for each piece that is pasted, numbered by the moment it goes out. */
export function pasteFiles(drop: Drop, entries: Notes): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  for (const piece of drop.pieces) {
    if (!CHANNELS[piece.channel].paste) continue;
    const words = wordsOf(drop, piece, entries);
    if (!words) continue;
    const head = piece.subject ? `${piece.subject}\n\n` : "";
    out.push({ file: `${MOMENTS.indexOf(piece.moment) + 1}-${piece.moment}--${piece.id}.txt`, text: `${head}${words}\n` });
  }
  return out;
}

/** drop.json as a page to read in a diff. The whole note is left out: it is the notes, set out again. */
export function renderMarkdown(drop: Drop): string {
  const lines: string[] = [
    `# Purify ${drop.release}: the drop`,
    "",
    "Written out by `node scripts/drop.mjs kit` from `drop.json`. Do not edit this",
    "file: change `drop.json` and write it out again. The rules are in `docs/DROP.md`.",
    "",
    `${drop.name}. Covers ${listOf(drop.covers)}, carried by the ${drop.version} builds (Android ${drop.builds.android.build}, iOS ${drop.builds.ios.build}).`,
    "",
    "## What the release is",
    "",
    ...drop.points.map((p) => `- ${p.emoji} **${p.name}.** ${p.text}${p.needs === "apps" ? " *(in the apps only)*" : ""}`),
    "",
    "Also:",
    "",
    ...drop.also.map((a) => `- ${a.text}`),
    "",
    "## What may not be said",
    "",
    ...drop.never.map((n) => `- "${n.word}": ${n.why}`),
    "",
    "## The notes",
    "",
    ...drop.notes.map((n) => `- ${n.version}: ${n.state}${n.revision ? ` (revision ${n.revision})` : ""}${n.on ? `, ${n.on}` : ""}`),
  ];
  for (const moment of MOMENTS) {
    const pieces = drop.pieces.filter((p) => p.moment === moment);
    if (!pieces.length) continue;
    lines.push("", `## ${MOMENT_LABEL[moment].name}`, "", `*${MOMENT_LABEL[moment].when}.*`);
    for (const piece of pieces) {
      const channel = CHANNELS[piece.channel];
      const facts = [channel.name, piece.where ?? channel.where, piece.who ? WHO[piece.who] : "", standing(drop, piece).label];
      if (channel.limit && piece.text) facts.push(`${length(piece.text)} of ${channel.limit} characters`);
      lines.push("", `### ${piece.title}`, "", `\`${piece.id}\` · ${facts.filter(Boolean).join(" · ")}`);
      if (piece.waits) lines.push("", `Waits on: ${piece.waits}`);
      if (piece.note) lines.push("", `> ${piece.note}`);
      if (piece.madeIn) lines.push("", `The files are with the piece \`${piece.madeIn}\` in purify-ads.`);
      if (piece.sent) lines.push("", `Sent ${piece.sent.on} by ${piece.sent.by}${piece.sent.words ? `: "${piece.sent.words}"` : ""}${piece.sent.link ? ` (${piece.sent.link})` : ""}.`);
      if (piece.channel === "notes-all") continue;
      const words = [piece.subject, piece.text].filter(Boolean).join("\n\n");
      if (words) lines.push("", "~~~text", words, "~~~");
    }
  }
  return `${lines.join("\n")}\n`;
}
