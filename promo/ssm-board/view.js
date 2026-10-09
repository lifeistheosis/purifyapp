
// What the owner sees and what Claude reads (Oct 9, owner: "a lot of the info plastered is so you can actually
// reference these things ... make it distinct from what I see and what you actually read. You read the full thing, the
// full data. Me, I want to see a simplified, clean sheet"). Nothing leaves the page. The simple view, the default, hides
// reference text from the eye through the stylesheet; the source of the page, which Claude and the morning check read,
// keeps every word. The switch in the header shows the full sheet on this browser. This script marks the reference text
// a stylesheet cannot find by itself (by its heading or its column), with class "ref", and draws the switch.
(function () {
  var root = document.documentElement;
  function qa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  var view = "simple";
  try { view = window.localStorage.getItem("ssm.view") === "full" ? "full" : "simple"; } catch (e) { view = "simple"; }
  root.setAttribute("data-view", view);
  // Reference by heading: the cards that restate what is elsewhere.
  var REF = ["How the most seen ones open"];
  qa("main > section .card").forEach(function (c) {
    var h = c.querySelector("h3");
    if (h && REF.indexOf(h.textContent.trim()) !== -1) c.classList.add("ref");
  });
  // Reference by column: the counts that only feed the other numbers.
  qa("#posts table").forEach(function (t) {
    var heads = qa("th", t).map(function (th) { return th.textContent.trim().toLowerCase(); });
    ["comments", "shares", "saves"].forEach(function (name) {
      var k = heads.indexOf(name);
      if (k < 0) return;
      qa("tr", t).forEach(function (tr) { var c = tr.children[k]; if (c) c.classList.add("ref"); });
    });
  });
  // The switch: Simple or Full.
  var row = document.querySelector("main > header .row");
  if (!row) return;
  var seg = document.createElement("div");
  seg.className = "seg view-seg"; seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "How much the board shows");
  [["simple", "Simple"], ["full", "Full"]].forEach(function (v) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = v[1]; b.setAttribute("data-view", v[0]);
    b.setAttribute("aria-pressed", String(view === v[0]));
    b.title = v[0] === "simple" ? "The clean sheet: what you need at a glance" : "Everything, including the reference text Claude reads";
    b.addEventListener("click", function () {
      view = v[0];
      root.setAttribute("data-view", view);
      try { window.localStorage.setItem("ssm.view", view); } catch (e) { /* a private window: the choice lasts for this visit */ }
      qa("button", seg).forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-view") === view)); });
    });
    seg.appendChild(b);
  });
  var mb = row.querySelector(".motion-btn");
  if (mb) row.insertBefore(seg, mb); else row.appendChild(seg);
})();
