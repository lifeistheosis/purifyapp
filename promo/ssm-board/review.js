// Going through them (Oct 8, owner: "instead of a checklist ... make it a pop-up ... its own card popped up in the middle
// ... animations going in and out, very smooth"). One card for each thing that needs a yes or no. Its buttons press the
// piece's own buttons, so every choice saves through the board's store exactly as before: nothing here writes on its own.
(function () {
  var dlg = document.getElementById("review");
  if (!dlg || typeof dlg.showModal !== "function") return;
  var root = document.documentElement, card = dlg.querySelector(".rv-card"), item = dlg.querySelector(".rv-item"), count = dlg.querySelector(".rv-count"), bar = dlg.querySelector(".rv-bar i");
  var prev = dlg.querySelector('[data-rv="prev"]'), next = dlg.querySelector('[data-rv="next"]');
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var list = [], at = 0, busy = false, chosen = {}, mode = "decide", titleEl = dlg.querySelector("#rv-title");
  function q(sel, el) { return (el || document).querySelector(sel); }
  function qa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function live() { return root.getAttribute("data-live") === "1"; }
  function done(el) { return mode === "ask" ? false : el.classList.contains("decided") || !!chosen[el.id]; }
  function left() { return list.filter(function (e) { return !done(e); }).length; }
  function header() {
    count.textContent = (at + 1) + " of " + list.length + (mode === "ask" ? "" : ", " + left() + " left");
    bar.style.width = (list.length ? (mode === "ask" ? (at + 1) / list.length : (list.length - left()) / list.length) * 100 : 0) + "%";
    prev.disabled = at <= 0; next.disabled = at >= list.length - 1;
  }
  function openAfter(from) { for (var k = 1; k <= list.length; k++) { var j = (from + k) % list.length; if (!done(list[j])) return j; } return -1; }
  function state() {
    var el = list[at], st = q(".rv-state", item), box = el && q("[data-decide]", el);
    if (st && box) { var m = q(".msg", box), s = q(".state", box), mt = m ? m.textContent : ""; st.textContent = mt && mt !== "Saved" && mt !== "Saving" ? mt : (s ? s.textContent : ""); }
    header();
  }
  // The questions are Today's other asks (owner, Oct 8: "remove it from the Today screen ... leave it in the buttons").
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
  function render(i) { at = i; item.textContent = ""; item.classList.toggle("solo", mode === "ask"); item.appendChild(build(list[i])); state(); }
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
  function open(m) {
    mode = m || "decide";
    list = mode === "ask" ? asks() : qa(".needs");
    if (!list.length) return;
    titleEl.textContent = mode === "ask" ? "Questions for you" : "Going through them";
    chosen = {}; item.textContent = "";
    var first = mode === "ask" ? 0 : openAfter(-1);
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
    var b = e.target.closest ? e.target.closest('[data-act="deck-on"], [data-act="questions"]') : null;
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
  if (window.MutationObserver) new MutationObserver(counts).observe(document.querySelector("main"), { subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
})();
