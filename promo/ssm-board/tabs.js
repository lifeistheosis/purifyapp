// Tabs (Oct 8, owner: "I don't want to scroll down and see a bunch of titles and a bunch of text"). The
// sections list shows one part of the board at a time; any #link opens the part that holds its target.
// Without this script the page shows every section, as before. Port it into ssm/ with the voice list.
(function () {
  var root = document.documentElement, main = document.querySelector("main"), nav = document.querySelector(".jump");
  if (!main || !nav || !main.closest) return;
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var tabs = links.map(function (a) { return a.getAttribute("href").slice(1); });
  var secs = Array.prototype.slice.call(main.children).filter(function (e) { return e.tagName === "SECTION"; });
  var JOIN = { audience: "accounts", "The funnel": "works", "What goes where": "works" };
  var last = tabs[0];
  secs.forEach(function (sec) {
    var h = sec.querySelector("h2"), name = h ? h.textContent.trim() : "";
    var tab = tabs.indexOf(sec.id) !== -1 ? sec.id : (JOIN[sec.id] || JOIN[name] || last);
    sec.setAttribute("data-tab", tab);
    if (tabs.indexOf(sec.id) !== -1) last = sec.id;
  });
  function show(tab, target) {
    if (tabs.indexOf(tab) === -1) tab = tabs[0];
    secs.forEach(function (s) { s.classList.toggle("on", s.getAttribute("data-tab") === tab); });
    links.forEach(function (a) {
      var on = a.getAttribute("href") === "#" + tab;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    try { window.localStorage.setItem("ssm.tab", tab); } catch (e) { /* a private window: the tab is not remembered */ }
    if (target) target.scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
  }
  function home(el) { while (el && el.parentNode !== main) el = el.parentNode; return el && el.tagName === "SECTION" ? el : null; }
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute("href").slice(1), el = id && document.getElementById(id), sec = home(el);
    if (!sec) return;
    ev.preventDefault();
    show(sec.getAttribute("data-tab"), el === sec ? null : el);
  });
  Array.prototype.forEach.call(document.querySelectorAll(".say, .ask p, .why"), function (e) { if (!e.title) e.title = e.textContent.trim(); });
  root.setAttribute("data-tabs", "1");
  var id0 = window.location.hash.slice(1), el0 = id0 && document.getElementById(id0), sec0 = home(el0), kept = null;
  try { kept = window.localStorage.getItem("ssm.tab"); } catch (e) { kept = null; }
  show(sec0 ? sec0.getAttribute("data-tab") : (kept || tabs[0]), sec0 && el0 !== sec0 ? el0 : null);
})();
