import re
s = open('../yesno/index.html', encoding='utf-8').read()
def rep(old, new):
    global s
    c = s.count(old); assert c == 1, (c, old[:80]); s = s.replace(old, new)
rep('<div class="head"><h2>Today</h2><span class="sub">12 things wait on you</span></div>',
    '<div class="head"><h2>Today</h2><div class="ts" id="today-stats" aria-live="off"><span class="ts-frame"></span></div><span class="sub">12 things wait on you</span></div>')
CSS = '''
/* Today: a bigger title, with the board's own numbers going in and out beside it (owner, Oct 8). */
#waiting .head { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: baseline; column-gap: 28px; row-gap: 6px; }
#waiting .head h2 { font-size: 46px; line-height: 1.05; letter-spacing: -0.035em; }
#waiting .head .sub { grid-column: 1 / -1; font-size: 14px; }
.ts { min-height: 1.4em; font-size: 20px; line-height: 1.4; color: var(--ink-2); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ts b { color: var(--ink); font-weight: 600; }
.ts .ico { width: 19px; height: 19px; vertical-align: -3px; margin-right: 6px; color: var(--ink); }
.ts .ico ~ .ico { margin-left: 16px; }
.ts-frame { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; vertical-align: bottom; }
.ts-frame.in { animation: ts-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
.ts-frame.out { animation: ts-out 0.3s cubic-bezier(0.7, 0, 0.84, 0) both; }
@keyframes ts-in { from { opacity: 0; transform: translateY(12px); filter: blur(3px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes ts-out { from { opacity: 1; transform: none; filter: none; } to { opacity: 0; transform: translateY(-12px); filter: blur(3px); } }
@media (prefers-reduced-motion: reduce) { .ts-frame.in, .ts-frame.out { animation: none; } }
@media (max-width: 700px) {
  #waiting .head { grid-template-columns: minmax(0, 1fr); }
  #waiting .head h2 { font-size: 38px; }
  .ts { font-size: 17px; }
}
'''
rep('\n</style>', CSS + '</style>')
JS = '''<script>
// Today's numbers (Oct 8, owner: "a looping animation ... different stats that just go in and out ... next to the Today").
// Every number is read from the board itself: the post table, the account cards, the pieces in the works and the
// voice list, so it stays true after each sync. It pauses under the pointer and in a hidden tab, and holds still
// for anyone who asked their device for reduced motion.
(function () {
  var box = document.getElementById("today-stats"), frame = box && box.querySelector(".ts-frame");
  if (!frame) return;
  function num(t) { var d = String(t || "").replace(/[^0-9]/g, ""); return d ? parseInt(d, 10) : 0; }
  function fmt(n) { return Number(n).toLocaleString("en-US"); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function line(bold, rest) { return function () { return [el("b", "", bold), document.createTextNode(rest)]; }; }
  var frames = [];
  var table = document.querySelector("#posts table");
  if (table) {
    var heads = Array.prototype.map.call(table.querySelectorAll("th"), function (th) { return th.textContent.trim().toLowerCase(); });
    var col = function (name) { return heads.indexOf(name); }, iV = col("views"), iL = col("likes"), iP = col("post"), iD = col("posted");
    var rows = Array.prototype.filter.call(table.querySelectorAll("tr"), function (tr) { return tr.querySelector("td"); });
    var views = 0, likes = 0, best = 0, bestName = "", last = 0, year = new Date().getFullYear();
    rows.forEach(function (tr) {
      var td = tr.querySelectorAll("td"), v = iV >= 0 && td[iV] ? num(td[iV].textContent) : 0;
      views += v;
      if (iL >= 0 && td[iL]) likes += num(td[iL].textContent);
      if (v > best) { best = v; bestName = iP >= 0 && td[iP] ? td[iP].textContent.trim() : ""; }
      var m = iD >= 0 && td[iD] ? td[iD].textContent.match(/([A-Z][a-z]{2}) (\\d{1,2})/) : null, t = m ? Date.parse(m[1] + " " + m[2] + ", " + year) : NaN;
      if (t && t <= Date.now() && t > last) last = t;
    });
    if (views) frames.push(line(fmt(views), " views so far"));
    if (likes) frames.push(line(fmt(likes), " likes so far"));
    if (best) frames.push(function () { var b = el("b", "", fmt(best) + " views"); var n = [document.createTextNode("Best post pulled "), b]; if (bestName) n.push(document.createTextNode(", " + bestName.slice(0, 48) + (bestName.length > 48 ? "\\u2026" : ""))); return n; });
    if (rows.length) frames.push(line(fmt(rows.length), " posts on record"));
    if (last) frames.push(function () { var days = Math.floor((Date.now() - last) / 86400000); return [el("b", "", fmt(days) + (days === 1 ? " day" : " days")), document.createTextNode(" since the last post")]; });
  }
  var cards = Array.prototype.slice.call(document.querySelectorAll("#accounts .card")).map(function (c) {
    var p = c.querySelector(".pfh"), h = c.querySelector(".hero");
    return p && h ? { pf: (p.getAttribute("aria-label") || "").toLowerCase(), name: p.getAttribute("aria-label"), n: num(h.textContent) } : null;
  }).filter(Boolean);
  if (cards.length) {
    var total = cards.reduce(function (a, c) { return a + c.n; }, 0);
    frames.splice(1, 0, line(fmt(total), " followers"));
    frames.splice(2, 0, function () {
      var out = [];
      cards.forEach(function (c) { var i = el("i", "ico ico-" + c.pf); i.setAttribute("role", "img"); i.setAttribute("aria-label", c.name); out.push(i, el("b", "", fmt(c.n))); });
      out.push(document.createTextNode(" followers"));
      return out;
    });
  }
  var works = document.querySelectorAll("#works .piece").length;
  if (works) frames.push(line(fmt(works), works === 1 ? " piece in the works" : " pieces in the works"));
  frames.push(function () {
    var m = (document.getElementById("voice-count") || {}).textContent;
    m = m && m.match(/(\\d+) of (\\d+)/);
    return m ? [el("b", "", m[1] + " of " + m[2]), document.createTextNode(" voice lines recorded")] : null;
  });
  if (!frames.length) { box.hidden = true; return; }
  var at = 0, paused = false;
  function show(i, animate) {
    for (var k = 0; k < frames.length; k++) {
      var nodes = frames[(i + k) % frames.length]();
      if (nodes) { at = (i + k) % frames.length; frame.textContent = ""; nodes.forEach(function (n) { frame.appendChild(n); }); break; }
    }
    frame.classList.remove("out");
    if (animate) { frame.classList.remove("in"); void frame.offsetWidth; frame.classList.add("in"); }
  }
  function next() {
    if (paused || document.hidden) { setTimeout(next, 700); return; }
    frame.classList.remove("in"); frame.classList.add("out");
    setTimeout(function () { show(at + 1, true); setTimeout(next, 3600); }, 300);
  }
  show(0, false);
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!still && frames.length > 1) setTimeout(next, 3600);
  box.addEventListener("mouseenter", function () { paused = true; });
  box.addEventListener("mouseleave", function () { paused = false; });
})();
</script>'''
i = s.rindex('</script>') + len('</script>')
s = s[:i] + '\n' + JS + s[i:]
assert '—' not in CSS + JS and '\x00' not in s
open('index.html', 'w', encoding='utf-8').write(s)
SK = open('/root/.claude/projects/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/tool-results/artifact-8b839950-1791194761-26f7.html', encoding='utf-8').read()
open('test.html', 'w', encoding='utf-8').write(SK[:SK.index('<body>') + 6] + '\n' + s + '</body></html>')
for n, js in enumerate(re.findall(r'<script>(.*?)</script>', s, flags=re.S)): open(f'js{n}.js', 'w', encoding='utf-8').write(js)
print('ok')
