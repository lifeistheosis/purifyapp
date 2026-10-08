import re
s = open('../modal/index.html', encoding='utf-8').read()
def rep(old, new):
    global s
    c = s.count(old); assert c == 1, (c, old[:90]); s = s.replace(old, new)
rep('<div class="card stack"><h3>19 things need a yes or a no</h3>', '<div class="stack decide-card"><h3>19 things need a yes or a no</h3>')
rep('<button class="btn big" type="button" data-act="deck-on">Go through them</button><span class="dim small" id="deck-count"></span>',
    '<button class="btn big" type="button" data-act="deck-on">Go through them <span class="btn-n" id="decide-n" hidden></span></button><button class="btn big alt" type="button" data-act="questions" hidden>Questions for you <span class="btn-n" id="ask-n"></span></button><span class="dim small" id="deck-count"></span>')
CSS = '''
/* Today, cleaner (owner, Oct 8): the list moves behind two buttons, each opening the pop-up. */
#waiting .list, #waiting .head .sub, #deck-count { display: none !important; }
.decide-card { padding: 0; }
.decide-card > h3, .decide-card > .say { display: none !important; }
.decide-card .row { gap: 12px; }
.btn.big { display: inline-flex; align-items: center; gap: 10px; min-height: 52px; padding: 12px 22px; font-size: 16px; }
.btn.big.alt { background: var(--bg); color: var(--ink); border-color: var(--line-2); }
.btn.big.alt:hover { border-color: var(--ink); opacity: 1; }
.btn-n { display: inline-grid; place-items: center; min-width: 26px; height: 24px; padding: 0 8px; border-radius: 999px; font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; background: color-mix(in srgb, currentColor 18%, transparent); }
.rv-item.solo { grid-template-columns: minmax(0, 1fr); max-width: 640px; }
.rv-item.solo h3 { font-size: 26px; }
'''
rep('\n</style>', CSS + '</style>')
rep('  var list = [], at = 0, busy = false, chosen = {};', '  var list = [], at = 0, busy = false, chosen = {}, mode = "decide", titleEl = dlg.querySelector("#rv-title");')
rep('  function done(el) { return el.classList.contains("decided") || !!chosen[el.id]; }',
    '  function done(el) { return mode === "ask" ? false : el.classList.contains("decided") || !!chosen[el.id]; }')
rep('''    count.textContent = (at + 1) + " of " + list.length + ", " + left() + " left";
    bar.style.width = (list.length ? (list.length - left()) / list.length * 100 : 0) + "%";''',
    '''    count.textContent = (at + 1) + " of " + list.length + (mode === "ask" ? "" : ", " + left() + " left");
    bar.style.width = (list.length ? (mode === "ask" ? (at + 1) / list.length : (list.length - left()) / list.length) * 100 : 0) + "%";''')
rep('''  function build(el) {
    var frag''', '''  // The questions are Today's other asks (owner, Oct 8: "remove it from the Today screen ... leave it in the buttons").
  // One that is the same piece as a card in Go through them, or ssm's summary of those cards, is left out.
  function asks() {
    return qa("#waiting .list a.ask").filter(function (a) {
      if (a.hidden) return false;
      var h = a.getAttribute("href") || "", t = (q("h3", a) || {}).textContent || "", target = h.length > 1 ? document.getElementById(h.slice(1)) : null;
      if (target && target.classList.contains("needs")) return false;
      return !/need your call|are with you/i.test(t);
    });
  }
  function buildAsk(a) {
    var frag = document.createDocumentFragment(), body = mk("div", "rv-body"), h = q("h3", a), p = q("p", a), row = mk("div", "rv-choices"), b = mk("button", "btn", "Open it");
    body.appendChild(mk("h3", "", h ? h.textContent.trim() : ""));
    if (p) body.appendChild(mk("p", "rv-why", p.textContent.trim()));
    b.type = "button";
    b.addEventListener("click", function () { close(); setTimeout(function () { a.click(); }, 240); });
    row.appendChild(b); body.appendChild(row); frag.appendChild(body);
    return frag;
  }
  function build(el) {
    if (mode === "ask") return buildAsk(el);
    var frag''')
rep('  function render(i) { at = i; item.textContent = ""; item.appendChild(build(list[i])); state(); }',
    '  function render(i) { at = i; item.textContent = ""; item.classList.toggle("solo", mode === "ask"); item.appendChild(build(list[i])); state(); }')
rep('''  function open() {
    list = qa(".needs");
    if (!list.length) return;
    chosen = {}; item.textContent = "";
    var first = openAfter(-1);''', '''  function open(m) {
    mode = m || "decide";
    list = mode === "ask" ? asks() : qa(".needs");
    if (!list.length) return;
    titleEl.textContent = mode === "ask" ? "Questions for you" : "Going through them";
    chosen = {}; item.textContent = "";
    var first = mode === "ask" ? 0 : openAfter(-1);''')
rep('''    var b = e.target.closest ? e.target.closest('[data-act="deck-on"]') : null;
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation(); open();
  }, true);''', '''    var b = e.target.closest ? e.target.closest('[data-act="deck-on"], [data-act="questions"]') : null;
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation(); open(b.getAttribute("data-act") === "questions" ? "ask" : "decide");
  }, true);
  // The counts on Today's two buttons follow the board: a choice, a post record, or an ask cleared.
  function counts() {
    var d = document.getElementById("decide-n"), k = document.getElementById("ask-n"), qb = k && k.closest("button");
    var nd = qa(".needs").filter(function (e) { return !e.classList.contains("decided"); }).length, na = asks().length;
    if (d) { if (d.textContent !== String(nd)) d.textContent = String(nd); if (d.hidden !== !nd) d.hidden = !nd; }
    if (k && k.textContent !== String(na)) k.textContent = String(na);
    if (qb && qb.hidden !== !na) qb.hidden = !na;
  }
  counts();
  if (window.MutationObserver) new MutationObserver(counts).observe(document.querySelector("main"), { subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });''')
assert '—' not in CSS and '\x00' not in s
open('index.html', 'w', encoding='utf-8').write(s)
SK = open('/root/.claude/projects/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/tool-results/artifact-8b839950-1791194761-26f7.html', encoding='utf-8').read()
open('test.html', 'w', encoding='utf-8').write(SK[:SK.index('<body>') + 6] + '\n' + s + '</body></html>')
for n, js in enumerate(re.findall(r'<script>(.*?)</script>', s, flags=re.S)): open(f'js{n}.js', 'w', encoding='utf-8').write(js)
print('ok')
