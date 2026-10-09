import re, subprocess
SRC = '/tmp/claude-0/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/scratchpad/voice-board/index.html'
s = open(SRC, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    c = s.count(old)
    assert c == count, (c, old[:80])
    s = s.replace(old, new)

TOKENS_DARK = '''color-scheme: dark;
    --bg: #0e1524; --panel: #16223a; --panel-2: #1f2d49; --line: #2d3c5a;
    --ink: #e8e7e2; --ink-2: #c5cbd8; --ink-3: #9ba5ba;
    --lapis: #b5c4e4; --lapis-ink: #0e1524; --lapis-soft: #26385c;
    --rubric: #f07174; --rubric-soft: #3b1f29;
    --good: #7cc59f; --good-soft: #163128; --warn: #e4b763; --warn-soft: #33290f; --bad: #f07174; --bad-soft: #3b1f29;'''
CSS = '''<style>
/* RUBRIC, the board's world (Oct 8, chosen by the owner; built with Impeccable's Operate rules): vellum paper, lapis-black ink, and rubric red only where the owner has a move to make, the way a service book prints its instructions in red. One column of sections, the owner's queue first. Lora sets the page and section titles, each opening on a red letter; Source Sans 3 carries everything that is read or tapped. This stylesheet replaced the generated one by hand, like the voice list: port both into ssm/ before the next sync rebuilds the page. */
:root {
  color-scheme: light;
  --bg: #e8e7e2; --panel: #f4f3ef; --panel-2: #dedcd5; --line: #c8c5bb;
  --ink: #1c1a16; --ink-2: #48443c; --ink-3: #635d52;
  --lapis: #16223a; --lapis-ink: #f4f3ef; --lapis-soft: #d5d9e1;
  --rubric: #a8262c; --rubric-soft: #efdad7;
  --good: #2c6448; --good-soft: #d5e4da; --warn: #85570a; --warn-soft: #eee0c2; --bad: #a8262c; --bad-soft: #efdad7;
  --r: 10px;
  --font: "Source Sans 3", "Source Sans Pro", system-ui, -apple-system, "Segoe UI", sans-serif;
  --serif: "Lora", Georgia, "Times New Roman", serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ''' + TOKENS_DARK + ''' } }
:root[data-theme="dark"] { ''' + TOKENS_DARK + ''' }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 16px/1.5 var(--font); padding-inline: 16px; padding-block: 28px 64px; caret-color: var(--rubric); accent-color: var(--lapis); scrollbar-color: var(--line) transparent; }
::selection { background: var(--rubric-soft); color: var(--ink); }
main { max-width: 1000px; margin: 0 auto; display: grid; gap: 44px; }
h1 { font: 600 34px/1.12 var(--serif); letter-spacing: -0.01em; margin: 0; text-wrap: balance; }
h2 { font: 600 23px/1.2 var(--serif); margin: 0; text-wrap: balance; }
h2::first-letter { color: var(--rubric); }
h3 { font-size: 16px; line-height: 1.35; margin: 0; font-weight: 600; text-wrap: balance; overflow-wrap: anywhere; }
p { margin: 0; }
a { color: var(--lapis); text-underline-offset: 3px; }
.sub { color: var(--ink-2); }
.dim { color: var(--ink-3); }
.small { font-size: 13.5px; }
header { display: grid; gap: 14px; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
main > *, section > *, .card > *, .stack > *, .live > *, .go > *, .body > *, details > * { min-width: 0; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; line-height: 1.35; max-width: 100%; overflow-wrap: anywhere; background: transparent; color: var(--ink-2); border: 1px solid var(--line); }
.pill.good { background: var(--good-soft); color: var(--good); border-color: transparent; }
.pill.warn { background: var(--warn-soft); color: var(--warn); border-color: transparent; }
.pill.bad { background: var(--bad-soft); color: var(--bad); border-color: transparent; }
.pill.violet { background: var(--lapis-soft); color: var(--lapis); border-color: transparent; }
section { display: grid; gap: 16px; scroll-margin-top: 64px; }
.head { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
.head .sub { font-size: 14.5px; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); padding: 16px; }
.list { display: grid; background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; }
.list:empty { display: none; }
.ask { display: grid; gap: 3px; padding: 13px 16px; color: inherit; text-decoration: none; border-bottom: 1px solid var(--line); }
.ask:last-child { border-bottom: 0; }
a.ask:hover { background: var(--bg); }
a.ask:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--lapis); }
.ask p { color: var(--ink-2); font-size: 14.5px; overflow-wrap: anywhere; }
.list > .ask h3::before, .why::before { content: "¶"; color: var(--rubric); font: 600 1em/1 var(--serif); margin-right: 7px; }
.funnel { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; }
.step { padding: 12px 14px; display: grid; gap: 2px; min-width: 0; border-right: 1px solid var(--line); }
.step:last-child { border-right: 0; }
.step b { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }
.step span { font-size: 13px; color: var(--ink-2); overflow-wrap: anywhere; }
.step.zero b { color: var(--ink-3); }
.pieces { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 430px), 1fr)); }
.piece { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 14px; scroll-margin-top: 64px; }
.piece.off { opacity: 0.6; }
.piece .body { display: grid; gap: 8px; align-content: start; min-width: 0; }
.thumb { width: 60px; height: 80px; border-radius: 6px; object-fit: cover; display: block; background: var(--panel-2); }
.thumb.blank, .tile .blank { display: grid; place-items: center; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--lapis); background: var(--lapis-soft); }
.thumb.s { width: 42px; height: 56px; border-radius: 5px; }
.where { font-size: 13px; color: var(--ink-3); padding: 1px 9px; border: 1px dashed var(--line); border-radius: 999px; white-space: nowrap; }
.where.on { color: var(--good); border-style: solid; border-color: var(--good); }
.say { color: var(--ink-2); font-size: 14.5px; overflow-wrap: anywhere; }
.scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--r); background: var(--panel); padding: 8px; }
table { border-collapse: collapse; width: 100%; font-size: 14.5px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: middle; }
th { color: var(--ink-3); font-weight: 600; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; }
tr:last-child td { border-bottom: 0; }
td.c, th.c { text-align: center; }
td.n, th.n { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
td.t { min-width: 150px; max-width: 240px; overflow-wrap: anywhere; }
.yes { color: var(--good); font-weight: 600; }
.no { color: var(--ink-3); }
.short { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: start; padding: 12px 14px; border-bottom: 1px solid var(--line); scroll-margin-top: 64px; }
.short:last-child { border-bottom: 0; }
.short > div { display: grid; gap: 7px; min-width: 0; }
.short .t { font-weight: 600; overflow-wrap: anywhere; }
.short .m { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.why { color: var(--ink-2); font-size: 14px; overflow-wrap: anywhere; }
.grid3 { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); }
.grid4 { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 215px), 1fr)); }
.stack { display: grid; gap: 8px; align-content: start; min-width: 0; }
.stack > .where { justify-self: start; }
.hero { font-size: 28px; line-height: 1.1; font-weight: 600; font-variant-numeric: tabular-nums; }
.bar { height: 6px; border-radius: 999px; background: var(--panel-2); overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 999px; background: var(--lapis); }
.meter { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; align-items: baseline; font-size: 14.5px; font-variant-numeric: tabular-nums; }
.meter .bar { grid-column: 1 / -1; }
.spark { width: 100%; max-width: 220px; height: 44px; display: block; }
.day { display: grid; gap: 10px; align-content: start; min-width: 0; }
.slot { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: center; color: inherit; text-decoration: none; }
.slot .t { font-size: 14.5px; overflow-wrap: anywhere; }
code { font: 13px var(--mono); color: var(--ink); background: var(--panel-2); padding: 1px 6px; border-radius: 4px; overflow-wrap: anywhere; }
.layers { display: grid; gap: 8px; }
.layer { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: baseline; }
.layer b { color: var(--rubric); font-weight: 600; font-variant-numeric: tabular-nums; }
.empty { color: var(--ink-2); padding: 16px; background: var(--panel); border: 1px dashed var(--line); border-radius: var(--r); }
ul.look { margin: 0; padding-left: 18px; color: var(--ink-2); font-size: 14.5px; display: grid; gap: 4px; }
ul.look b { color: var(--ink); font-variant-numeric: tabular-nums; }
.struck { text-decoration: line-through; color: var(--ink-3); }
footer { color: var(--ink-3); font-size: 13.5px; border-top: 1px solid var(--line); padding-top: 14px; }
/* What the owner taps. Hidden until the page's store answers, so the page reads whole without it. */
.live { display: none; flex-wrap: wrap; gap: 8px; align-items: center; }
:root[data-live="1"] .live { display: flex; }
.wide { flex: 1 1 100%; min-width: 0; }
.btn { appearance: none; font: 600 14.5px var(--font); color: var(--ink); background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 7px 14px; min-height: 40px; cursor: pointer; }
.btn.small { padding: 5px 12px; min-height: 36px; font-size: 14px; }
.btn.big { padding: 10px 18px; min-height: 44px; font-size: 15.5px; background: var(--lapis); border-color: var(--lapis); color: var(--lapis-ink); }
.btn:hover, .chip:hover { border-color: var(--ink-3); }
.btn.big:hover { border-color: var(--lapis); filter: brightness(1.15); }
.btn:active, .chip:active, .seg button:active { transform: translateY(1px); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn[aria-pressed="true"], .chip[aria-pressed="true"] { background: var(--lapis-soft); border-color: var(--lapis); color: var(--lapis); }
.btn:focus-visible, .chip:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, summary:focus-visible, a:focus-visible, .seg button:focus-visible { outline: 2px solid var(--lapis); outline-offset: 2px; }
.chip { appearance: none; font: 600 13.5px var(--font); color: var(--ink-2); background: transparent; border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; min-height: 36px; cursor: pointer; white-space: nowrap; }
.filter { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.filter input { flex: 1 1 150px; max-width: 260px; min-height: 36px; padding: 5px 12px; font-size: 16px; }
input, textarea, select { font: 16px var(--font); color: var(--ink); background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; min-width: 0; }
input, textarea { flex: 1 1 170px; }
select { max-width: 100%; flex: 0 1 auto; text-overflow: ellipsis; }
select.wide { width: 100%; }
input[type="checkbox"] { flex: none; width: 18px; height: 18px; margin: 3px 0 0; padding: 0; accent-color: var(--lapis); }
input[type="number"] { flex: 1 1 96px; }
input[type="date"] { flex: 0 1 160px; }
textarea { resize: vertical; flex-basis: 100%; width: 100%; }
input::placeholder, textarea::placeholder { color: var(--ink-3); }
.state, .msg { font-size: 13.5px; color: var(--ink-3); overflow-wrap: anywhere; }
details summary { cursor: pointer; color: var(--ink-2); font-size: 14px; font-weight: 600; width: fit-content; padding-block: 6px; }
details summary:hover { color: var(--ink); }
details[open] > summary { margin-bottom: 6px; }
.go { display: grid; gap: 8px; padding-top: 14px; padding-bottom: 4px; border-top: 1px solid var(--line); }
.cap-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: start; }
.cap { font-size: 14.5px; color: var(--ink-2); overflow-wrap: anywhere; white-space: pre-line; }
.edit { display: grid; gap: 8px; }
.tick { display: flex; gap: 9px; align-items: flex-start; font-size: 14.5px; color: var(--ink-2); padding-block: 3px; cursor: pointer; }
.live-only { display: none; }
:root[data-live="1"] .live-only { display: inline-flex; }
.jump, .deckbar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; gap: 2px; margin-inline: -16px; padding: 8px 12px; background: var(--bg); border-bottom: 1px solid var(--line); }
.jump { display: flex; overflow-x: auto; scrollbar-width: none; margin-top: -26px; }
.jump a { flex: none; font-size: 14.5px; font-weight: 600; color: var(--ink-2); text-decoration: none; padding: 6px 10px; border-radius: 6px; white-space: nowrap; }
.jump a:hover, .jump a:focus-visible { color: var(--ink); background: var(--panel); outline: none; }
.stage { position: relative; width: 100%; max-width: 270px; }
video { display: block; width: 100%; aspect-ratio: 9 / 16; border-radius: 8px; background: #000; }
/* Our own safe box, from PLATFORMS.md: 90 px from each side, 250 from the top, 330 from the bottom of 1080 by 1920. */
.safe { display: none; position: absolute; inset: 13.02% 8.33% 17.19% 8.33%; border: 1.5px dashed var(--warn); border-radius: 4px; pointer-events: none; }
.stage[data-safe="1"] .safe { display: block; }
.hooks { display: grid; gap: 8px; }
.hook { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
.hook .cap { color: var(--ink); flex: 1 1 200px; }
.tile { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: start; }
.tile img, .tile .blank { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; }
.tile img { background: var(--panel-2); }
.gates { display: flex; flex-wrap: wrap; gap: 4px; }
.g { font-size: 12.5px; line-height: 1.3; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--line); color: var(--ink-3); white-space: nowrap; }
.g.done { color: var(--good); border-color: var(--good); }
.g.now { color: var(--warn); border-color: transparent; background: var(--warn-soft); }
.g.stop { color: var(--bad); border-color: transparent; background: var(--bad-soft); }
.seg { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.seg button { appearance: none; border: 0; border-right: 1px solid var(--line); background: var(--panel); color: var(--ink-2); font: 600 14.5px var(--font); padding: 7px 14px; min-height: 40px; min-width: 42px; cursor: pointer; }
.seg button:last-child { border-right: 0; }
.seg button[aria-pressed="true"] { background: var(--lapis); color: var(--lapis-ink); }
.fresh { background: var(--rubric-soft); }
.pending { display: grid; gap: 4px; font-size: 14px; color: var(--ink-2); }
.deckbar { display: none; align-items: center; justify-content: space-between; }
/* Going through what needs the owner, one after another: everything else steps aside. */
:root[data-deck="1"] .deckbar { display: flex; }
:root[data-deck="1"] .jump, :root[data-deck="1"] header, :root[data-deck="1"] footer { display: none; }
:root[data-deck="1"] main > section:not(#works):not(#saved) { display: none; }
:root[data-deck="1"] #works > :not(.pieces), :root[data-deck="1"] #saved > :not(.scroll) { display: none; }
:root[data-deck="1"] .piece:not(.needs), :root[data-deck="1"] .short:not(.needs) { display: none; }
:root[data-deck="1"] .stage { max-width: 330px; }
:root[data-deck="1"] .needs.decided { opacity: 0.45; }
/* The voice list: the numbered ideas in the order to record them, numbered in red like a rubricated list. */
.voice { display: grid; gap: 12px; scroll-margin-top: 64px; }
.vhead { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
.vhead h3 { font: 600 20px/1.25 var(--serif); }
.voice-groups { display: grid; gap: 14px; }
.vgroup { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; }
.vgroup h4 { margin: 0; padding: 11px 14px; font: 600 16px/1.3 var(--serif); border-bottom: 1px solid var(--line); display: flex; gap: 10px; align-items: baseline; }
.vgroup h4 span { font: 600 13px var(--font); color: var(--ink-3); font-variant-numeric: tabular-nums; }
.vrow { display: grid; grid-template-columns: 2.2em minmax(0, 1fr) auto; gap: 4px 12px; align-items: start; padding: 12px 14px; border-bottom: 1px solid var(--line); }
.vrow:last-child { border-bottom: 0; }
.vn { font: 600 17px/1.3 var(--serif); color: var(--rubric); text-align: right; font-variant-numeric: lining-nums tabular-nums; }
.vt { display: grid; gap: 6px; min-width: 0; }
.vtags { display: flex; flex-wrap: wrap; gap: 6px; }
.vtags .pill { padding: 1px 9px; font-size: 12.5px; }
.vt details summary { padding-block: 2px; }
.vt .say, .vnotes .say { white-space: pre-line; max-width: 70ch; }
.vmark { display: grid; gap: 4px; justify-items: end; }
.vrow[data-done="1"] h3, .vrow[data-done="1"] .vn { color: var(--ink-3); }
.vrow[data-done="1"] .btn[aria-pressed="true"] { background: var(--good-soft); border-color: transparent; color: var(--good); }
:root[data-vo-hide="1"] .vrow[data-done="1"] { display: none; }
.vnotes { padding: 4px 14px 10px; border: 1px dashed var(--line); border-radius: var(--r); }
.vnotes .say { padding-top: 8px; padding-bottom: 8px; border-top: 1px solid var(--line); }
@media (max-width: 560px) {
  h1 { font-size: 28px; }
  .funnel { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .step:nth-child(3n) { border-right: 0; }
  .step:nth-child(-n+3) { border-bottom: 1px solid var(--line); }
  .thumb { width: 51px; height: 68px; }
  .cap-row { grid-template-columns: minmax(0, 1fr) auto; }
  .cap-row .where { grid-column: 1 / -1; width: fit-content; }
  .vrow { grid-template-columns: 1.8em minmax(0, 1fr); }
  .vmark { grid-column: 2; justify-items: start; }
}
@media (prefers-reduced-motion: no-preference) { .btn, .chip, .seg button, .jump a, a.ask { transition: background-color 0.15s ease-out, border-color 0.15s ease-out, color 0.15s ease-out; } }
</style>'''

a = s.index('<style>'); b = s.index('</style>', a) + len('</style>')
s = s[:a] + CSS + s[b:]
rep('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;1,500&family=Source+Sans+3:wght@400;600;700&display=swap">')

EMO = '[←-⇿⌀-⏿■-◿☀-➿⬀-⯿\U0001F000-\U0001FAFF️‍⃣]+'
n0 = 0
for pat in [r'(<(?:h2|h3|button|summary|option)\b[^>]*>)\s*' + EMO + r'\s*',
            r'(<span class="pill[^"]*"[^>]*>)\s*' + EMO + r'\s*',
            r'(<a href="#[^"]*"[^>]*>)\s*' + EMO + r'\s*']:
    s, k = re.subn(pat, r'\1', s); n0 += k
LABEL = {'🎬': 'Edit', '🗃️': 'Saved', '🗃': 'Saved', '✏️': 'Text', '✏': 'Text', '🔊': 'Audio'}
def blank(m):
    e = m.group(2)
    return m.group(1) + LABEL.get(e, LABEL.get(e.replace('️', ''), '')) + '<'
s, nb = re.subn(r'(<[^>]*class="(?:thumb[^"]*blank|blank)[^"]*"[^>]*>)(' + EMO + r')<', blank, s)

for old, new in [('["myth", "🔎 Myth Busts"], ["series", "🔁 Series"], ["history", "📜 History and saints"], ["shorts", "🎓 Shorts explainers"], ["long", "📺 Long form"]',
                  '["myth", "Myth Busts"], ["series", "Series"], ["history", "History and saints"], ["shorts", "Shorts explainers"], ["long", "Long form"]'),
                 ('        group.appendChild(mk("h4", "", g[1] + " · " + mine.length));',
                  '        var gh = mk("h4", "", g[1]);\n        gh.appendChild(mk("span", "", String(mine.length)));\n        group.appendChild(gh);'),
                 ('          r.pf.forEach(function (p) { tags.appendChild(mk("span", "pill", p)); });',
                  '          if (r.pick) tags.appendChild(mk("span", "pill violet", "Your pick"));\n          r.pf.forEach(function (p) { tags.appendChild(mk("span", "pill", p)); });'),
                 ('mk("h3", "", (r.pick ? "⭐ " : "") + r.hook)', 'mk("h3", "", r.hook)'),
                 ('var b = mk("button", "btn small", "🎙️ Mark recorded")', 'var b = mk("button", "btn small", "Mark recorded")'),
                 ('b.textContent = on ? "✅ Recorded" : "🎙️ Mark recorded";', 'b.textContent = on ? "Recorded" : "Mark recorded";'),
                 ('mk("summary", "", "🗂️ Notes and rules for the edits · " + notes.length)', 'mk("summary", "", "Notes and rules for the edits (" + notes.length + ")")'),
                 ('say.appendChild(mk("p", "say", r.text));', 'say.appendChild(mk("p", "say", r.text.replace(/^\\u2b50\\ufe0f?\\s*/, "")));')]:
    rep(old, new)
left = re.findall(r'<(?:h2|h3|button|summary|a href="#)[^>]*>' + EMO, s)
assert not left, left[:5]
assert '—' not in CSS
open('index.html', 'w', encoding='utf-8').write(s)
SK = open('/root/.claude/projects/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/tool-results/artifact-8b839950-1791194761-26f7.html', encoding='utf-8').read()
pre = SK[:SK.index('<body>') + len('<body>')] + '\n'
open('test.html', 'w', encoding='utf-8').write(pre + s + '</body></html>')
a, b = s.index('<script>') + 8, s.index('</script>')
open('main.js', 'w', encoding='utf-8').write(s[a:b])
print('emoji stripped from', n0, 'labels;', nb, 'blank thumbs relabelled; size', len(s.encode()))
