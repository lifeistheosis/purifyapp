
// The other tabs, cleaned up (Oct 9, owner: "optimize the other pages ... make it look simplified ... it just looks
// like a box data ... make it look more clean, like how you did with today"). The stylesheet does most of it. This
// script does what a stylesheet cannot: it marks the first part of each tab for the big title, tells each grid how many
// columns its items want, swaps the last emoji markers for drawn ones, turns the week into a calendar, puts each saved
// post's yes or no at the right of its row, and folds the note and goal fields away until they are asked for. Every
// control stays the one the main script listens to.
(function () {
  var main = document.querySelector("main");
  if (!main) return;
  function qa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  var others = qa("main > section").filter(function (s) { return s.id !== "waiting"; });

  // 1. The first part of each tab gets Today's big title; the parts after it a smaller one.
  var seen = {};
  qa("main > section").forEach(function (s) {
    var t = s.getAttribute("data-tab") || s.id || "";
    s.classList.add(seen[t] ? "follow" : "lead");
    seen[t] = 1;
  });

  // 2. A grid of cards becomes one panel with hairlines between its items, as many columns as it has items.
  others.forEach(function (s) {
    qa(".grid3, .grid4, .pieces", s).forEach(function (g) {
      var wide = qa(":scope > *", g).filter(function (c) { return c.querySelector("[data-app]"); });
      wide.forEach(function (c) { c.classList.add("wide"); });
      var n = g.children.length - wide.length;
      g.classList.add("hair");
      g.style.setProperty("--cols", String(n === 7 ? 7 : n <= 4 ? Math.max(n, 1) : 3));
    });
  });

  // 3. The last emoji markers: the hot and cold marks on views become drawn dots, the others go.
  var FIRE = /\uD83D\uDD25/, ICE = /\uD83E\uDDCA/, DROP = /(?:\uD83E\uDDF2|\uD83E\uDDEA|\uD83C\uDFAC|\uD83D\uDCDA|\uD83D\uDD01|\uD83D\uDDBC|\uD83D\uDCFA)\uFE0F?\s*/g, STREAK = /^(\s*)\uD83D\uDD25\s*(?=\d+ days? in a row)/;
  function marks(node) {
    var t = node.nodeValue, parts, frag, k;
    if (t.indexOf("\u2705 and \uD83D\uDEAB move a piece") !== -1) t = t.replace("\u2705 and \uD83D\uDEAB move a piece", "A yes or a no moves a piece");
    t = t.replace(STREAK, "$1").replace(DROP, "");
    if (!FIRE.test(t) && !ICE.test(t)) { if (t !== node.nodeValue) node.nodeValue = t; return; }
    parts = t.split(/(\uD83D\uDD25|\uD83E\uDDCA)/);
    frag = document.createDocumentFragment();
    for (k = 0; k < parts.length; k++) {
      if (parts[k] === "\uD83D\uDD25" || parts[k] === "\uD83E\uDDCA") {
        var hot = parts[k] === "\uD83D\uDD25", m = mk("i", "mk " + (hot ? "hot" : "cold"));
        m.setAttribute("role", "img");
        m.setAttribute("aria-label", hot ? "twice its usual or more" : "half its usual or less");
        m.title = hot ? "Twice its usual or more" : "Half its usual or less";
        frag.appendChild(m);
      } else if (parts[k]) frag.appendChild(document.createTextNode(parts[k]));
    }
    node.parentNode.replaceChild(frag, node);
  }
  others.forEach(function (s) {
    var w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = w.nextNode())) if (/[\uD83C-\uD83E\u2705]/.test(n.nodeValue)) list.push(n);
    list.forEach(marks);
  });

  // 4. The week as a calendar: the weekday small, the date large; days gone by step back, today is marked.
  var today = new Date(); today.setHours(0, 0, 0, 0);
  qa("#week .day > h3").forEach(function (h) {
    var m = /^(\w{3}), (\w{3}) (\d{1,2})$/.exec(h.textContent.trim());
    if (!m) return;
    var d = new Date(m[2] + " " + m[3] + ", " + today.getFullYear()), card = h.parentNode;
    h.textContent = "";
    h.appendChild(mk("span", "dw", m[1])); h.appendChild(document.createTextNode(" "));
    h.appendChild(mk("span", "dn", m[3])); h.appendChild(document.createTextNode(" "));
    h.appendChild(mk("span", "dm", m[2]));
    if (!isNaN(d.getTime())) {
      if (d < today) card.classList.add("past");
      else if (d.getTime() === today.getTime()) { card.classList.add("today"); h.appendChild(document.createTextNode(" ")); h.appendChild(mk("span", "dt", "Today")); }
    }
  });

  // 5. A saved post's yes or no sits at the right of its row.
  qa("#saved .short").forEach(function (row) {
    var box = row.querySelector(".live[data-decide]");
    if (!box || box.parentNode === row) return;
    var act = mk("div", "short-act");
    row.appendChild(act); act.appendChild(box);
  });

  // 6. Fields wait behind a button: a note behind Note, a follower goal behind Set a goal.
  function fold(box, label, open, fields) {
    var b = mk("button", "btn small fold-t", label);
    b.type = "button"; b.setAttribute("aria-expanded", "false");
    box.classList.add("folds");
    b.addEventListener("click", function () {
      var on = !box.classList.contains("open");
      box.classList.toggle("open", on); b.setAttribute("aria-expanded", String(on));
      if (on) { var f = box.querySelector("input"); if (f) f.focus(); }
    });
    if (fields) fields.parentNode.insertBefore(b, fields); else box.insertBefore(b, open);
    return b;
  }
  others.forEach(function (s) {
    qa(".live[data-decide]", s).forEach(function (box) {
      var inp = box.querySelector(":scope > input");
      if (inp && !box.querySelector(".fold-t")) fold(box, "Note", inp, null);
    });
  });
  qa("#accounts .live[data-goal]").forEach(function (box) {
    var card = box.parentNode, set = box.querySelector(".state");
    var b = fold(box, set && set.textContent.trim() ? "Change goal" : "Set a goal", null, box);
    b.classList.add("live-only");
    b.addEventListener("click", function () { card.classList.toggle("goal-open", box.classList.contains("open")); });
  });

  // 7. The gates as a bar, with the step that is next in words beside it.
  qa(".gates").forEach(function (g) {
    var all = qa(".g", g), at = -1;
    all.forEach(function (x, i) { if (at < 0 && !x.classList.contains("done")) at = i; });
    var done = at < 0 ? all.length : at, next = at < 0 ? "" : all[at].textContent.replace(/^\W+/, "").trim();
    var cap = mk("span", "gates-l", done === all.length ? "All " + all.length + " gates done" : done + " of " + all.length + " gates done");
    g.setAttribute("aria-label", "The six gates: " + cap.textContent + (next ? ", next " + next : ""));
    g.parentNode.insertBefore(cap, g.nextSibling);
  });

  // 8. Every post and the shelf open by default: the tab is the list.
  qa("#posts > details, #shelf > details").forEach(function (d) { d.open = true; d.classList.add("always"); });
})();
