import subprocess, sys
SRC = '/root/.claude/projects/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/tool-results/artifact-8b839950-1791194761-26f7.html'
s = open(SRC, encoding='utf-8').read()
for name in ['function mk(', 'VOICE', 'voHide', 'voiceRows', 'paintVoice', 'id="voice', 'data-vo']:
    assert name not in s, 'name already used: ' + name
def rep(old, new):
    global s
    c = s.count(old)
    assert c == 1, (c, old[:90])
    s = s.replace(old, new)

CSS = '''/* The voice list: the numbered ideas in the order to record them. Hairline rows in one panel per kind, the MP3 mark on the right. */
.voice { display: grid; gap: 12px; scroll-margin-top: 64px; }
.vhead { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
.vhead h3 { font-size: 16px; }
.voice-groups { display: grid; gap: 12px; }
.vgroup { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; }
.vgroup h4 { margin: 0; padding: 10px 14px; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); border-bottom: 1px solid var(--line); }
.vrow { display: grid; grid-template-columns: 2.2em minmax(0, 1fr) auto; gap: 4px 12px; align-items: start; padding: 12px 14px; border-bottom: 1px solid var(--line); }
.vrow:last-child { border-bottom: 0; }
.vn { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--violet-ink); text-align: right; line-height: 1.45; }
.vt { display: grid; gap: 6px; min-width: 0; }
.vtags { display: flex; flex-wrap: wrap; gap: 6px; }
.vtags .pill { padding: 2px 9px; font-size: 12px; }
.vt details summary { padding-block: 2px; }
.vt .say, .vnotes .say { white-space: pre-line; max-width: 70ch; }
.vmark { display: grid; gap: 4px; justify-items: end; }
.vrow[data-done="1"] h3, .vrow[data-done="1"] .vn { color: var(--ink-3); }
.vrow[data-done="1"] .btn[aria-pressed="true"] { background: var(--good-soft); border-color: transparent; color: var(--good); }
:root[data-vo-hide="1"] .vrow[data-done="1"] { display: none; }
.vnotes { padding: 2px 14px 10px; border: 1px dashed var(--line); border-radius: var(--r); }
.vnotes .say { padding-block: 8px; border-top: 1px solid var(--line); }
@media (max-width: 560px) {
  .vrow { grid-template-columns: 1.8em minmax(0, 1fr); }
  .vmark { grid-column: 2; justify-items: start; }
}
'''
rep('</style>\n<main>', CSS + '</style>\n<main>')

rep('<a href="#ideas">🧠 Ideas</a>', '<a href="#ideas">🧠 Ideas</a><a href="#voice">🎙️ Voice list</a>')

HTML = '''  <div class="voice" id="voice">
    <div class="vhead"><h3>🎙️ Voice list</h3><span class="dim small" id="voice-count"></span><button class="btn small live-only" type="button" data-act="vo-hide" aria-pressed="false">Hide recorded</button></div>
    <p class="say">Every idea, numbered in the order to record. Tap the mic when its MP3 is done. What to say sits under each one.</p>
    <p class="dim small" id="voice-empty">The list loads from the board's store when the page is open and signed in.</p>
    <div class="voice-groups" id="voice-groups"></div>
  </div>
'''
head = '  <div class="head"><h2>🧠 Ideas</h2><span class="sub">say one in chat, or type it here</span></div>\n'
rep(head, head + HTML)

rep("// to learn from and the app's week.\n", """// to learn from and the app's week.
//
// The voice list was added on Oct 8 by a session with no access to purify-ads, so
// it is not in ssm/ yet: the ideas a session has numbered (n, kind, hook, pf, pick,
// clergy and items on the ideas documents) in the order to record them, each with
// an MP3 mark kept as state/vo.<idea> or state/vo.<idea>.<item>. Port it into ssm/
// before the next sync rebuilds this page, or it is lost.
""")

rep('''      state.ideas = s.docs.map(function (d) { var x = d.data() || {}; return { text: String(x.text || ""), at: x.at, filed: !!x.filed }; });''',
    '''      state.ideas = s.docs.map(function (d) { var x = d.data() || {}; return { id: d.id, text: String(x.text || ""), at: x.at, filed: !!x.filed, n: Number(x.n) || 0, kind: String(x.kind || ""), hook: String(x.hook || ""), pf: Array.isArray(x.pf) ? x.pf.map(String) : [], pick: !!x.pick, clergy: !!x.clergy, items: Array.isArray(x.items) ? x.items : null }; });''')

rep('''      state.ideas.filter(function (i) { return !i.filed && i.text; }).forEach(function (i) {''',
    '''      state.ideas.filter(function (i) { return !i.filed && i.text && !i.n && !i.kind; }).forEach(function (i) {''')

rep('''        row.appendChild(h); row.appendChild(p); list.appendChild(row);
      });
    }
''', '''        row.appendChild(h); row.appendChild(p); list.appendChild(row);
      });
      paintVoice();
    }
''')

rep('''      });
    }
    function paintIdeas() {''', '''      });
      paintVoiceMarks();
    }
    function paintIdeas() {''')

FUNCS = '''    // The voice list: numbered ideas in the order to record them, grouped by kind,
    // each with its MP3 mark. Built when the ideas change; the marks repaint alone.
    var VOICE = [["myth", "🔎 Myth Busts"], ["series", "🔁 Series"], ["history", "📜 History and saints"], ["shorts", "🎓 Shorts explainers"], ["long", "📺 Long form"]];
    var voHide = kept("ssm.voHide") === "1";
    function voiceRows() {
      var out = [];
      state.ideas.forEach(function (i) {
        if (i.kind === "note") return;
        if (i.items) {
          i.items.forEach(function (x, k) {
            x = x || {};
            if (Number(x.n) > 0) out.push({ key: i.id + "." + k, n: Number(x.n), kind: i.kind, hook: String(x.hook || ""), pf: Array.isArray(x.pf) ? x.pf.map(String) : [], pick: !!x.pick, clergy: !!x.clergy, text: i.text });
          });
        } else if (i.n > 0) out.push({ key: i.id, n: i.n, kind: i.kind, hook: i.hook || i.text, pf: i.pf, pick: i.pick, clergy: i.clergy, text: i.text });
      });
      return out.sort(function (a, b) { return a.n - b.n; });
    }
    function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
    function paintVoice() {
      var box = document.getElementById("voice-groups");
      if (!box) return;
      var rows = voiceRows(), notes = state.ideas.filter(function (i) { return i.kind === "note" && i.text; }), known = {};
      box.textContent = "";
      var empty = document.getElementById("voice-empty"), none = document.querySelector("#ideas > .empty");
      if (empty) empty.hidden = rows.length > 0;
      if (none) none.hidden = rows.length > 0;
      VOICE.forEach(function (g) { known[g[0]] = true; });
      VOICE.concat([["", "More ideas"]]).forEach(function (g) {
        var mine = rows.filter(function (r) { return g[0] ? r.kind === g[0] : !known[r.kind]; });
        if (!mine.length) return;
        var group = mk("div", "vgroup");
        group.appendChild(mk("h4", "", g[1] + " · " + mine.length));
        mine.forEach(function (r) {
          var row = mk("div", "vrow"), body = mk("div", "vt"), tags = mk("div", "vtags"), say = mk("details"), mark = mk("div", "vmark");
          row.setAttribute("data-vo", r.key);
          r.pf.forEach(function (p) { tags.appendChild(mk("span", "pill", p)); });
          if (r.clergy) tags.appendChild(mk("span", "pill warn", "Clergy check first"));
          say.appendChild(mk("summary", "", "What to say"));
          say.appendChild(mk("p", "say", r.text));
          body.appendChild(mk("h3", "", (r.pick ? "⭐ " : "") + r.hook));
          body.appendChild(tags);
          body.appendChild(say);
          var b = mk("button", "btn small", "🎙️ Mark recorded"), msg = mk("span", "msg");
          b.type = "button"; b.setAttribute("data-act", "vo"); b.setAttribute("aria-pressed", "false");
          msg.setAttribute("role", "status");
          mark.appendChild(b); mark.appendChild(msg);
          row.appendChild(mk("span", "vn", String(r.n))); row.appendChild(body); row.appendChild(mark);
          group.appendChild(row);
        });
        box.appendChild(group);
      });
      if (notes.length) {
        var d = mk("details", "vnotes");
        d.appendChild(mk("summary", "", "🗂️ Notes and rules for the edits · " + notes.length));
        notes.forEach(function (i) { d.appendChild(mk("p", "say", i.text)); });
        box.appendChild(d);
      }
      paintVoiceMarks();
    }
    function paintVoiceMarks() {
      var rows = all("#voice-groups [data-vo]"), done = 0;
      rows.forEach(function (row) {
        var d = state.state["vo." + row.getAttribute("data-vo")], on = !!(d && d.done);
        if (on) done++;
        row.setAttribute("data-done", on ? "1" : "0");
        var b = row.querySelector('button[data-act="vo"]');
        if (b) { b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "✅ Recorded" : "🎙️ Mark recorded"; }
      });
      all("#voice-groups .vgroup").forEach(function (g) { g.hidden = voHide && !g.querySelector('[data-done="0"]'); });
      var c = document.getElementById("voice-count");
      if (c) c.textContent = rows.length ? done + " of " + rows.length + " recorded" : "";
      root.setAttribute("data-vo-hide", voHide ? "1" : "0");
      var h = document.querySelector('button[data-act="vo-hide"]');
      if (h) h.setAttribute("aria-pressed", String(voHide));
    }
'''
anchor = '    // What he has added that is not on the books yet, shown under the box it was added in.\n'
rep(anchor, FUNCS + anchor)

rep('''        add("log", week, ab, function () { ai[0].value = ""; ai[1].value = ""; });
      }
    });''', '''        add("log", week, ab, function () { ai[0].value = ""; ai[1].value = ""; });
      } else if (kind === "vo") {
        var vb = act.closest("[data-vo]"), vk = vb.getAttribute("data-vo"), vwas = state.state["vo." + vk] || {};
        save("state/vo." + vk, { kind: "vo", idea: vk, done: !vwas.done, at: now(), filed: false }, vb);
      } else if (kind === "vo-hide") {
        voHide = !voHide;
        kept("ssm.voHide", voHide ? "1" : "0");
        paintVoiceMarks();
      }
    });''')

assert '—' not in CSS + HTML + FUNCS
open('test.html', 'w', encoding='utf-8').write(s)
assert s.startswith('<!doctype html><html><head>')
i = s.index('<body>') + len('<body>')
assert i < 700, i
body = s[i:].lstrip('\n')
assert body.endswith('</body></html>')
body = body[:-len('</body></html>')]
assert body.startswith('<title>Purify SSM Board</title>')
open('index.html', 'w', encoding='utf-8').write(body)
a, b = s.index('<script>') + len('<script>'), s.index('</script>')
open('main.js', 'w', encoding='utf-8').write(s[a:b])
print('patched; publish file', len(body.encode()), 'bytes;', s.count('<script'), 'script tag(s)')
