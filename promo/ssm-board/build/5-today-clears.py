import re
SRC = '/tmp/claude-0/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/scratchpad/clean/index.html'
s = open(SRC, encoding='utf-8').read()
def rep(old, new):
    global s
    c = s.count(old); assert c == 1, (c, old[:80]); s = s.replace(old, new)
head = '<div class="head"><h2>Today</h2><span class="sub">12 things wait on you</span></div>'
rep(head, head + '\n  <p class="dim small" id="morning-line" hidden></p>')
rep('''      paintVoiceMarks();
    }
    function paintIdeas() {''', '''      paintVoiceMarks();
      paintToday();
    }
    function paintIdeas() {''')
FUNCS = '''    // Today clears itself (Oct 8, owner: "if we posted a video, just clear off the questions for that video").
    // A question or a planned slot for a piece goes away once the store holds a post for it, whether the
    // owner marked it here or the morning check found it (posted/<piece>.<platform>). The morning check
    // leaves one line in state/morning.
    function postedOn(piece, pf) {
      return Object.keys(state.posted).some(function (k) { var d = state.posted[k] || {}; return d.piece === piece && (!pf || d.platform === pf); });
    }
    function paintToday() {
      all('#waiting a[href^="#p-"], #week a.slot[href^="#p-"]').forEach(function (a) {
        var w = a.querySelector(".where.pf"), pf = a.classList.contains("slot") && w ? String(w.getAttribute("aria-label") || "").replace(/^Posted on /, "").toLowerCase() : "";
        a.hidden = postedOn(a.getAttribute("href").slice(3), pf);
      });
      all("#waiting .card, #week .card").forEach(function (c) {
        var slots = all("a.slot", c);
        if (slots.length) c.hidden = slots.every(function (a) { return a.hidden; });
      });
      var asks = all("#waiting a.ask"), left = asks.filter(function (a) { return !a.hidden; }).length;
      var list = document.querySelector("#waiting .list"), sub = document.querySelector("#waiting .head .sub");
      if (list) list.hidden = left === 0;
      if (sub) sub.textContent = left ? left + (left === 1 ? " thing waits on you" : " things wait on you") : "Nothing waits on you";
      var m = state.state.morning, line = document.getElementById("morning-line");
      if (line) { line.hidden = !(m && m.text); line.textContent = m && m.text ? "Morning check, " + when(m.at) + ": " + String(m.text).slice(0, 300) : ""; }
    }
'''
anchor = '    // The voice list: numbered ideas in the order to record them, grouped by kind,\n'
rep(anchor, FUNCS + anchor)
rep("// before the next sync rebuilds this page, or it is lost.\n", "// before the next sync rebuilds this page, or it is lost. So is the Today clearing below (paintToday)\n// and the morning check's line, which read posted/<piece>.<platform> and state/morning.\n")
assert '—' not in FUNCS and '\x00' not in s
open('index.html', 'w', encoding='utf-8').write(s)
SK = open('/root/.claude/projects/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/tool-results/artifact-8b839950-1791194761-26f7.html', encoding='utf-8').read()
open('test.html', 'w', encoding='utf-8').write(SK[:SK.index('<body>') + 6] + '\n' + s + '</body></html>')
for n, js in enumerate(re.findall(r'<script>(.*?)</script>', s, flags=re.S)): open(f'js{n}.js', 'w', encoding='utf-8').write(js)
print('ok', len(s.encode()))
