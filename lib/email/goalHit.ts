import { button, esc, pen, quietButton, shell, type Assets } from "./kit";
import { KIT_DARK, SANS } from "./theme";

/**
 * The email when he hits a goal (his word, 2026-11-24: "build the sender"),
 * drawn as the kit's builder draws it (docs/brand/kit/email/build.mjs,
 * milestone(), his yes of the same day: "new font but this is fine") and held
 * to it character for character by lib/email/__tests__/goalHit.test.ts. The
 * goal hit, celebrated and nothing else: its mark (the app's check in a circle
 * of the level's tier colour, public/email/level-N.png), "Congratulations",
 * the goal by name, its level and its amount, one button. The panel does the
 * explaining. His own mail, as the owner's brief is: no reader's Unsubscribe;
 * its switch is on his Goals page.
 */

export type GoalHit = {
  level: number;
  /** 1 (Easy, green) to 5 (Mythic, gold): the colour of its mark. */
  tier: number;
  name: string;
  /** Its amount, in words: "$750 a week". */
  amount: string;
  /** The day, as the masthead says it: "Monday, May 17". */
  date: string;
};

/** "You hit halfway", "You hit the first mark", and a name he gave a mark as he gave it. */
export const goalWords = (name: string) => (/^(The|A|An) /.test(name) || name === "Halfway" ? name.charAt(0).toLowerCase() + name.slice(1) : name);

export function goalHitEmail(m: GoalHit, links: { admin: string }, assets: Assets & { mark: string }): { subject: string; html: string } {
  const p = pen(KIT_DARK);
  const { c } = p;
  const mark = `<img class="only-dark" src="${assets.mark}" width="96" height="96" alt="" style="display:block;border:0;outline:none;margin:0 auto">`;
  const hit = `<tr><td align="center" style="padding:52px 0 0;text-align:center">
  ${mark}
  <p${c({ fg: "quiet" }, `margin:26px 0 0;font-family:${SANS};font-size:15px;line-height:20px;font-weight:600;`)}>Congratulations</p>
  <h1${c({ fg: "ink", cls: "e-title" }, `margin:8px 0 0;font-family:${SANS};font-size:36px;line-height:42px;font-weight:700;letter-spacing:-0.02em;`)}>You hit ${esc(goalWords(m.name))}</h1>
  <p${c({ fg: "quiet" }, `margin:10px 0 0;font-family:${SANS};font-size:15px;line-height:22px;`)}>Level ${m.level} · ${esc(m.amount)}</p>
</td></tr>`;
  const subject = `You hit ${m.name}`;
  const html = shell(p, {
    title: subject,
    preheader: `Congratulations: level ${m.level}, ${m.amount}.`,
    kind: m.date,
    rows: [hit, `<tr><td align="center" style="padding:36px 0 8px;text-align:center">${button(p, { href: `${links.admin}#tab=goals`, text: "Open your goals" })}</td></tr>`],
    foot: `<p style="margin:0">${quietButton(p, { href: `${links.admin}#tab=goals`, text: "Turn these off" })}</p>`,
    assets,
  });
  return { subject, html };
}
