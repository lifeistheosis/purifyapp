
// Animations (Oct 8, owner: "I don't see transitions. I don't see animations. I don't see things glowing. I want to see
// that"). The board moves unless its own switch, in the header, is set to off for this browser: it no longer stands
// still just because the device asks for reduced motion, since the owner asked for the motion. The gate opens once the
// page and its fonts are in, so an entrance plays when there is something to see.
(function () {
  var off = false, root = document.documentElement;
  try { off = window.localStorage.getItem("ssm.motion") === "off"; } catch (e) { off = false; }
  root.setAttribute("data-motion", off ? "off" : "on");
  window.ssmGate = new Promise(function (resolve) {
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready.then(null, function () {}) : Promise.resolve();
    var loaded = document.readyState === "complete" ? Promise.resolve() : new Promise(function (r) { window.addEventListener("load", r); });
    var done = false;
    function go() { if (!done) { done = true; setTimeout(resolve, 140); } }
    Promise.all([fonts, loaded]).then(go, go);
    setTimeout(go, 1600);
  });
})();
