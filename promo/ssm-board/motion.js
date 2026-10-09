
// Motion for the whole board (Oct 8, owner: "I don't see transitions. I don't see animations. I don't see things
// glowing ... a little flair ... nothing in the background"). A part of the board rises into place when its tab opens,
// the sections list slides its marker to the open tab, Today plays its entrance again each time it opens, the numbers
// beside the Today title carry a live dot, and the header carries the Animations switch.
(function () {
  var root = document.documentElement, main = document.querySelector("main"), nav = document.querySelector(".jump");
  if (!main) return;
  var gate = window.ssmGate || Promise.resolve(), ready = false;
  function off() { return root.getAttribute("data-motion") === "off"; }
  var secs = Array.prototype.filter.call(main.children, function (e) { return e.tagName === "SECTION"; });
  function enter(sec) {
    if (off()) return;
    Array.prototype.forEach.call(sec.children, function (c, i) { c.style.setProperty("--i", String(Math.min(i, 8))); });
    sec.classList.remove("enter"); void sec.offsetWidth; sec.classList.add("enter");
    clearTimeout(sec.enterT);
    sec.enterT = setTimeout(function () { sec.classList.remove("enter"); }, 1500);
  }
  function opened(sec) {
    enter(sec);
    if (sec.id === "waiting") document.dispatchEvent(new CustomEvent("ssm:today"));
  }
  // The marker under the open tab, one element that slides from tab to tab.
  var ind = null;
  if (nav) {
    ind = document.createElement("span");
    ind.className = "jump-ind"; ind.setAttribute("aria-hidden", "true");
    nav.insertBefore(ind, nav.firstChild);
    if (getComputedStyle(nav).position === "static") nav.style.position = "relative";
    nav.classList.add("has-ind");
  }
  function place(instant) {
    if (!ind) return;
    var a = nav.querySelector("a.on");
    if (!a || !a.offsetWidth) { ind.style.opacity = "0"; return; }
    var jump = instant || off() || ind.style.opacity !== "1";
    if (jump) ind.classList.add("no-t");
    ind.style.width = a.offsetWidth + "px";
    ind.style.height = a.offsetHeight + "px";
    ind.style.transform = "translate(" + a.offsetLeft + "px," + a.offsetTop + "px)";
    ind.style.opacity = "1";
    if (jump) { void ind.offsetWidth; ind.classList.remove("no-t"); }
  }
  if (window.MutationObserver) {
    var mo = new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        var s = m.target, now = s.classList.contains("on"), was = (" " + (m.oldValue || "") + " ").indexOf(" on ") !== -1;
        if (now && !was && ready) opened(s);
      });
      place(false);
    });
    secs.forEach(function (s) { mo.observe(s, { attributes: true, attributeFilter: ["class"], attributeOldValue: true }); });
  }
  window.addEventListener("resize", function () { place(true); });
  place(true);
  // The numbers beside the Today title are live: a dot that pings.
  var ts = document.getElementById("today-stats");
  if (ts && !ts.querySelector(".ts-live")) {
    var dot = document.createElement("span");
    dot.className = "ts-live"; dot.setAttribute("aria-hidden", "true");
    ts.insertBefore(dot, ts.firstChild);
  }
  // The switch: on by default; off stops every entrance, glow and slide on this browser.
  var row = document.querySelector("main > header .row");
  if (row) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "motion-btn";
    var label = function () { var on = !off(); b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "Animations on" : "Animations off"; };
    label();
    b.addEventListener("click", function () {
      var next = off() ? "on" : "off";
      root.setAttribute("data-motion", next);
      try { window.localStorage.setItem("ssm.motion", next); } catch (e) { /* a private window: the choice lasts for this visit */ }
      label();
      var s = main.querySelector("main > section.on");
      if (next === "on" && s) opened(s);
    });
    row.appendChild(b);
  }
  // First load: once the fonts are in, the open part of the board rises into place.
  gate.then(function () {
    ready = true;
    place(true);
    var s = main.querySelector("main > section.on");
    if (s) enter(s);
  });
})();
