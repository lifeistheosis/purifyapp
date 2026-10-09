SRC = '/tmp/claude-0/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/scratchpad/rubric/index.html'
s = open(SRC, encoding='utf-8').read()
DARK = '''color-scheme: dark;
    --bg: #0a0a0a; --panel: #0a0a0a; --panel-2: #191919; --line: #262626; --line-2: #3d3d3d;
    --ink: #f2f2f2; --ink-2: #bdbdbd; --ink-3: #939393; --solid: #f2f2f2; --solid-ink: #0a0a0a; --soft: #1f1f1f;'''
CSS = '''<style>
/* Black and white, minimal, desktop first (Oct 8, the owner's call after RUBRIC: "black and white, more minimal, optimized for desktop"). Built with Impeccable's Operate rules: one family, one ink, state carried by fill, outline and dash instead of colour. On a desktop the sections list sits in a sticky column on the left; below 1100 px it becomes the top bar. This stylesheet replaced the generated one by hand, like the voice list: port both into ssm/ before the next sync rebuilds the page. */
:root {
  color-scheme: light;
  --bg: #ffffff; --panel: #ffffff; --panel-2: #f3f3f3; --line: #e3e3e3; --line-2: #c4c4c4;
  --ink: #0a0a0a; --ink-2: #474747; --ink-3: #6b6b6b; --solid: #0a0a0a; --solid-ink: #ffffff; --soft: #efefef;
  --r: 6px;
  --font: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ''' + DARK + ''' } }
:root[data-theme="dark"] { ''' + DARK + ''' }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 15px/1.55 var(--font); padding-inline: 16px; padding-block: 28px 72px; caret-color: var(--ink); accent-color: var(--ink); scrollbar-color: var(--line-2) transparent; }
::selection { background: var(--ink); color: var(--bg); }
main { max-width: 1060px; margin: 0 auto; display: grid; }
main > header { margin-bottom: 18px; }
main > section { margin-bottom: 52px; }
h1 { font: 600 30px/1.15 var(--font); letter-spacing: -0.02em; margin: 0; text-wrap: balance; }
h2 { font: 600 19px/1.3 var(--font); letter-spacing: -0.01em; margin: 0; text-wrap: balance; }
h3 { font-size: 15px; line-height: 1.4; margin: 0; font-weight: 600; text-wrap: balance; overflow-wrap: anywhere; }
p { margin: 0; }
a { color: var(--ink); text-underline-offset: 3px; text-decoration-thickness: 1px; }
.sub { color: var(--ink-2); }
.dim { color: var(--ink-3); }
.small { font-size: 13px; }
header { display: grid; gap: 12px; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
main > *, section > *, .card > *, .stack > *, .live > *, .go > *, .body > *, details > * { min-width: 0; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 4px; font-size: 12.5px; font-weight: 500; line-height: 1.4; max-width: 100%; overflow-wrap: anywhere; background: transparent; color: var(--ink-2); border: 1px solid var(--line-2); }
.pill.good { background: var(--solid); color: var(--solid-ink); border-color: var(--solid); }
.pill.warn { border-style: dashed; border-color: var(--ink); color: var(--ink); }
.pill.bad { border-color: var(--ink); color: var(--ink); font-weight: 700; }
.pill.violet { background: var(--soft); border-color: transparent; color: var(--ink); }
section { display: grid; gap: 16px; scroll-margin-top: 72px; }
.head { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; padding-bottom: 10px; border-bottom: 1px solid var(--ink); }
.head .sub { font-size: 14px; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); padding: 16px; }
.list { display: grid; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.list:empty { display: none; }
.ask { display: grid; gap: 2px; padding: 11px 10px; color: inherit; text-decoration: none; border-bottom: 1px solid var(--line); }
.ask:last-child { border-bottom: 0; }
a.ask:hover { background: var(--panel-2); }
a.ask:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
.ask p { color: var(--ink-2); font-size: 14px; overflow-wrap: anywhere; }
.funnel { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.step { padding: 12px 14px; display: grid; gap: 2px; min-width: 0; border-right: 1px solid var(--line); }
.step:last-child { border-right: 0; }
.step b { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.step span { font-size: 12.5px; color: var(--ink-2); overflow-wrap: anywhere; }
.step.zero b { color: var(--ink-3); }
.pieces { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 440px), 1fr)); }
.piece { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 14px; scroll-margin-top: 72px; }
.piece.off { opacity: 0.55; }
.piece .body { display: grid; gap: 8px; align-content: start; min-width: 0; }
.thumb { width: 60px; height: 80px; border-radius: 4px; object-fit: cover; display: block; background: var(--panel-2); }
.thumb.blank, .tile .blank { display: grid; place-items: center; font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); background: var(--panel-2); }
.thumb.s { width: 42px; height: 56px; border-radius: 3px; }
.where { font-size: 12.5px; color: var(--ink-3); padding: 1px 8px; border: 1px dashed var(--line-2); border-radius: 4px; white-space: nowrap; }
.where.on { color: var(--ink); border-style: solid; border-color: var(--ink); }
.say { color: var(--ink-2); font-size: 14px; overflow-wrap: anywhere; }
.scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--r); background: var(--panel); padding: 8px; }
table { border-collapse: collapse; width: 100%; font-size: 14px; }
th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); vertical-align: middle; }
th { color: var(--ink-3); font-weight: 500; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.07em; white-space: nowrap; }
tr:last-child td { border-bottom: 0; }
tbody tr:hover td { background: var(--panel-2); }
td.c, th.c { text-align: center; }
td.n, th.n { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
td.t { min-width: 150px; max-width: 280px; overflow-wrap: anywhere; }
.yes { color: var(--ink); font-weight: 600; }
.no { color: var(--ink-3); }
.short { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: start; padding: 12px 14px; border-bottom: 1px solid var(--line); scroll-margin-top: 72px; }
.short:last-child { border-bottom: 0; }
.short > div { display: grid; gap: 7px; min-width: 0; }
.short .t { font-weight: 600; overflow-wrap: anywhere; }
.short .m { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.why { color: var(--ink-2); font-size: 13.5px; overflow-wrap: anywhere; }
.grid3 { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); }
.grid4 { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); }
.stack { display: grid; gap: 8px; align-content: start; min-width: 0; }
.stack > .where { justify-self: start; }
.hero { font-size: 28px; line-height: 1.1; font-weight: 600; letter-spacing: -0.015em; font-variant-numeric: tabular-nums; }
.bar { height: 4px; border-radius: 2px; background: var(--panel-2); overflow: hidden; }
.bar i { display: block; height: 100%; background: var(--ink); }
.meter { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; align-items: baseline; font-size: 14px; font-variant-numeric: tabular-nums; }
.meter .bar { grid-column: 1 / -1; }
.spark { width: 100%; max-width: 220px; height: 44px; display: block; }
.day { display: grid; gap: 10px; align-content: start; min-width: 0; }
.slot { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: center; color: inherit; text-decoration: none; }
.slot .t { font-size: 14px; overflow-wrap: anywhere; }
code { font: 12.5px var(--mono); color: var(--ink); background: var(--panel-2); padding: 1px 5px; border-radius: 3px; overflow-wrap: anywhere; }
.layers { display: grid; gap: 8px; }
.layer { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: baseline; }
.layer b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.empty { color: var(--ink-2); padding: 16px; border: 1px dashed var(--line-2); border-radius: var(--r); }
ul.look { margin: 0; padding-left: 18px; color: var(--ink-2); font-size: 14px; display: grid; gap: 4px; }
ul.look b { color: var(--ink); font-variant-numeric: tabular-nums; }
.struck { text-decoration: line-through; color: var(--ink-3); }
footer { color: var(--ink-3); font-size: 13px; border-top: 1px solid var(--line); padding-top: 14px; }
/* What the owner taps. Hidden until the page's store answers, so the page reads whole without it. */
.live { display: none; flex-wrap: wrap; gap: 8px; align-items: center; }
:root[data-live="1"] .live { display: flex; }
.wide { flex: 1 1 100%; min-width: 0; }
.btn { appearance: none; font: 500 14px var(--font); color: var(--ink); background: var(--bg); border: 1px solid var(--line-2); border-radius: var(--r); padding: 6px 14px; min-height: 36px; cursor: pointer; }
.btn.small { padding: 4px 11px; min-height: 32px; font-size: 13.5px; }
.btn.big { padding: 9px 18px; min-height: 42px; font-size: 15px; background: var(--solid); border-color: var(--solid); color: var(--solid-ink); }
.btn:hover, .chip:hover { border-color: var(--ink); }
.btn.big:hover { opacity: 0.88; }
.btn:active, .chip:active, .seg button:active { transform: translateY(1px); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn[aria-pressed="true"], .chip[aria-pressed="true"] { background: var(--solid); border-color: var(--solid); color: var(--solid-ink); }
.btn:focus-visible, .chip:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, summary:focus-visible, a:focus-visible, .seg button:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.chip { appearance: none; font: 500 13px var(--font); color: var(--ink-2); background: transparent; border: 1px solid var(--line-2); border-radius: var(--r); padding: 4px 11px; min-height: 32px; cursor: pointer; white-space: nowrap; }
.filter { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.filter input { flex: 1 1 150px; max-width: 260px; min-height: 34px; padding: 5px 12px; font-size: 15px; }
input, textarea, select { font: 15px var(--font); color: var(--ink); background: var(--bg); border: 1px solid var(--line-2); border-radius: var(--r); padding: 7px 11px; min-width: 0; }
input, textarea { flex: 1 1 170px; }
select { max-width: 100%; flex: 0 1 auto; text-overflow: ellipsis; }
select.wide { width: 100%; }
input[type="checkbox"] { flex: none; width: 16px; height: 16px; margin: 3px 0 0; padding: 0; accent-color: var(--ink); }
input[type="number"] { flex: 1 1 96px; }
input[type="date"] { flex: 0 1 160px; }
textarea { resize: vertical; flex-basis: 100%; width: 100%; }
input::placeholder, textarea::placeholder { color: var(--ink-3); }
.state, .msg { font-size: 13px; color: var(--ink-3); overflow-wrap: anywhere; }
details summary { cursor: pointer; color: var(--ink-2); font-size: 13.5px; font-weight: 500; width: fit-content; padding-block: 5px; }
details summary:hover { color: var(--ink); }
details[open] > summary { margin-bottom: 6px; }
.go { display: grid; gap: 8px; padding-top: 14px; padding-bottom: 4px; border-top: 1px solid var(--line); }
.cap-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: start; }
.cap { font-size: 14px; color: var(--ink-2); overflow-wrap: anywhere; white-space: pre-line; }
.edit { display: grid; gap: 8px; }
.tick { display: flex; gap: 9px; align-items: flex-start; font-size: 14px; color: var(--ink-2); padding-block: 3px; cursor: pointer; }
.live-only { display: none; }
:root[data-live="1"] .live-only { display: inline-flex; }
.jump, .deckbar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; gap: 2px; margin-inline: -16px; padding: 8px 12px; background: var(--bg); border-bottom: 1px solid var(--line); }
.jump { display: flex; overflow-x: auto; scrollbar-width: none; margin-bottom: 36px; }
.jump a { flex: none; font-size: 14px; font-weight: 500; color: var(--ink-2); text-decoration: none; padding: 5px 10px; border-radius: 4px; white-space: nowrap; }
.jump a:hover, .jump a:focus-visible { color: var(--ink); background: var(--panel-2); outline: none; }
.stage { position: relative; width: 100%; max-width: 270px; }
video { display: block; width: 100%; aspect-ratio: 9 / 16; border-radius: 4px; background: #000; }
/* Our own safe box, from PLATFORMS.md: 90 px from each side, 250 from the top, 330 from the bottom of 1080 by 1920. */
.safe { display: none; position: absolute; inset: 13.02% 8.33% 17.19% 8.33%; border: 1.5px dashed #ffffff; border-radius: 3px; pointer-events: none; mix-blend-mode: difference; }
.stage[data-safe="1"] .safe { display: block; }
.hooks { display: grid; gap: 8px; }
.hook { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r); }
.hook .cap { color: var(--ink); flex: 1 1 200px; }
.tile { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: start; }
.tile img, .tile .blank { width: 56px; height: 56px; border-radius: 4px; object-fit: cover; }
.tile img { background: var(--panel-2); }
.gates { display: flex; flex-wrap: wrap; gap: 4px; }
.g { font-size: 12px; line-height: 1.35; padding: 1px 7px; border-radius: 3px; border: 1px solid var(--line-2); color: var(--ink-3); white-space: nowrap; }
.g.done { background: var(--solid); border-color: var(--solid); color: var(--solid-ink); }
.g.now { border-style: dashed; border-color: var(--ink); color: var(--ink); }
.g.stop { border-color: var(--ink); color: var(--ink); font-weight: 700; }
.seg { display: inline-flex; border: 1px solid var(--line-2); border-radius: var(--r); overflow: hidden; }
.seg button { appearance: none; border: 0; border-right: 1px solid var(--line-2); background: var(--bg); color: var(--ink-2); font: 500 14px var(--font); padding: 6px 14px; min-height: 36px; min-width: 40px; cursor: pointer; }
.seg button:last-child { border-right: 0; }
.seg button[aria-pressed="true"] { background: var(--solid); color: var(--solid-ink); }
.fresh { background: var(--soft); }
.pending { display: grid; gap: 4px; font-size: 13.5px; color: var(--ink-2); }
.deckbar { display: none; align-items: center; justify-content: space-between; }
/* Going through what needs the owner, one after another: everything else steps aside. */
:root[data-deck="1"] .deckbar { display: flex; }
:root[data-deck="1"] .jump, :root[data-deck="1"] header, :root[data-deck="1"] footer { display: none; }
:root[data-deck="1"] main > section:not(#works):not(#saved) { display: none; }
:root[data-deck="1"] #works > :not(.pieces), :root[data-deck="1"] #saved > :not(.scroll) { display: none; }
:root[data-deck="1"] .piece:not(.needs), :root[data-deck="1"] .short:not(.needs) { display: none; }
:root[data-deck="1"] .stage { max-width: 330px; }
:root[data-deck="1"] .needs.decided { opacity: 0.45; }
/* The voice list: the numbered ideas in the order to record them. */
.voice { display: grid; gap: 12px; scroll-margin-top: 72px; }
.vhead { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
.vhead h3 { font-size: 17px; }
.voice-groups { display: grid; gap: 22px; }
.vgroup { border-top: 1px solid var(--ink); }
.vgroup h4 { margin: 0; padding: 10px 0; font-size: 14px; font-weight: 600; border-bottom: 1px solid var(--line); display: flex; gap: 10px; align-items: baseline; }
.vgroup h4 span { font-weight: 400; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.vrow { display: grid; grid-template-columns: 2.4em minmax(0, 1fr) auto; gap: 4px 14px; align-items: start; padding: 11px 0; border-bottom: 1px solid var(--line); }
.vn { font-size: 14px; font-weight: 500; line-height: 1.45; color: var(--ink-3); text-align: right; font-variant-numeric: tabular-nums; }
.vt { display: grid; gap: 6px; min-width: 0; }
.vtags { display: flex; flex-wrap: wrap; gap: 6px; }
.vtags .pill { padding: 0 7px; font-size: 12px; }
.vt details summary { padding-block: 1px; }
.vt .say, .vnotes .say { white-space: pre-line; max-width: 75ch; }
.vmark { display: grid; gap: 4px; justify-items: end; }
.vrow[data-done="1"] h3, .vrow[data-done="1"] .vn { color: var(--ink-3); }
:root[data-vo-hide="1"] .vrow[data-done="1"] { display: none; }
.vnotes { padding: 4px 0 10px; border-top: 1px dashed var(--line-2); }
.vnotes .say { padding-top: 8px; padding-bottom: 8px; border-top: 1px solid var(--line); }
@media (max-width: 560px) {
  h1 { font-size: 26px; }
  .funnel { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .step:nth-child(3n) { border-right: 0; }
  .step:nth-child(-n+3) { border-bottom: 1px solid var(--line); }
  .thumb { width: 51px; height: 68px; }
  .cap-row { grid-template-columns: minmax(0, 1fr) auto; }
  .cap-row .where { grid-column: 1 / -1; width: fit-content; }
  .vrow { grid-template-columns: 1.8em minmax(0, 1fr); }
  .vmark { grid-column: 2; justify-items: start; }
}
/* Desktop: the sections list becomes a sticky column on the left, the work gets the width, and paired rows read across. */
@media (min-width: 1100px) {
  body { padding-inline: 40px; padding-block: 40px 96px; }
  main { max-width: 1340px; grid-template-columns: 188px minmax(0, 1fr); column-gap: 64px; align-items: start; }
  main > * { grid-column: 2; }
  main > .jump { grid-column: 1; grid-row: 1 / span 60; position: sticky; top: 40px; align-self: start; flex-direction: column; gap: 1px; margin: 0; padding: 0; border: 0; background: none; overflow: visible; }
  .jump a { padding: 6px 10px; font-size: 14px; }
  main > header { margin-bottom: 44px; }
  h1 { font-size: 34px; }
  .list > .ask { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); column-gap: 32px; align-items: baseline; padding: 11px 12px; }
  .voice-groups { gap: 28px; }
  .vrow { grid-template-columns: 2.6em minmax(0, 1fr) auto; column-gap: 18px; }
}
@media (prefers-reduced-motion: no-preference) { .btn, .chip, .seg button, .jump a, a.ask, tbody tr td { transition: background-color 0.15s ease-out, border-color 0.15s ease-out, color 0.15s ease-out, opacity 0.15s ease-out; } }
</style>'''
a = s.index('<style>'); b = s.index('</style>', a) + len('</style>')
s = s[:a] + CSS + s[b:]
old = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;1,500&family=Source+Sans+3:wght@400;600;700&display=swap">'
assert s.count(old) == 1
s = s.replace(old, '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&family=IBM+Plex+Sans:wght@400;500;600&display=swap">')
assert '—' not in CSS and '\x00' not in s
open('index.html', 'w', encoding='utf-8').write(s)
SK = open('/root/.claude/projects/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/tool-results/artifact-8b839950-1791194761-26f7.html', encoding='utf-8').read()
open('test.html', 'w', encoding='utf-8').write(SK[:SK.index('<body>') + 6] + '\n' + s + '</body></html>')
a, b = s.index('<script>') + 8, s.index('</script>')
open('main.js', 'w', encoding='utf-8').write(s[a:b])
print('built', len(s.encode()), 'bytes')
