
// Today, the daily brief (Oct 8, owner: "today ... should refresh my mind. Every single day, something new. I want
// what performed, what underperformed, how yesterday did, how today's doing ... ratios, percentages, make it look
// nice", with "clean animations" on this section only). Every number is read from the board itself (the copy text of
// Every post, the account cards, What is working) or from its store, so it stays true after each sync. On its own it
// writes one thing: the board's reading of its numbers, to days/<the day they were read>, once, so that the next
// reading (from a sync or the morning check) has something to be compared with. Port it into ssm/ with the rest.
(function () {
  var dash = document.getElementById("dash"), ledeBox = document.getElementById("dash-lede");
  if (!dash || !ledeBox) return;
  var DAY = 86400000, PF = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" }, ORDER = ["tiktok", "instagram", "youtube"];
  var PFI = { TikTok: "tiktok", Instagram: "instagram", YouTube: "youtube", Shorts: "shorts" };
  var GROUP = { kind: "Kind", "how it opens": "Opening", length: "Length", "the day it went up": "Day", hashtag: "Hashtag" };
  var still = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function q(sel, el) { return (el || document).querySelector(sel); }
  function qa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }
  function txt(s) { return document.createTextNode(s); }
  function num(t) { var d = String(t == null ? "" : t).replace(/[^0-9]/g, ""); return d ? parseInt(d, 10) : null; }
  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
  function sum(a) { return a.reduce(function (x, y) { return x + (y || 0); }, 0); }
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; }
  function times(r) { return (r >= 9.95 ? fmt(r) : r.toFixed(1)) + "×"; }
  function pc(x) { return (x * 100).toFixed(1) + "%"; }
  function of(r) { return Math.round(r * 100) + "%"; }
  function show(v, f) { return f === "x" ? times(v) : f === "of" ? of(v) : f === "pc" ? pc(v) : fmt(v); }
  function unshow(s, f) { var v = parseFloat(String(s).replace(/[^0-9.]/g, "")); return isNaN(v) ? 0 : f === "pc" || f === "of" ? v / 100 : v; }
  function z(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); }
  function parseDay(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function short(s) { var d = parseDay(s); return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""; }
  function monthName(ym) { var d = parseDay(ym + "-01"); return d ? d.toLocaleDateString("en-US", { month: "long" }) : ym; }
  function midnight(off) { var d = new Date(); d.setHours(0, 0, 0, 0); if (off) d.setDate(d.getDate() + off); return d; }
  function ago(s) { var d = parseDay(s); return d ? Math.round((midnight(0) - d) / DAY) : null; }
  function dayIndex() { return Math.round((midnight(0) - new Date(2026, 0, 1)) / DAY); }
  function dayOf(at) { var d = at ? new Date(at) : null; return d && !isNaN(d.getTime()) ? iso(d) : ""; }
  function norm(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function bare(t) { return String(t || "").replace(/[{}]/g, "").replace(/^["“”']+|["“”']+$/g, "").trim(); }
  function cut(t, n) { t = String(t || ""); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t; }
  function low(s) { return s.length > 1 && s.charAt(1) === s.charAt(1).toLowerCase() ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function quote(t, n) { return "“" + cut(bare(t), n) + "”"; }
  function ico(pf) { var name = PF[pf] || (pf === "shorts" ? "YouTube Shorts" : pf), i = mk("i", "ico ico-" + pf); i.setAttribute("role", "img"); i.setAttribute("aria-label", name); i.title = name; return i; }
  function signed(n) { return (n >= 0 ? "+" : "−") + fmt(Math.abs(n)); }

  // ---- What the board already shows ----
  // Every post: the copy text carries full dates and every number; the table row beside it carries the piece.
  function readPosts() {
    var btn = q("#posts [data-copy]");
    if (!btn) return [];
    var lines = String(btn.getAttribute("data-copy") || "").split("\n"), head = (lines.shift() || "").split("\t").map(function (h) { return h.trim().toLowerCase(); });
    var rows = qa("#posts tr").filter(function (tr) { return q("td.t a", tr); }), out = [];
    function same(tr, p) { var a = q("td.t a", tr); return !!a && norm(a.textContent) === norm(p.title) && (" " + (tr.getAttribute("data-tags") || "") + " ").indexOf(" " + p.pf + " ") !== -1; }
    lines.forEach(function (line, i) {
      var f = line.split("\t");
      if (f.length < 3) return;
      function g(n) { var k = head.indexOf(n); return k >= 0 ? String(f[k] || "").trim() : ""; }
      var p = { date: g("posted"), title: g("piece"), pf: g("platform").toLowerCase(), views: num(g("views")), likes: num(g("likes")), comments: num(g("comments")), shares: num(g("shares")), saves: num(g("saves")), read: g("read"), r: null, basis: "" };
      if (!PF[p.pf] || !parseDay(p.date)) return;
      var tr = rows[i] && same(rows[i], p) ? rows[i] : rows.filter(function (r) { return same(r, p); })[0], a = tr ? q("td.t a", tr) : null;
      p.anchor = a ? String(a.getAttribute("href") || "").replace(/^#/, "") : "";
      out.push(p);
    });
    return out;
  }
  function readAccounts() {
    var o = {};
    qa("#accounts .card").forEach(function (c) {
      var p = q(".pfh", c), h = q(".hero", c), pf = p ? String(p.getAttribute("aria-label") || "").toLowerCase() : "";
      if (PF[pf] && h) o[pf] = { followers: num(h.textContent) || 0, handle: (q("a code", c) || {}).textContent || "" };
    });
    return o;
  }
  // What is working: the groups ("By kind" and the rest) and the posts worth remaking.
  function readPatterns() {
    var out = [];
    qa("#working .card").forEach(function (card) {
      var h = q("h3", card), g = h ? h.textContent.trim() : "";
      if (!/^By /.test(g)) return;
      qa(".meter", card).forEach(function (m) {
        var sp = qa("span", m), label = sp[0] ? sp[0].textContent.trim() : "", mm = sp[1] ? /([\d,]+) usual, (\d+) post/.exec(sp[1].textContent) : null;
        if (label && mm) out.push({ group: g.slice(3).toLowerCase(), label: label, usual: num(mm[1]), n: +mm[2] });
      });
    });
    return out;
  }
  function readRemakes() {
    var card = qa("#working .card").filter(function (c) { return /worth remaking/i.test((q("h3", c) || {}).textContent || ""); })[0];
    return card ? qa("a.slot", card).map(function (a) {
      var t = q(".t", a), d = q(".dim", a);
      return { anchor: String(a.getAttribute("href") || "").replace(/^#/, ""), title: t ? t.textContent.trim() : "", sub: d ? d.textContent.trim() : "" };
    }) : [];
  }
  function thumb(anchor) {
    var el = anchor ? document.getElementById(anchor) : null, img = el ? q("img.thumb", el) : null, src = img ? img.getAttribute("src") : "";
    if (src) { var i = mk("img", "thumb s"); i.src = src; i.alt = ""; i.loading = "lazy"; return i; }
    return mk("span", "thumb s blank", "Post");
  }

  function platforms(posts, acc) {
    return ORDER.map(function (pf) {
      var mine = posts.filter(function (p) { return p.pf === pf; }), wv = mine.filter(function (p) { return p.views !== null; }), wl = mine.filter(function (p) { return p.likes !== null; });
      var views = sum(wv.map(function (p) { return p.views; })), acts = sum(wv.map(function (p) { return (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0); })), a = acc[pf] || {};
      return {
        pf: pf, name: PF[pf], handle: a.handle || "", followers: a.followers || 0, posts: mine.length,
        numbered: mine.filter(function (p) { return p.views !== null || p.likes !== null; }).length,
        views: wv.length ? views : null, acts: acts, usual: wv.length ? median(wv.map(function (p) { return p.views; })) : null,
        usualLikes: wl.length >= 3 ? median(wl.map(function (p) { return p.likes; })) : null, eng: views ? acts / views : null,
        last: mine.map(function (p) { return p.date; }).sort().pop() || ""
      };
    }).filter(function (s) { return s.posts || s.followers; });
  }
  // Each post against its own platform's usual post: by views, or by likes where the platform hides views.
  function rate(posts, by) {
    posts.forEach(function (p) {
      var s = by[p.pf];
      if (!s) return;
      if (p.views !== null && s.usual) { p.r = Math.max(p.views / s.usual, 0.01); p.basis = "views"; }
      else if (s.views === null && p.likes !== null && s.usualLikes) { p.r = Math.max(p.likes / s.usualLikes, 0.01); p.basis = "likes"; }
    });
  }
  function reading(posts, stats) {
    var date = posts.map(function (p) { return p.read; }).filter(parseDay).sort().pop();
    if (!date) return null;
    var r = { kind: "day", date: date.slice(0, 10), by: "board", followers: {}, views: {}, likes: {}, posts: {}, pv: [] };
    stats.forEach(function (s) { r.followers[s.pf] = s.followers; if (s.views !== null) r.views[s.pf] = s.views; r.likes[s.pf] = sum(posts.filter(function (p) { return p.pf === s.pf; }).map(function (p) { return p.likes; })); r.posts[s.pf] = s.posts; });
    posts.forEach(function (p) { if (p.anchor && p.views !== null) r.pv.push({ a: p.anchor, pf: p.pf, v: p.views }); });
    return r;
  }

  var posts = readPosts(), acc = readAccounts(), pats = readPatterns(), remakes = readRemakes();
  var stats = platforms(posts, acc), by = {};
  if (!stats.length) return;
  stats.forEach(function (s) { by[s.pf] = s; });
  rate(posts, by);
  var base = reading(posts, stats), titleOf = {};
  posts.forEach(function (p) { if (p.anchor) titleOf[p.anchor] = p.title; });

  // ---- The board's store: today's activity, the readings, the ideas ----
  var store = { decisions: {}, posted: {}, state: {}, days: {}, ideas: [] }, db = null, wrote = false, daysIn = false;
  function keyed(s) { var o = {}; s.docs.forEach(function (d) { o[d.id] = d.data() || {}; }); return o; }
  function readings() {
    var list = [];
    Object.keys(store.days).forEach(function (k) {
      var d = store.days[k];
      if (d && typeof d === "object") list.push({ date: String(d.date || k).slice(0, 10), by: String(d.by || ""), followers: d.followers || {}, views: d.views || {}, pv: Array.isArray(d.pv) ? d.pv : [] });
    });
    if (base && !list.some(function (r) { return r.date === base.date; })) list.push(base);
    return list.filter(function (r) { return parseDay(r.date); }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }
  function at(r, field, pf) { var v = r && r[field] ? r[field][pf] : null; return typeof v === "number" && isFinite(v) ? v : null; }
  function pair(field) {
    var l = readings().filter(function (r) { return ORDER.some(function (pf) { return at(r, field, pf) !== null; }); });
    return { cur: l[l.length - 1] || null, prev: l[l.length - 2] || null };
  }
  function tally(day) {
    var seen = {}, n = { posts: 0, answered: 0, voice: 0, ideas: 0 };
    function on(a) { return dayOf(a) === day; }
    posts.forEach(function (p) { if (p.date === day) seen[String(p.anchor || norm(p.title)).replace(/^p-/, "") + "." + p.pf] = 1; });
    Object.keys(store.posted).forEach(function (k) { var d = store.posted[k] || {}; if (on(d.at)) seen[String(d.piece || k).replace(/^p-/, "") + "." + (d.platform || "")] = 1; });
    n.posts = Object.keys(seen).length;
    Object.keys(store.decisions).forEach(function (k) { var d = store.decisions[k] || {}; if (on(d.at) && d.choice && d.choice !== "note") n.answered++; });
    Object.keys(store.state).forEach(function (k) { var d = store.state[k] || {}; if (d.kind === "vo" && d.done && on(d.at)) n.voice++; });
    n.ideas = store.ideas.filter(function (i) { return on(i.at); }).length;
    return n;
  }

  // ---- Motion: numbers count up and bars grow once, when a panel first comes into view ----
  var io = !still && "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); play(e.target); } });
  }, { threshold: 0, rootMargin: "0px 0px -12% 0px" }) : null;
  function count(k, to, from, f) {
    var b = mk("b", "cnt");
    b.setAttribute("data-k", k); b.setAttribute("data-to", String(to)); b.setAttribute("data-from", String(from == null ? 0 : from));
    if (f) b.setAttribute("data-f", f);
    b.textContent = show(to, f);
    return b;
  }
  function bar(cls, frac, d) {
    var s = mk("span", cls), i = mk("i", "grow");
    i.style.width = (Math.max(0, Math.min(1, frac)) * 100).toFixed(1) + "%";
    if (d != null) i.style.setProperty("--d", d.toFixed(2) + "s");
    s.appendChild(i);
    return s;
  }
  function tween(el, a, b, f, ms, delay) {
    if (still || a === b) { el.textContent = show(b, f); return; }
    var t0 = 0;
    el.textContent = show(a, f);
    function step(t) {
      if (!t0) t0 = t + (delay || 0);
      var k = Math.max(0, Math.min(1, (t - t0) / ms)), e = k >= 1 ? 1 : 1 - Math.pow(2, -10 * k);
      el.textContent = show(a + (b - a) * e, f);
      if (k < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
  // Until then each number keeps its true value in the page (its row is see-through while it waits), so nothing reads
  // a zero that is not there.
  function arm(panel) {
    if (!io) { panel.classList.add("settled"); return; }
    panel.classList.add("pre");
    io.observe(panel);
  }
  function play(panel) {
    if (panel.lay) panel.lay();
    void panel.offsetWidth;
    panel.classList.remove("pre");
    qa("[data-to]", panel).forEach(function (el, i) { tween(el, +el.getAttribute("data-from") || 0, +el.getAttribute("data-to"), el.getAttribute("data-f"), 1100, 90 + Math.min(i, 14) * 35); });
    setTimeout(function () { panel.classList.add("settled"); }, 1700);
  }
  // A panel drawn again after the store answers keeps its place: no second entrance, and a number that changed
  // rolls from what it showed to what it is now.
  function swap(old, fresh) {
    if (!old || !old.parentNode) return fresh;
    var was = {}, played = !old.classList.contains("pre");
    qa("[data-k]", old).forEach(function (e) { was[e.getAttribute("data-k")] = e.textContent; });
    if (io) io.unobserve(old);
    old.parentNode.replaceChild(fresh, old);
    if (!played) { arm(fresh); return fresh; }
    fresh.classList.add("settled");
    qa("[data-k]", fresh).forEach(function (e) {
      var k = e.getAttribute("data-k"), f = e.getAttribute("data-f"), to = +e.getAttribute("data-to");
      if (was[k] !== undefined && was[k] !== show(to, f)) tween(e, unshow(was[k], f), to, f, 650, 0);
    });
    return fresh;
  }
  function panel(cls, title, note) {
    var box = mk("div", "dpanel " + cls), head = mk("div", "dp-head");
    head.appendChild(mk("h3", "", title));
    if (note) head.appendChild(mk("span", "dim small", note));
    box.appendChild(head);
    return box;
  }

  // ---- Platforms: every one of them, side by side ----
  function platPanel() {
    var F = pair("followers"), V = pair("views"), when = "";
    if (F.cur && V.cur && F.cur.date !== V.cur.date) when = "Followers read " + short(F.cur.date) + ", views " + short(V.cur.date);
    else if (F.cur || V.cur) when = "Read " + short((F.cur || V.cur).date);
    var box = panel("d-plat", "Platforms", when), fol = {}, vw = {}, tf = 0, tv = 0, tacts = 0, tposts = 0;
    stats.forEach(function (s) {
      var f = at(F.cur, "followers", s.pf), v = s.views === null ? null : at(V.cur, "views", s.pf);
      fol[s.pf] = f === null ? s.followers : f; tf += fol[s.pf];
      vw[s.pf] = s.views === null ? null : v === null ? s.views : v;
      if (vw[s.pf] !== null) { tv += vw[s.pf]; tacts += s.acts; }
      tposts += s.posts;
    });
    var wrap = mk("div", "dp-scroll"), t = mk("table", "ptable"), th = mk("thead"), hr = mk("tr"), tb = mk("tbody");
    [["Platform", ""], ["Followers", ""], ["Views", ""], ["Posts", ""], ["Usual post", "The middle post, so one runaway does not move it"], ["Engagement", "Likes, comments, shares and saves, for every view"], ["Last post", ""]].forEach(function (h, i) {
      var c = mk("th", i ? "n" : "", h[0]); c.scope = "col"; if (h[1]) c.title = h[1]; hr.appendChild(c);
    });
    th.appendChild(hr); t.appendChild(th);
    function share(frac, d) { var s = mk("span", "sub2"); s.appendChild(bar("sbar", frac, d)); s.appendChild(mk("span", "", pc(frac))); return s; }
    function value(k, to, from, f, prev) {
      var v = mk("span", "v"); v.appendChild(count(k, to, from, f));
      if (prev !== null && prev !== undefined && to !== prev) v.appendChild(mk("span", "chg", signed(to - prev)));
      return v;
    }
    stats.forEach(function (s, i) {
      var tr = mk("tr", "rise"), h = mk("th"), name = mk("span", "pfn"), d = 0.12 + i * 0.08;
      tr.style.setProperty("--d", (0.04 + i * 0.07).toFixed(2) + "s");
      h.scope = "row"; name.appendChild(ico(s.pf)); name.appendChild(txt(s.name)); h.appendChild(name);
      if (s.handle) h.appendChild(mk("span", "hdl", s.handle));
      tr.appendChild(h);
      var c1 = mk("td", "n"), f0 = at(F.prev, "followers", s.pf);
      c1.appendChild(value("pf." + s.pf, fol[s.pf], f0, "", f0)); c1.appendChild(share(tf ? fol[s.pf] / tf : 0, d));
      tr.appendChild(c1);
      var c2 = mk("td", "n");
      if (vw[s.pf] === null) { var hid = mk("span", "v none", "Hidden"); hid.title = s.name + " hides views on its public page"; c2.appendChild(hid); c2.appendChild(mk("span", "sub2", "likes only")); }
      else { var v0 = at(V.prev, "views", s.pf); c2.appendChild(value("pv." + s.pf, vw[s.pf], v0, "", v0)); c2.appendChild(share(tv ? vw[s.pf] / tv : 0, d + 0.05)); }
      tr.appendChild(c2);
      var c3 = mk("td", "n"), miss = s.posts - s.numbered;
      c3.appendChild(value("pp." + s.pf, s.posts, 0, ""));
      if (miss > 0) c3.appendChild(mk("span", "sub2", miss + " without numbers"));
      tr.appendChild(c3);
      var c4 = mk("td", "n");
      if (s.usual !== null) { c4.appendChild(value("pu." + s.pf, s.usual, 0, "")); c4.appendChild(mk("span", "sub2", "views")); }
      else if (s.usualLikes !== null) { c4.appendChild(value("pu." + s.pf, s.usualLikes, 0, "")); c4.appendChild(mk("span", "sub2", "likes")); }
      else c4.appendChild(mk("span", "v none", "Not yet"));
      tr.appendChild(c4);
      var c5 = mk("td", "n");
      if (s.eng !== null) c5.appendChild(value("pe." + s.pf, s.eng, 0, "pc"));
      else c5.appendChild(mk("span", "v none", "Hidden"));
      tr.appendChild(c5);
      var c6 = mk("td", "n"), g = ago(s.last);
      c6.appendChild(mk("span", "v sm", s.last ? short(s.last) : "None yet"));
      if (g !== null) c6.appendChild(mk("span", "sub2", g <= 0 ? "today" : g === 1 ? "yesterday" : g + " days ago"));
      tr.appendChild(c6);
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    var tf0 = mk("tfoot"), fr = mk("tr", "rise"), fh = mk("th", "", "All"), withViews = stats.filter(function (s) { return vw[s.pf] !== null; }).map(function (s) { return s.name; });
    fr.style.setProperty("--d", (0.04 + stats.length * 0.07).toFixed(2) + "s");
    fh.scope = "row"; fr.appendChild(fh);
    var a1 = mk("td", "n"); a1.appendChild(value("pf.all", tf, sum(ORDER.map(function (pf) { return at(F.prev, "followers", pf); })) || 0, "")); fr.appendChild(a1);
    var a2 = mk("td", "n"); a2.appendChild(value("pv.all", tv, sum(ORDER.map(function (pf) { return at(V.prev, "views", pf); })) || 0, "")); if (withViews.length) a2.appendChild(mk("span", "sub2", withViews.join(" and "))); fr.appendChild(a2);
    var a3 = mk("td", "n"); a3.appendChild(value("pp.all", tposts, 0, "")); fr.appendChild(a3);
    fr.appendChild(mk("td", "n"));
    var a5 = mk("td", "n"); if (tv) a5.appendChild(value("pe.all", tacts / tv, 0, "pc")); fr.appendChild(a5);
    var lastAll = posts.map(function (p) { return p.date; }).sort().pop() || "", a6 = mk("td", "n");
    a6.appendChild(mk("span", "v sm", lastAll ? short(lastAll) : "")); fr.appendChild(a6);
    tf0.appendChild(fr); t.appendChild(tf0);
    wrap.appendChild(t); box.appendChild(wrap);
    var note = mk("p", "dnote"), link = mk("a", "", "What is working");
    link.href = "#working";
    note.appendChild(txt("Usual is the middle post, so one runaway does not move it. Engagement is likes, comments, shares and saves for every view. " + (stats.some(function (s) { return s.views === null; }) ? "Instagram hides its views from the public page: type them under " : "Numbers a public page cannot show go under ")));
    note.appendChild(link); note.appendChild(txt(" and the next sync counts them."));
    box.appendChild(note);
    return box;
  }

  // ---- Yesterday and today ----
  function dayPanel() {
    var box = panel("d-day", "Yesterday and today"), today = iso(midnight(0)), yday = iso(midnight(-1)), a = tally(yday), b = tally(today);
    var t = mk("table", "dtable"), th = mk("thead"), hr = mk("tr"), tb = mk("tbody");
    hr.appendChild(mk("td"));
    [["Yesterday", yday], ["Today", today]].forEach(function (x) { var c = mk("th", "n", x[0]); c.scope = "col"; c.title = short(x[1]); hr.appendChild(c); });
    th.appendChild(hr); t.appendChild(th);
    [["Posts up", "posts"], ["Answered yes or no", "answered"], ["Voice lines recorded", "voice"], ["Ideas added", "ideas"]].forEach(function (r, i) {
      var tr = mk("tr", "rise"), h = mk("th", "", r[0]), y = mk("td", "n"), n = mk("td", "n now" + (b[r[1]] ? "" : " zero"));
      tr.style.setProperty("--d", (0.05 + i * 0.06).toFixed(2) + "s");
      h.scope = "row";
      y.appendChild(count("dy." + r[1], a[r[1]], 0, "")); n.appendChild(count("dt." + r[1], b[r[1]], 0, ""));
      tr.appendChild(h); tr.appendChild(y); tr.appendChild(n); tb.appendChild(tr);
    });
    t.appendChild(tb); box.appendChild(t);
    var F = pair("followers"), V = pair("views"), since = mk("div", "since rise"), lines = [];
    since.style.setProperty("--d", "0.3s");
    function word(r) { return r.date === yday ? "yesterday" : short(r.date); }
    function diff(P, field) { var d = 0; ORDER.forEach(function (pf) { var x = at(P.cur, field, pf), y = at(P.prev, field, pf); if (x !== null && y !== null) d += x - y; }); return d; }
    if (V.cur && V.prev) lines.push([diff(V, "views"), " views since " + word(V.prev)]);
    if (F.cur && F.prev) lines.push([diff(F, "followers"), " followers since " + word(F.prev)]);
    lines.forEach(function (l) { var p = mk("p"); p.appendChild(mk("b", "", signed(l[0]))); p.appendChild(txt(l[1])); since.appendChild(p); });
    var R = readings().filter(function (r) { return r.pv.length; }), cur = R[R.length - 1], prev = R[R.length - 2];
    if (cur && prev) {
      var old = {};
      prev.pv.forEach(function (x) { old[x.a + "|" + x.pf] = x.v; });
      var gains = cur.pv.map(function (x) { var o = old[x.a + "|" + x.pf]; return { a: x.a, pf: x.pf, g: typeof o === "number" ? x.v - o : 0 }; }).filter(function (x) { return x.g > 0; }).sort(function (x, y) { return y.g - x.g; }).slice(0, 3);
      if (gains.length) {
        var ol = mk("ol", "moving");
        gains.forEach(function (x) { var li = mk("li"), aa = mk("a"); aa.href = "#" + x.a; aa.appendChild(ico(x.pf)); aa.appendChild(mk("span", "t", titleOf[x.a] || "A post")); aa.appendChild(mk("b", "", signed(x.g))); li.appendChild(aa); ol.appendChild(li); });
        since.appendChild(ol);
      }
    }
    if (!lines.length && base) since.appendChild(mk("p", "dim small", "Numbers read " + short(base.date) + ". From the next reading, what they gained since shows here."));
    box.appendChild(since);
    var last = posts.map(function (p) { return p.date; }).sort().pop() || "";
    Object.keys(store.posted).forEach(function (k) { var d = dayOf((store.posted[k] || {}).at); if (d && d > last) last = d; });
    var g = ago(last);
    if (g !== null) {
      var gl = mk("p", "gapline rise");
      gl.style.setProperty("--d", "0.36s");
      if (g <= 0) gl.appendChild(mk("b", "cnt", "A post went up today"));
      else { gl.appendChild(count("gap", g, 0, "")); gl.appendChild(txt(g === 1 ? " day since the last post" : " days since the last post")); }
      box.appendChild(gl);
    }
    return box;
  }

  // ---- Every post against its own platform's usual, on one line ----
  function stripPanel() {
    var rated = posts.filter(function (p) { return p.r !== null; });
    var box = panel("d-strip", "Every post against its usual", rated.length + " posts with numbers");
    if (rated.length < 3) { box.appendChild(mk("p", "dim", "Three posts with numbers draw this line.")); return box; }
    var rs = rated.map(function (p) { return p.r; }), lo = Math.max(0.01, Math.min(0.1, Math.min.apply(null, rs) / 1.35)), hi = Math.max(10, Math.max.apply(null, rs) * 1.3);
    var L0 = Math.log(lo), span = Math.log(hi) - L0, nHi = rated.filter(function (p) { return p.r >= 2; }).length, nLo = rated.filter(function (p) { return p.r <= 0.5; }).length;
    function xp(r) { return (Math.log(r) - L0) / span; }
    var strip = mk("div", "strip"), axis = mk("div", "axis"), field = mk("div", "field"), tip = mk("div", "tip");
    strip.setAttribute("role", "img");
    strip.setAttribute("aria-label", rated.length + " posts placed by how each did against its platform's usual: " + nHi + " at twice or more, " + nLo + " at half or less.");
    axis.setAttribute("aria-hidden", "true"); field.setAttribute("aria-hidden", "true");
    [[0.1, "0.1×"], [0.5, "Half"], [1, "Usual"], [2, "Twice"], [10, "10×"], [30, "30×"], [100, "100×"]].forEach(function (k) {
      if (k[0] < lo || k[0] > hi) return;
      var e = mk("span", "axt" + (k[0] === 1 ? " one" : k[0] === 0.5 || k[0] === 2 ? " minor" : ""));
      e.style.left = (xp(k[0]) * 100).toFixed(2) + "%";
      e.appendChild(mk("span", "", k[1]));
      axis.appendChild(e);
    });
    var dots = rated.map(function (p) {
      var a = mk("a", "dot " + (p.r >= 2 ? "hi" : p.r <= 0.5 ? "lo" : "mid"));
      a.href = "#" + (p.anchor || "posts"); a.tabIndex = -1;
      return { el: a, p: p, x: xp(p.r), px: 0, lane: 0 };
    });
    dots.slice().sort(function (a, b) { return Math.abs(Math.log(a.p.r)) - Math.abs(Math.log(b.p.r)); }).forEach(function (d, i) { d.el.style.setProperty("--d", (0.08 + i * 0.016).toFixed(3) + "s"); });
    dots.forEach(function (d) { field.appendChild(d.el); });
    tip.hidden = true; field.appendChild(tip);
    strip.appendChild(axis); strip.appendChild(field); box.appendChild(strip);
    // The same split as shares of the whole, left to right like the line: under, in between, over.
    var split = mk("div", "split"), sbar = mk("div", "split-bar"), keys = mk("div", "split-keys"), nMid = rated.length - nHi - nLo;
    [["lo", nLo, " at half its usual or less"], ["mid", nMid, " in between"], ["hi", nHi, " at twice or more"]].forEach(function (k, i) {
      if (!k[1]) return;
      var seg = mk("i", k[0] + " grow"), key = mk("span", "sk " + k[0]);
      seg.style.flexGrow = String(k[1]); seg.style.setProperty("--d", (0.25 + i * 0.12).toFixed(2) + "s");
      sbar.appendChild(seg);
      key.appendChild(mk("i")); key.appendChild(mk("b", "", of(k[1] / rated.length))); key.appendChild(txt(k[1] + k[2]));
      keys.appendChild(key);
    });
    sbar.setAttribute("aria-hidden", "true");
    split.appendChild(sbar); split.appendChild(keys); box.appendChild(split);
    var W = 0;
    function lay() {
      var w = field.clientWidth;
      if (!w || w === W) return;
      W = w;
      strip.classList.toggle("narrow", w < 560);
      var R = w < 560 ? 11 : 14, lanes = {}, top = 0, one = xp(1) * w;
      dots.slice().sort(function (a, b) { return a.x - b.x; }).forEach(function (d) {
        d.px = d.x * w;
        for (var k = 0; k < 60; k++) {
          var lane = k % 2 ? (k + 1) / 2 : -k / 2;
          if (lanes[lane] === undefined || d.px - lanes[lane] >= R) { lanes[lane] = d.px; d.lane = lane; top = Math.max(top, Math.abs(lane)); break; }
        }
      });
      var H = (2 * top + 1) * R + 18;
      field.style.height = H + "px";
      dots.forEach(function (d) {
        d.el.style.left = d.px.toFixed(1) + "px";
        d.el.style.top = (H / 2 + d.lane * R).toFixed(1) + "px";
        d.el.style.setProperty("--dx", (one - d.px).toFixed(1) + "px");
      });
    }
    box.lay = lay;
    function on(d) {
      var p = d.p;
      tip.textContent = "";
      tip.appendChild(mk("b", "", cut(p.title, 72)));
      tip.appendChild(mk("span", "", PF[p.pf] + " · " + short(p.date) + " · " + fmt(p.basis === "likes" ? p.likes : p.views) + " " + p.basis + " · " + (p.r >= 1 ? times(p.r) + " its usual" : of(p.r) + " of its usual")));
      tip.hidden = false;
      var w = field.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.max(0, Math.min(w - tw, d.px - tw / 2)).toFixed(1) + "px";
      tip.style.top = (parseFloat(d.el.style.top) - th - 14).toFixed(1) + "px";
      d.el.classList.add("on");
    }
    function off(d) { tip.hidden = true; d.el.classList.remove("on"); }
    dots.forEach(function (d) {
      d.el.addEventListener("mouseenter", function () { on(d); });
      d.el.addEventListener("mouseleave", function () { off(d); });
    });
    if (window.ResizeObserver) new ResizeObserver(function () { lay(); }).observe(field);
    else window.addEventListener("resize", lay);
    return box;
  }

  // ---- What over- and underperformed ----
  function listPanel(over) {
    var rated = posts.filter(function (p) { return p.r !== null; });
    var list = rated.filter(function (p) { return over ? p.r >= 2 : p.r <= 0.5; }).sort(function (a, b) { return over ? b.r - a.r : a.r - b.r; });
    var box = panel(over ? "d-over" : "d-under", over ? "Overperforming" : "Underperforming", list.length + (list.length === 1 ? " post" : " posts") + (over ? " at twice its usual or more" : " at half its usual or less"));
    if (!list.length) { box.appendChild(mk("p", "dim", over ? "No post has reached twice its platform's usual yet." : "No post has fallen to half its platform's usual.")); return box; }
    var top = list.slice(0, 5), ext = Math.abs(Math.log(top[0].r)) || 1, ol = mk("ol", "crea");
    top.forEach(function (p, i) {
      var li = mk("li", "rise"), a = mk("a", "cr"), mid = mk("span", "cr-t"), meta = mk("span", "meta"), right = mk("span", "cr-r"), n = p.basis === "likes" ? p.likes : p.views;
      li.style.setProperty("--d", (0.06 + i * 0.06).toFixed(2) + "s");
      a.href = "#" + (p.anchor || "posts");
      a.setAttribute("aria-label", p.title + ", " + PF[p.pf] + ", " + fmt(n) + " " + p.basis + ", " + (over ? times(p.r) + " its usual" : of(p.r) + " of its usual"));
      a.appendChild(thumb(p.anchor));
      mid.appendChild(mk("span", "t", p.title));
      meta.appendChild(ico(p.pf)); meta.appendChild(mk("span", "", short(p.date) + " · " + fmt(n) + " " + p.basis));
      mid.appendChild(meta); a.appendChild(mid);
      right.appendChild(count((over ? "o." : "u.") + p.anchor + "." + p.pf, p.r, 1, over ? "x" : "of"));
      right.appendChild(bar("rbar", Math.max(0.05, Math.abs(Math.log(p.r)) / ext), 0.16 + i * 0.06));
      a.appendChild(right); li.appendChild(a); ol.appendChild(li);
    });
    box.appendChild(ol);
    return box;
  }

  // ---- Creatives to make: what wins, what to remake, and today's pick from the idea list ----
  var tt = by.tiktok;
  function makePanel() {
    var box = panel("d-make", "Creatives to make", "From what has worked so far, and your own ideas"), grid = mk("div", "mk3");
    var c1 = mk("div", "mk-col"), G = {}, best = [], worst = [];
    c1.appendChild(mk("h4", "", "What wins on TikTok"));
    if (tt && tt.usual) {
      pats.forEach(function (p) { if (p.n >= 3) { p.r = p.usual / tt.usual; (G[p.group] = G[p.group] || []).push(p); } });
      Object.keys(G).forEach(function (g) {
        var l = G[g].slice().sort(function (a, b) { return b.r - a.r; });
        if (l[0].r >= 1.1) best.push(l[0]);
        if (l.length > 1 && l[l.length - 1].r <= 0.9) worst.push(l[l.length - 1]);
      });
      best.sort(function (a, b) { return b.r - a.r; });
      worst.sort(function (a, b) { return a.r - b.r; });
    }
    if (best.length) {
      var recipe = mk("div", "recipe rise");
      recipe.style.setProperty("--d", "0.05s");
      best.forEach(function (p) { recipe.appendChild(mk("span", "pill", p.label)); });
      c1.appendChild(recipe);
      var ul = mk("ul", "wins"), ext = Math.log(best[0].r) || 1;
      best.forEach(function (p, i) {
        var li = mk("li", "rise"), l = mk("span", "l");
        li.style.setProperty("--d", (0.1 + i * 0.06).toFixed(2) + "s");
        l.appendChild(mk("span", "wg", GROUP[p.group] || p.group)); l.appendChild(txt(p.label));
        li.appendChild(l); li.appendChild(count("w." + p.group, p.r, 1, "x"));
        li.appendChild(bar("rbar", Math.max(0.05, Math.log(p.r) / ext), 0.18 + i * 0.06));
        li.title = p.label + ": the usual post got " + fmt(p.usual) + " views, over " + p.n + " posts";
        ul.appendChild(li);
      });
      c1.appendChild(ul);
      if (worst.length) c1.appendChild(mk("p", "lags", "Trails: " + worst.slice(0, 3).map(function (p) { return p.label + " " + times(p.r); }).join(", ") + "."));
      c1.appendChild(mk("p", "dnote", "Against the usual TikTok post, " + fmt(tt.usual) + " views. Small groups, so take it as a lean."));
    } else c1.appendChild(mk("p", "dim small", "What is working fills this once three posts share a kind, an opening, a length or a day."));
    grid.appendChild(c1);
    var c2 = mk("div", "mk-col");
    c2.appendChild(mk("h4", "", "Remake in the new style"));
    if (remakes.length) {
      var ol = mk("ol", "crea"), calls = 0;
      remakes.slice(0, 3).forEach(function (r, i) {
        var li = mk("li", "rise"), a = mk("a", "cr"), mid = mk("span", "cr-t"), bits = r.sub.split(/,\s+/).filter(function (x) { if (/your call/i.test(x)) { calls++; return false; } return !!x; });
        li.style.setProperty("--d", (0.1 + i * 0.06).toFixed(2) + "s");
        a.href = "#" + r.anchor;
        a.appendChild(thumb(r.anchor));
        mid.appendChild(mk("span", "t", r.title)); mid.appendChild(mk("span", "meta", bits.join(" \u00b7 ")));
        a.appendChild(mid); li.appendChild(a); ol.appendChild(li);
      });
      c2.appendChild(ol);
      c2.appendChild(mk("p", "dnote", "The idea did the work, so the idea is what gets remade." + (calls ? " " + (calls === 1 ? "One needs" : calls + " need") + " your call first, in Go through them." : "")));
    } else c2.appendChild(mk("p", "dim small", "Nothing to remake yet."));
    grid.appendChild(c2);
    var c3 = mk("div", "mk-col pick");
    c3.id = "dash-pick";
    grid.appendChild(c3);
    box.appendChild(grid);
    return box;
  }
  function ideaRows() {
    var out = [];
    store.ideas.forEach(function (i) {
      if (String(i.kind || "") === "note") return;
      if (Array.isArray(i.items)) i.items.forEach(function (x, k) {
        x = x || {};
        if (Number(x.n) > 0) out.push({ key: i.id + "." + k, n: Number(x.n), hook: String(x.hook || ""), pf: Array.isArray(x.pf) ? x.pf.map(String) : [], pick: !!x.pick, clergy: !!x.clergy });
      });
      else if (Number(i.n) > 0) out.push({ key: i.id, n: Number(i.n), hook: String(i.hook || i.text || ""), pf: Array.isArray(i.pf) ? i.pf.map(String) : [], pick: !!i.pick, clergy: !!i.clergy });
    });
    return out.map(function (r) {
      r.rec = !!(store.state["vo." + r.key] || {}).done;
      r.score = (r.pick ? 4 : 0) + (r.rec ? 2 : 0) + (r.clergy ? 0 : 1);
      return r;
    }).sort(function (a, b) { return b.score - a.score || a.n - b.n; });
  }
  var pickAt = null, pickRows = [];
  function paintPick(animate) {
    var col = document.getElementById("dash-pick");
    if (!col) return;
    pickRows = ideaRows();
    col.textContent = "";
    col.appendChild(mk("h4", "", "Today's pick from your ideas"));
    if (!pickRows.length) { col.appendChild(mk("p", "dim small", "Your ideas load from the board's store when the page is open and signed in.")); return; }
    if (pickAt === null || pickAt >= pickRows.length) pickAt = dayIndex() % Math.min(7, pickRows.length);
    var r = pickRows[pickAt], body = mk("div", "pick-b" + (animate && !still ? " in" : "")), tags = mk("div", "row"), act = mk("div", "row");
    body.appendChild(mk("span", "pick-n", "Idea " + r.n));
    body.appendChild(mk("p", "pick-h", r.hook));
    r.pf.forEach(function (p) { if (PFI[p]) tags.appendChild(ico(PFI[p])); });
    if (r.pick) tags.appendChild(mk("span", "pill violet", "Your pick"));
    if (r.rec) tags.appendChild(mk("span", "pill good", "Voice recorded"));
    if (tags.childNodes.length) body.appendChild(tags);
    col.appendChild(body);
    var go = mk("a", "btn small", "Open in the voice list"), nx = mk("button", "btn small", "Another idea");
    go.href = "#voice"; go.setAttribute("data-vo-go", r.key);
    nx.type = "button"; nx.setAttribute("data-pick", "next");
    act.appendChild(go); act.appendChild(nx);
    col.appendChild(act);
  }

  // ---- Something new each day: one fact from the numbers, a different one every morning ----
  function L(s) {
    var out = [], re = /\{([^}]*)\}/g, last = 0, m;
    while ((m = re.exec(s))) { if (m.index > last) out.push([s.slice(last, m.index), 0]); out.push([m[1], 1]); last = re.lastIndex; }
    if (last < s.length) out.push([s.slice(last), 0]);
    return out;
  }
  function facts() {
    var out = [], yt = by.youtube, ig = by.instagram, rated = posts.filter(function (p) { return p.r !== null; });
    var top = rated.slice().sort(function (a, b) { return b.r - a.r; })[0];
    if (top && top.r >= 2) out.push(quote(top.title, 64) + " got {" + times(top.r) + "} the " + top.basis + " of a usual " + PF[top.pf] + " post.");
    var G = {};
    if (tt && tt.usual) pats.forEach(function (p) { if (p.n >= 3) (G[p.group] = G[p.group] || []).push(p); });
    Object.keys(G).forEach(function (g) {
      var l = G[g].slice().sort(function (a, b) { return b.usual - a.usual; }), h = l[0], w = l[l.length - 1], rh = h.usual / tt.usual, rl = w.usual / tt.usual, tail = l.length > 1 && rl <= 0.9;
      if (rh < 1.1) return;
      var H = bare(h.label), W = bare(w.label);
      if (g === "kind") out.push("{" + H + "} is the kind that wins: {" + times(rh) + "} the usual TikTok post." + (tail ? " {" + W + "} gets {" + times(rl) + "}." : ""));
      else if (g === "how it opens") out.push("Opening with {" + low(H) + "} gets {" + times(rh) + "} the usual TikTok post." + (tail ? " Opening with {" + low(W) + "} gets {" + times(rl) + "}." : ""));
      else if (g === "length") out.push("Posts {" + low(H) + "} get {" + times(rh) + "} the usual TikTok post." + (tail ? " Posts {" + low(W) + "} get {" + times(rl) + "}." : ""));
      else if (g === "the day it went up") out.push("Posts that went up on a {" + H + "} got {" + times(rh) + "} the usual TikTok post." + (tail ? " On a {" + W + "}, {" + times(rl) + "}." : ""));
      else if (g === "hashtag") out.push("Posts tagged {" + H + "} get {" + times(rh) + "} the usual TikTok post.");
      else out.push("{" + H + "} gets {" + times(rh) + "} the usual TikTok post.");
    });
    if (tt && tt.views) {
      var tv = posts.filter(function (p) { return p.pf === "tiktok" && p.views !== null; }).map(function (p) { return p.views; }).sort(function (a, b) { return b - a; });
      if (tv.length >= 6) out.push("The top 3 TikTok posts hold {" + pc(sum(tv.slice(0, 3)) / tt.views) + "} of all TikTok views.");
    }
    if (rated.length >= 6) out.push("{" + rated.filter(function (p) { return p.r >= 2; }).length + "} of {" + rated.length + "} posts with numbers did twice their platform's usual or more. {" + rated.filter(function (p) { return p.r <= 0.5; }).length + "} did half or less.");
    var allF = sum(stats.map(function (s) { return s.followers; })), allV = sum(stats.map(function (s) { return s.views || 0; })), lead = stats.slice().sort(function (a, b) { return (b.views || 0) - (a.views || 0); })[0];
    if (lead && lead.views && allF && stats.length > 1) out.push(lead.name + " holds {" + pc(lead.views / allV) + "} of all views and {" + pc(lead.followers / allF) + "} of all followers.");
    var months = {};
    posts.forEach(function (p) { if (p.pf === "tiktok" && p.views !== null) (months[p.date.slice(0, 7)] = months[p.date.slice(0, 7)] || []).push(p.views); });
    var ms = Object.keys(months).filter(function (k) { return months[k].length >= 3; }).sort();
    if (ms.length >= 2) {
      var peak = ms.slice().sort(function (a, b) { return median(months[b]) - median(months[a]); })[0], latest = ms[ms.length - 1];
      if (peak !== latest) out.push("The usual TikTok post got {" + fmt(median(months[peak])) + "} views in " + monthName(peak) + " and {" + fmt(median(months[latest])) + "} in " + monthName(latest) + ".");
      else out.push(monthName(latest) + " is the best month yet: the usual TikTok post got {" + fmt(median(months[latest])) + "} views.");
    }
    var kept = posts.filter(function (p) { return p.pf === "tiktok" && p.views >= 1000; }).map(function (p) { return { p: p, k: ((p.shares || 0) + (p.saves || 0)) / p.views * 1000 }; }).sort(function (a, b) { return b.k - a.k; });
    if (kept.length >= 6) out.push(quote(kept[0].p.title, 56) + " was saved or shared by {" + fmt(kept[0].k) + "} in every 1,000 viewers. The usual TikTok post: {" + fmt(median(kept.map(function (x) { return x.k; }))) + "}.");
    if (tt && tt.eng !== null) out.push("{" + pc(tt.eng) + "} of TikTok views end in a like, comment, share or save." + (yt && yt.eng !== null ? " On YouTube, {" + pc(yt.eng) + "}." : ""));
    var last = posts.map(function (p) { return p.date; }).sort().pop(), gap = ago(last);
    if (gap !== null && gap >= 7) {
      var per = {};
      posts.forEach(function (p) { var k = p.date.slice(0, 7); per[k] = (per[k] || 0) + 1; });
      var bm = Object.keys(per).sort(function (a, b) { return per[b] - per[a]; })[0];
      out.push("{" + gap + " days} since the last post. " + monthName(bm) + " had {" + per[bm] + "}.");
    }
    if (tt && yt && tt.usual && yt.usual) out.push("A usual TikTok post gets {" + times(tt.usual / yt.usual) + "} the views of a usual YouTube one.");
    if (tt && tt.views && tt.followers) out.push("TikTok has one follower for every {" + fmt(tt.views / tt.followers) + "} views.");
    if (ig && ig.posts && ig.numbered < ig.posts) out.push("Instagram shows numbers for {" + ig.numbered + "} of its {" + ig.posts + "} posts. Type the rest under What is working and the next sync counts them.");
    return out.map(L);
  }
  var FACTS = facts(), fAt = FACTS.length ? dayIndex() % FACTS.length : 0, ledeP = null, ledeN = null, ledeBusy = false;
  function setLede() {
    ledeP.textContent = "";
    FACTS[fAt].forEach(function (s) { ledeP.appendChild(s[1] ? mk("b", "", s[0]) : txt(s[0])); });
    ledeN.textContent = (fAt + 1) + " of " + FACTS.length;
  }
  function buildLede() {
    if (!FACTS.length) return;
    var nav = mk("div", "lede-nav"), b = mk("button", "btn small", "Next");
    ledeP = mk("p", "lede-t"); ledeN = mk("span", "lede-n");
    ledeP.setAttribute("aria-live", "polite");
    nav.appendChild(mk("span", "", new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })));
    nav.appendChild(ledeN);
    b.type = "button"; b.setAttribute("data-lede", "next");
    nav.appendChild(b);
    ledeBox.textContent = "";
    ledeBox.appendChild(ledeP); ledeBox.appendChild(nav);
    setLede();
    ledeBox.hidden = false;
    if (io) {
      ledeP.classList.add("wait");
      var lo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { lo.disconnect(); ledeP.classList.remove("wait"); ledeP.classList.add("in"); } });
      lo.observe(ledeBox);
    }
  }
  function nextLede() {
    if (!ledeP || ledeBusy || FACTS.length < 2) return;
    fAt = (fAt + 1) % FACTS.length;
    if (still) { setLede(); return; }
    ledeBusy = true;
    ledeP.classList.remove("in"); ledeP.classList.add("out");
    setTimeout(function () { ledeP.classList.remove("out"); setLede(); void ledeP.offsetWidth; ledeP.classList.add("in"); ledeBusy = false; }, 220);
  }

  // ---- Draw ----
  var P = { plat: platPanel(), day: dayPanel(), strip: stripPanel(), over: listPanel(true), under: listPanel(false), make: makePanel() };
  ["plat", "day", "strip", "over", "under", "make"].forEach(function (k) { dash.appendChild(P[k]); });
  dash.hidden = false;
  ["plat", "day", "strip", "over", "under", "make"].forEach(function (k) { arm(P[k]); });
  if (P.strip.lay) P.strip.lay();
  paintPick(false);
  buildLede();

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-lede], [data-pick], [data-vo-go]") : null;
    if (!t || !dash.parentNode.contains(t)) return;
    if (t.hasAttribute("data-lede")) { nextLede(); return; }
    if (t.hasAttribute("data-pick")) { if (pickRows.length) { pickAt = (pickAt + 1) % pickRows.length; paintPick(true); var nb = q("#dash-pick [data-pick]"); if (nb) nb.focus(); } return; }
    var key = t.getAttribute("data-vo-go");
    setTimeout(function () {
      var row = qa("#voice-groups [data-vo]").filter(function (r) { return r.getAttribute("data-vo") === key; })[0];
      if (!row) return;
      row.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
      row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
    }, 80);
  });

  // The store: re-read on every change, and the day's reading written once if it is not there yet.
  var soonT = 0;
  function refresh() {
    P.day = swap(P.day, dayPanel());
    P.plat = swap(P.plat, platPanel());
    paintPick(false);
  }
  function soon() { clearTimeout(soonT); soonT = setTimeout(refresh, 80); }
  function record() {
    if (wrote || !db || !base || !daysIn) return;
    wrote = true;
    if (store.days[base.date]) return;
    var body = JSON.parse(JSON.stringify(base));
    body.at = new Date().toISOString(); body.filed = false;
    try { db.doc("days/" + base.date).set(body).then(null, function () { /* a view that cannot save */ }); } catch (e) { /* a view that cannot save */ }
  }
  if (window.claude && window.claude.use) window.claude.use("db").then(function (d) {
    if (!d) return;
    db = d;
    ["decisions", "posted", "state", "days"].forEach(function (name) {
      d.collection(name).onSnapshot(function (s) { store[name] = keyed(s); if (name === "days") { daysIn = true; record(); } soon(); }, function () {});
    });
    d.collection("ideas").onSnapshot(function (s) { store.ideas = s.docs.map(function (x) { var v = x.data() || {}; v.id = x.id; return v; }); soon(); }, function () {});
  }, function () {});
})();
