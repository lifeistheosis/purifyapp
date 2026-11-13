// Round 2's stills: the first launch's questions, Prayers and Discover.
// node plans.mjs <scratchpad>  ->  plan-before.json, plan-after.json (for tools/shots.mjs)
import fs from "node:fs";
const S = process.argv[2];
const NEW = { "purify:secondchance.done": "1" };
const morning = "2026-11-13T08:30:00";
// A reader at the first launch: nothing answered, the A/B seed fixed so both exports ask in the same order.
const FIRST = { "purify:onboarded": "0", "purify:ab.seed": "0.42" };
const inDialog = (pick) => `(() => { const d = document.querySelector('[role=dialog]'); ${pick} })()`;
const begin = { eval: inDialog(`[...d.querySelectorAll('button.bg-paper')].pop()?.click();`) };
// The account step stands second or last by the test's arm: pass it when it is here.
const pastAccount = { eval: inDialog(`[...d.querySelectorAll('button')].find((b) => /without an account/i.test(b.textContent))?.click();`) };
const row = (n) => ({ eval: inDialog(`d.querySelectorAll('[data-choice-row], .ob-pill, .ob-choice')[${n}]?.click();`) });
const pause = (ms) => ({ wait: ms });
const toQ1 = [begin, pause(1300), pastAccount, pause(1300)];
const toQ1Chosen = [...toQ1, row(0), pause(900)];
const toQ2 = [...toQ1Chosen, begin, pause(1400)];
const toQ3 = [...toQ2, row(0), pause(2200)];
const toQ4 = [...toQ3, begin, pause(1500)];
const q = (name, steps, more = {}) => ({ name, to: "/", clock: morning, wait: 6500, set: FIRST, steps, ...more });
const questions = [q("welcome", []), q("q1", toQ1), q("q1-chosen", toQ1Chosen), q("q2", toQ2), q("q3", toQ3), q("q4", toQ4)];
const screens = [
  { name: "prayers", to: "/prayers", full: true, clock: morning, wait: 4000, set: NEW },
  { name: "discover", to: "/discover", full: true, clock: morning, wait: 4000, set: NEW },
];
const before = [...questions, ...screens].map((s) => ({ ...s, check: false }));
const AR = { "CapacitorStorage.purify_locale": "ar" };
const after = [
  ...questions,
  ...screens,
  { name: "discover-new", to: "/discover", clock: morning, wait: 4000, set: { ...NEW, "purify:level": "inquirer" } },
  q("q1-chosen-ar", toQ1Chosen, { set: { ...FIRST, ...AR } }),
  { name: "prayers-ar", to: "/prayers", clock: morning, wait: 4000, set: { ...NEW, ...AR } },
  { name: "discover-ar", to: "/discover", clock: morning, wait: 4000, set: { ...NEW, ...AR } },
  q("q1-chosen-800", toQ1Chosen, { width: 800, height: 1180 }),
  { name: "prayers-800", to: "/prayers", clock: morning, wait: 4000, set: NEW, width: 800, height: 1180 },
  { name: "discover-800", to: "/discover", clock: morning, wait: 4000, set: NEW, width: 800, height: 1180 },
];
fs.writeFileSync(`${S}/plan2-before.json`, JSON.stringify(before));
fs.writeFileSync(`${S}/plan2-after.json`, JSON.stringify(after));
console.log(before.length, "before,", after.length, "after");
