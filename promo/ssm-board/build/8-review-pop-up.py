import re
s = open('../stats/index.html', encoding='utf-8').read()
def rep(old, new):
    global s
    c = s.count(old); assert c == 1, (c, old[:80]); s = s.replace(old, new)
CSS = '''
/* Going through them: one card at a time in the middle of the screen (owner, Oct 8), in place of the list. */
dialog.rv { padding: 16px; border: 0; margin: 0; background: transparent; width: 100%; height: 100%; max-width: none; max-height: none; color: var(--ink); overflow: hidden; }
dialog.rv[open] { display: grid; place-items: center; }
dialog.rv::backdrop { background: rgba(10, 10, 10, 0.5); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.rv-card { width: min(900px, 100%); max-height: calc(100dvh - 32px); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; background: var(--bg); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 28px 70px -18px rgba(0, 0, 0, 0.45); overflow: hidden; }
.rv-top { display: flex; align-items: center; gap: 14px; padding: 14px 14px 14px 20px; border-bottom: 1px solid var(--line); }
.rv-top h2 { font-size: 16px; white-space: nowrap; }
.rv-count { font-size: 13px; color: var(--ink-3); font-variant-numeric: tabular-nums; white-space: nowrap; }
.rv-bar { flex: 1; height: 3px; min-width: 40px; background: var(--panel-2); border-radius: 2px; overflow: hidden; }
.rv-bar i { display: block; height: 100%; width: 0; background: var(--ink); transition: width 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.rv-x { appearance: none; border: 0; background: none; color: var(--ink-2); width: 38px; height: 38px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; flex: none; }
.rv-x:hover { background: var(--panel-2); color: var(--ink); }
.rv-x:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.rv-card:focus { outline: none; }
.rv-stage { overflow: auto; padding: 24px; }
.rv-item { display: grid; grid-template-columns: minmax(180px, 290px) minmax(0, 1fr); gap: 28px; align-items: start; }
.rv-media video, .rv-media img { display: block; width: 100%; aspect-ratio: 9 / 16; object-fit: cover; border-radius: 10px; background: #000; }
.rv-body { display: grid; gap: 12px; align-content: start; min-width: 0; }
.rv-body h3 { font-size: 23px; line-height: 1.25; letter-spacing: -0.015em; }
.rv-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: var(--ink-3); font-size: 13px; }
.rv-why { color: var(--ink-2); font-size: 15px; line-height: 1.6; max-width: 62ch; }
.rv-stat { color: var(--ink-3); font-size: 13px; }
.rv-hooks { display: grid; gap: 6px; }
.rv-hook { display: flex; gap: 10px; align-items: center; justify-content: space-between; padding: 8px 8px 8px 12px; border: 1px solid var(--line); border-radius: 8px; font-size: 13.5px; }
.rv-choices { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 6px; }
.rv-choices .btn { min-height: 46px; padding: 10px 22px; font-size: 15px; }
.rv-note { display: flex; flex-wrap: wrap; gap: 8px; }
.rv-note input { flex: 1 1 200px; }
.rv-state { font-size: 13px; color: var(--ink-3); min-height: 1.4em; }
.rv-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--line); }
.rv-foot .dim { text-align: center; }
.rv-done { display: grid; gap: 12px; justify-items: center; text-align: center; padding: 56px 16px; }
.rv-done h3 { font-size: 26px; letter-spacing: -0.02em; }
dialog.rv[open] .rv-card { animation: rv-in 0.42s cubic-bezier(0.16, 1, 0.3, 1) both; }
dialog.rv[open]::backdrop { animation: rv-fade 0.3s ease-out both; }
dialog.rv.closing .rv-card { animation: rv-out 0.22s cubic-bezier(0.7, 0, 0.84, 0) both; }
dialog.rv.closing::backdrop { animation: rv-fade-out 0.22s ease-in both; }
.rv-item.enter-next { animation: rv-next-in 0.38s cubic-bezier(0.16, 1, 0.3, 1) both; }
.rv-item.leave-next { animation: rv-next-out 0.2s cubic-bezier(0.7, 0, 0.84, 0) both; }
.rv-item.enter-prev { animation: rv-prev-in 0.38s cubic-bezier(0.16, 1, 0.3, 1) both; }
.rv-item.leave-prev { animation: rv-prev-out 0.2s cubic-bezier(0.7, 0, 0.84, 0) both; }
@keyframes rv-in { from { opacity: 0; transform: translateY(18px) scale(0.97); } to { opacity: 1; transform: none; } }
@keyframes rv-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(12px) scale(0.98); } }
@keyframes rv-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes rv-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes rv-next-in { from { opacity: 0; transform: translateX(32px); filter: blur(3px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes rv-next-out { from { opacity: 1; transform: none; filter: none; } to { opacity: 0; transform: translateX(-32px); filter: blur(3px); } }
@keyframes rv-prev-in { from { opacity: 0; transform: translateX(-32px); filter: blur(3px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes rv-prev-out { from { opacity: 1; transform: none; filter: none; } to { opacity: 0; transform: translateX(32px); filter: blur(3px); } }
@media (prefers-reduced-motion: reduce) { dialog.rv[open] .rv-card, dialog.rv[open]::backdrop, dialog.rv.closing .rv-card, .rv-item { animation: none !important; } .rv-bar i { transition: none; } }
@media (max-width: 720px) {
  .rv-stage { padding: 16px; }
  .rv-item { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .rv-media { width: 100%; max-width: 200px; justify-self: center; }
  .rv-foot .dim { display: none; }
}
'''
rep('\n</style>', CSS + '</style>')
X = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
HTML = f'''<dialog class="rv" id="review" aria-labelledby="rv-title">
  <div class="rv-card" tabindex="-1">
    <div class="rv-top"><h2 id="rv-title">Going through them</h2><span class="rv-count"></span><div class="rv-bar" aria-hidden="true"><i></i></div><button class="rv-x" type="button" aria-label="Close">{X}</button></div>
    <div class="rv-stage"><div class="rv-item"></div></div>
    <div class="rv-foot"><button class="btn" type="button" data-rv="prev">Previous</button><span class="dim small">Arrow keys move, Esc closes</span><button class="btn" type="button" data-rv="next">Next</button></div>
  </div>
</dialog>
</main>'''
rep('</main>', HTML)
JS = '''<script>
// Going through them (Oct 8, owner: "instead of a checklist ... make it a pop-up ... its own card popped up in the middle
// ... animations going in and out, very smooth"). One card for each thing that needs a yes or no. Its buttons press the
// piece's own buttons, so every choice saves through the board's store exactly as before: nothing here writes on its own.
(function () {
  var dlg = document.getElementById("review");
  if (!dlg || typeof dlg.showModal !== "function") return;
  var root = document.documentElement, card = dlg.querySelector(".rv-card"), item = dlg.querySelector(".rv-item"), count = dlg.querySelector(".rv-count"), bar = dlg.querySelector(".rv-bar i");
  var prev = dlg.querySelector('[data-rv="prev"]'), next = dlg.querySelector('[data-rv="next"]');
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var list = [], at = 0, busy = false, chosen = {};
  function q(sel, el) { return (el || document).querySelector(sel); }
  function qa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function live() { return root.getAttribute("data-live") === "1"; }
  function done(el) { return el.classList.contains("decided") || !!chosen[el.id]; }
  function left() { return list.filter(function (e) { return !done(e); }).length; }
  function header() {
    count.textContent = (at + 1) + " of " + list.length + ", " + left() + " left";
    bar.style.width = (list.length ? (list.length - left()) / list.length * 100 : 0) + "%";
    prev.disabled = at <= 0; next.disabled = at >= list.length - 1;
  }
  function openAfter(from) { for (var k = 1; k <= list.length; k++) { var j = (from + k) % list.length; if (!done(list[j])) return j; } return -1; }
  function state() {
    var el = list[at], st = q(".rv-state", item), box = el && q("[data-decide]", el);
    if (st && box) { var m = q(".msg", box), s = q(".state", box), mt = m ? m.textContent : ""; st.textContent = mt && mt !== "Saved" && mt !== "Saving" ? mt : (s ? s.textContent : ""); }
    header();
  }
  function build(el) {
    var frag = document.createDocumentFragment(), media = mk("div", "rv-media"), body = mk("div", "rv-body");
    var v = q("video", el), img = q("img.thumb", el);
    if (v) {
      var nv = document.createElement("video");
      nv.controls = true; nv.playsInline = true; nv.preload = "metadata"; nv.src = v.getAttribute("src");
      if (v.getAttribute("poster")) nv.poster = v.getAttribute("poster");
      media.appendChild(nv);
    } else if (img) { var ni = document.createElement("img"); ni.src = img.getAttribute("src"); ni.alt = ""; media.appendChild(ni); }
    var title = q("h3, .t", el);
    body.appendChild(mk("h3", "", title ? title.textContent.trim() : ""));
    var meta = mk("div", "rv-meta"), m = q(".m", el), date = m && q(".dim.small", m), kind = q(".pill.quiet", el);
    if (date) meta.appendChild(mk("span", "", date.textContent.trim()));
    if (kind) meta.appendChild(mk("span", "pill", kind.textContent.trim()));
    qa(".where.pf", el).forEach(function (w) { meta.appendChild(w.cloneNode(true)); });
    body.appendChild(meta);
    var why = q(".why", el) || q(".body > p.say", el);
    if (why) body.appendChild(mk("p", "rv-why", why.textContent.trim()));
    var stat = qa("span.dim.small", el).filter(function (x) { return !m || x.parentNode !== m; })[0];
    if (stat && q(".why", el)) body.appendChild(mk("p", "rv-stat", stat.textContent.trim()));
    var hooks = qa("[data-hooks] .hook", el);
    if (hooks.length) {
      var hb = mk("div", "rv-hooks");
      hb.appendChild(mk("p", "rv-stat", "Pick an opening line"));
      hooks.forEach(function (h) {
        var row = mk("div", "rv-hook"), cap = q(".cap", h), ob = q("button[data-hook]", h);
        row.appendChild(mk("span", "", cap ? cap.textContent.trim() : ""));
        if (ob && live()) {
          var b = mk("button", "btn small", "Pick"); b.type = "button"; b.setAttribute("aria-pressed", ob.getAttribute("aria-pressed") || "false");
          b.addEventListener("click", function () { ob.click(); qa(".rv-hook .btn", hb).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); setTimeout(state, 700); });
          row.appendChild(b);
        }
        hb.appendChild(row);
      });
      body.appendChild(hb);
    }
    var box = q("[data-decide]", el);
    if (box && live()) {
      var ch = mk("div", "rv-choices");
      qa("button[data-choice]", box).forEach(function (ob) {
        var b = mk("button", "btn", ob.textContent.trim()); b.type = "button"; b.setAttribute("aria-pressed", ob.getAttribute("aria-pressed") || "false");
        b.addEventListener("click", function () {
          if (busy) return;
          ob.click(); chosen[el.id] = true;
          qa("button", ch).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
          header();
          if (ob.getAttribute("data-choice") === "changes") {
            var ni = q(".rv-note input", item);
            if (ni) { ni.placeholder = "What should change?"; ni.focus(); setTimeout(state, 700); return; }
          }
          setTimeout(function () { state(); var n = openAfter(at); if (n === -1) finish(); else go(n, 1); }, 650);
        });
        ch.appendChild(b);
      });
      body.appendChild(ch);
      var oin = q("input", box), onote = q('button[data-act="note"]', box);
      if (oin && onote) {
        var row = mk("div", "rv-note"), inp = mk("input"), sb = mk("button", "btn small", "Save note");
        inp.type = "text"; inp.maxLength = 400; inp.placeholder = "A note, if you like"; inp.value = oin.value; inp.setAttribute("aria-label", oin.getAttribute("aria-label") || "A note");
        sb.type = "button";
        var send = function () {
          oin.value = inp.value; onote.click();
          setTimeout(function () { state(); if (chosen[el.id] && !busy) { var n = openAfter(at); if (n === -1) finish(); else go(n, 1); } }, 700);
        };
        sb.addEventListener("click", send);
        inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); send(); } });
        row.appendChild(inp); row.appendChild(sb); body.appendChild(row);
      }
      body.appendChild(mk("p", "rv-state", ""));
    } else body.appendChild(mk("p", "rv-state", "Open the board signed in to answer."));
    frag.appendChild(media); frag.appendChild(body);
    return frag;
  }
  function render(i) { at = i; item.textContent = ""; item.appendChild(build(list[i])); state(); }
  function animate(cls, then) {
    if (still) { then(); return; }
    var t = setTimeout(end, 450);
    function end() { clearTimeout(t); item.removeEventListener("animationend", end); item.classList.remove(cls); then(); }
    item.classList.add(cls); item.addEventListener("animationend", end);
  }
  function stop() { var v = q("video", item); if (v) v.pause(); }
  function go(i, dir) {
    if (busy || i < 0 || i >= list.length || i === at && item.firstChild) return;
    busy = true; stop();
    animate(dir > 0 ? "leave-next" : "leave-prev", function () { render(i); card.focus({ preventScroll: true }); animate(dir > 0 ? "enter-next" : "enter-prev", function () { busy = false; }); });
  }
  function finish() {
    busy = true; stop();
    animate("leave-next", function () {
      item.textContent = "";
      var d = mk("div", "rv-done"), c = mk("button", "btn big", "Close");
      d.appendChild(mk("h3", "", "All done"));
      d.appendChild(mk("p", "rv-why", "Nothing is left to go through. Your answers are saved on the board."));
      c.type = "button"; c.addEventListener("click", close); d.appendChild(c);
      item.appendChild(d);
      count.textContent = list.length + " of " + list.length + ", 0 left"; bar.style.width = "100%"; prev.disabled = true; next.disabled = true;
      animate("enter-next", function () { busy = false; c.focus(); });
    });
  }
  function open() {
    list = qa(".needs");
    if (!list.length) return;
    chosen = {}; item.textContent = "";
    var first = openAfter(-1);
    render(first === -1 ? 0 : first);
    dlg.classList.remove("closing");
    dlg.showModal();
    card.focus({ preventScroll: true });
  }
  function close() {
    stop();
    if (still) { dlg.close(); return; }
    dlg.classList.add("closing");
    setTimeout(function () { dlg.classList.remove("closing"); dlg.close(); }, 220);
  }
  dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
  dlg.querySelector(".rv-x").addEventListener("click", close);
  prev.addEventListener("click", function () { go(at - 1, -1); });
  next.addEventListener("click", function () { go(at + 1, 1); });
  document.addEventListener("keydown", function (e) {
    if (!dlg.open || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1, 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1, -1); }
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest('[data-act="deck-on"]') : null;
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation(); open();
  }, true);
})();
</script>'''
i = s.rindex('</script>') + len('</script>')
s = s[:i] + '\n' + JS + s[i:]
assert '—' not in CSS + JS + HTML and '\x00' not in s
open('index.html', 'w', encoding='utf-8').write(s)
SK = open('/root/.claude/projects/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/tool-results/artifact-8b839950-1791194761-26f7.html', encoding='utf-8').read()
open('test.html', 'w', encoding='utf-8').write(SK[:SK.index('<body>') + 6] + '\n' + s + '</body></html>')
for n, js in enumerate(re.findall(r'<script>(.*?)</script>', s, flags=re.S)): open(f'js{n}.js', 'w', encoding='utf-8').write(js)
print('ok', len(s.encode()))
