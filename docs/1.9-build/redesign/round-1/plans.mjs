import fs from "node:fs";
const S = process.argv[2];
const NEW = { "purify:secondchance.done": "1" };
const morning = "2026-11-13T08:30:00";
const deeper = { eval: "window.scrollTo(0, document.getElementById('go-deeper').getBoundingClientRect().top + scrollY - 70)" };
const common = [
  { name: "theology", to: "/theology" },
  { name: "theology-deeper", to: "/theology", steps: [deeper] },
  { name: "heresies", to: "/heresies" },
  { name: "plans", to: "/plans" },
  { name: "saint", to: "/saints/john-chrysostom" },
];
const before = [{ name: "today", to: "/", full: true, clock: morning, wait: 5000, set: NEW }, ...common];
const after = [
  { name: "today", to: "/", full: true, clock: morning, wait: 5000, set: NEW },
  { name: "today-streak", to: "/", clock: morning, wait: 5000, set: { ...NEW, "purify.prayers.morning.dates": JSON.stringify(["2026-11-10", "2026-11-11", "2026-11-12"]) } },
  { name: "today-fast", to: "/", clock: "2026-11-20T19:30:00", wait: 5000, set: { ...NEW, "purify.prayers.morning.dates": JSON.stringify(["2026-11-17", "2026-11-18", "2026-11-19"]) } },
  { name: "today-800", to: "/", clock: morning, wait: 5000, set: NEW, width: 800, height: 1180 },
  { name: "today-1032", to: "/", clock: morning, wait: 5000, set: NEW, width: 1032, height: 800 },
  { name: "today-ar", to: "/", clock: morning, wait: 5000, set: { ...NEW, "CapacitorStorage.purify_locale": "ar" } },
  ...common,
];
fs.writeFileSync(`${S}/plan-before.json`, JSON.stringify(before));
fs.writeFileSync(`${S}/plan-after.json`, JSON.stringify(after));
