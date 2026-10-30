import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { RemindersOn, clockTime, type ReminderTimes } from "@/components/onboarding/RemindersOn";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";
import { serviceArt } from "@/lib/prayers/serviceArt";
import { NOTIFICATION_COPY } from "@/lib/push/copy";
import { EVENING_DEFAULT, MORNING_DEFAULT } from "@/lib/push/client";

/**
 * The moment reminders turn on, as it is drawn (1.8, the owner's pick C of
 * round 3: Homebase/boards/purify-master/variants/r3-08-reminders-on.png and
 * its video, the right-hand phone). The reminders themselves as Purify's own
 * cards on the day's line, the times the ones just switched on, the words the
 * pushes' own, on the sheet's clock.
 */

type ProviderProps = Parameters<typeof MessagesProvider>[0];

const SET: ReminderTimes = { morning: MORNING_DEFAULT, evening: EVENING_DEFAULT };

function draw({ times = SET, fresh = true, locale = "en" }: { times?: ReminderTimes; fresh?: boolean; locale?: string } = {}): string {
  return renderToStaticMarkup(
    createElement(
      MessagesProvider,
      { locale, messages: getMessages(locale) } as ProviderProps,
      createElement(RemindersOn, { times, fresh, onContinue: () => {} }),
    ),
  );
}

/** A string as React writes it into HTML. */
const html = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const en = getMessages("en");
const CSS = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const FLOW = fs.readFileSync(path.join(process.cwd(), "components/onboarding/OnboardingFlow.tsx"), "utf8");
const KINDS = ["morning", "evening"] as const;

/** The reminders' list items, in the order drawn. */
const items = (drawn: string) => [...drawn.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);

describe("the moment reminders turn on", () => {
  it("keeps the question's heading, says they are on, and shows the two reminders as cards, then Continue", () => {
    const drawn = draw();
    expect(drawn).toContain(">" + html(en["onboard.reminders.eyebrow"]) + "<");
    expect(drawn).toContain(">" + html(en["onboard.reminders.title"]) + "</h2>");
    expect(drawn).toMatch(new RegExp(`<p role="status"[^>]*>${html(en["onboard.reminders.done"])}</p>`));
    const list = items(drawn);
    expect(list).toHaveLength(2);
    KINDS.forEach((kind, i) => {
      expect(list[i], kind).toContain(`src="${serviceArt(kind).src}"`);
      expect(list[i], kind).toContain(">" + en[`onboard.reminders.${kind}Title`] + "<");
      expect(list[i], kind).toContain(">" + en[`onboard.reminders.${kind}Body`] + "<");
    });
    // The way on, at the foot, the full white button.
    const buttons = [...drawn.matchAll(/<button[^>]*>([^<]*)<\/button>/g)];
    expect(buttons.at(-1)?.[1]).toBe(en["onboard.continue"]);
    expect(buttons.at(-1)?.[0]).toMatch(/\bbg-paper\b[^"]*\btext-night\b/);
  });

  it("shows the times just switched on, as the reader's language tells the time", () => {
    const drawn = draw();
    expect(drawn).toMatch(new RegExp(`<time dateTime="${MORNING_DEFAULT}"[^>]*>${clockTime(MORNING_DEFAULT, "en")}</time>`, "i"));
    expect(drawn).toMatch(new RegExp(`<time dateTime="${EVENING_DEFAULT}"[^>]*>${clockTime(EVENING_DEFAULT, "en")}</time>`, "i"));
    expect(clockTime("07:00", "en")).toMatch(/^7:00\sAM$/);
    expect(clockTime("21:00", "en")).toMatch(/^9:00\sPM$/);
    expect(clockTime("21:00", "de")).toBe("21:00");
    // Whatever times it is handed, never a sample.
    const other = draw({ times: { morning: "06:30", evening: "22:15" } });
    expect(other).toMatch(/<time dateTime="06:30"[^>]*>6:30\sAM<\/time>/i);
    expect(other).toMatch(/<time dateTime="22:15"[^>]*>10:15\sPM<\/time>/i);
    expect(other).not.toContain(clockTime("07:00", "en"));
  });

  it("says in each card what the lock screen will say", () => {
    // The words are the pushes' own (lib/push/copy.ts). The pushes are
    // English only, so this holds the English; every other catalog carries
    // the same words in its own language.
    for (const kind of KINDS) {
      expect(en[`onboard.reminders.${kind}Title`], kind).toBe(NOTIFICATION_COPY[kind].title);
      expect(en[`onboard.reminders.${kind}Body`], kind).toBe(NOTIFICATION_COPY[kind].body);
    }
  });

  it("is in every language Purify speaks", () => {
    const keys = KINDS.flatMap((kind) => [`onboard.reminders.${kind}Title`, `onboard.reminders.${kind}Body`]);
    for (const { code } of LOCALES) {
      const messages = getMessages(code);
      const drawn = draw({ locale: code });
      for (const key of keys) {
        expect(messages[key], `${code} ${key}`).toBeTruthy();
        expect(drawn, `${code} ${key}`).toContain(html(messages[key]));
        if (code !== "en") expect(messages[key], `${code} ${key}`).not.toBe(en[key]);
      }
    }
  });

  it("lets the question go where it stood the moment Allow lands, and arrives as any step does when the reader comes back", () => {
    const fresh = draw();
    const leaving = /<div aria-hidden="true" class="ob-on-leave [^"]*"[^>]*>([\s\S]*?)<\/div><p role="status"/.exec(fresh);
    expect(leaving, "the question's leftovers").not.toBeNull();
    expect(leaving![0]).toMatch(/class="ob-on-leave pointer-events-none absolute inset-x-0 top-0 /);
    expect(leaving![1]).toContain(">" + html(en["onboard.reminders.body"]) + "<");
    expect(leaving![1]).toMatch(/<button[^>]*disabled=""[^>]*>…<\/button>/);
    expect(leaving![1]).toContain(">" + en["onboard.reminders.notNow"] + "<");
    // The heading stays put for the glide: no entrance of its own.
    expect(fresh).not.toContain("onboard-step-in");

    const back = draw({ fresh: false });
    expect(back).not.toContain("ob-on-leave");
    expect(back).toMatch(/<p class="onboard-step-in mb-3 [^"]*" style="animation-delay:70ms">/);
    expect(back).toMatch(/<h2 class="onboard-step-in text-title [^"]*" style="animation-delay:130ms">/);
  });

  it("draws its heading exactly as the question does, so the glide never jumps", () => {
    const drawn = draw();
    expect(drawn).toContain('<p class="mb-3 font-sans text-caption text-premium-ink/85">');
    expect(drawn).toContain('<h2 class="text-title font-bold leading-tight text-paper">');
    expect(FLOW).toContain('className="onboard-step-in mb-3 font-sans text-caption text-premium-ink/85"');
    expect(FLOW).toContain('className="onboard-step-in text-title font-bold leading-tight text-paper"');
    // The body the leftovers draw is the question's body.
    expect(FLOW).toContain('className={`onboard-step-in mt-3 font-sans text-ui leading-[1.6] text-paper/70 ');
    expect(drawn).toContain('<p class="mt-3 font-sans text-ui leading-[1.6] text-paper/70">');
  });

  it("moves on the sheet's clock: the line, the morning card and its mark, the evening card, the line drawn, its mark, then Continue", () => {
    const drawn = draw();
    const timed = [...drawn.matchAll(/class="(ob-on-[a-z]+|ob-rise)[^"]*" style="animation-delay:(\d+)ms"/g)].map(
      ([, cls, ms]) => `${cls} ${ms}`,
    );
    // In the order drawn: each item's line and mark come before its time and card.
    expect(timed).toEqual([
      "ob-on-fade 180",
      "ob-on-line 900",
      "ob-on-mark 540",
      "ob-on-fade 380",
      "ob-on-card 380",
      "ob-on-mark 1040",
      "ob-on-fade 880",
      "ob-on-card 880",
      "ob-rise 1750",
    ]);
  });

  it("is drawn in the page's own tokens, with no yellow or gold, the cards following the palette", () => {
    for (const drawn of [draw(), draw({ fresh: false })]) {
      expect(drawn).not.toMatch(/gold|yellow|amber|festal/);
    }
    const cards = [...draw().matchAll(/class="(ob-on-card [^"]*)"/g)].map((m) => m[1]);
    expect(cards).toHaveLength(2);
    // lm-card: a lighter paper on Parchment and the card grey on True black.
    for (const c of cards) expect(c).toMatch(/\blm-card\b.*\bfrom-paper\/\[0\.06\] to-paper\/\[0\.03\]/);
    // The day's line and its marks are the prayers page's (DayTimeline).
    expect(draw()).toMatch(/class="ob-on-line absolute start-\[7px\] top-\[11px\] -bottom-\[27px\] w-px bg-paper\/15"/);
    expect(draw()).toMatch(/class="ob-on-mark absolute start-\[3px\] top-\[6\.5px\] size-\[9px\] rounded-full bg-paper"/);
  });
});

describe("its motion and its light", () => {
  it("lights each mark white, softly, and plainly in ink on Parchment", () => {
    expect(/\.ob-on-mark \{([^}]*)\}/.exec(CSS)?.[1]).toMatch(/0 0 10px rgb\(255 255 255 \/ 0\.\d+\)/);
    const parchment = /html\[data-reading-mode="parchment"\] \.ob-on-mark \{([^}]*)\}/.exec(CSS)?.[1];
    expect(parchment).toMatch(/box-shadow: 0 0 0 4px color-mix\(in oklab, var\(--color-paper\) \d+%, transparent\);/);
    expect(parchment).not.toMatch(/rgb\(255 255 255/);
  });

  it("fills every entrance backwards, so nothing is left holding a transform", () => {
    for (const cls of ["ob-on-fade", "ob-on-card"]) {
      expect(new RegExp(`\\.${cls} \\{ animation: ${cls} \\d+ms var\\(--ease-house\\) backwards; \\}`).test(CSS), cls).toBe(true);
    }
    for (const cls of ["ob-on-mark", "ob-on-line"]) {
      expect(new RegExp(`\\.${cls} \\{[^}]*animation: ${cls} \\d+ms var\\(--ease-house\\) backwards;`).test(CSS), cls).toBe(true);
    }
    // The line grows down from the first mark.
    expect(/\.ob-on-line \{[^}]*transform-origin: 50% 0;/.test(CSS)).toBe(true);
    // The leftovers fade and stay faded until they are taken away.
    expect(CSS).toMatch(/\.ob-on-leave \{ animation: ob-on-leave 220ms var\(--ease-house\) forwards; \}/);
  });

  it("stands finished at once when Purify's motion is off", () => {
    for (const cls of ["ob-on-leave", "ob-on-fade", "ob-on-card", "ob-on-mark", "ob-on-line"]) {
      expect(CSS, cls).toContain(`:where([data-motion="reduce"]) .${cls}`);
    }
    expect(CSS).toMatch(/:where\(\[data-motion="reduce"\]\) \.ob-on-leave \{\s*animation: none;\s*display: none;\s*\}/);
    // The glide is JavaScript, and playFlip asks for the motion setting itself.
    expect(fs.readFileSync(path.join(process.cwd(), "lib/ui/flip.ts"), "utf8")).toMatch(/if \(prefersReducedMotion\(\)\) return 0;/);
  });
});

describe("in the flow", () => {
  const step = FLOW.slice(FLOW.indexOf('{step === "reminders" &&'), FLOW.indexOf('{step === "handoff" &&'));

  it("switches on the times it then shows", () => {
    expect(FLOW).toMatch(/const times: ReminderTimes = \{ morning: MORNING_DEFAULT, evening: EVENING_DEFAULT \};/);
    expect(FLOW).toMatch(/await enablePush\(times\.morning, times\.evening\);/);
    expect(FLOW).toMatch(/setRemindersSet\(\{ times, fresh \}\);/);
    expect(step).toMatch(/<RemindersOn times=\{remindersSet\.times\} fresh=\{remindersSet\.fresh\} onContinue=\{next\} \/>/);
  });

  it("glides the heading from where the question stood", () => {
    expect(step).toContain('<div data-flip-key="reminders">');
    expect(FLOW).toMatch(/const from = measureRows\(stepRef\.current\);/);
    expect(FLOW).toMatch(/playFlip\(stepRef\.current, from, \{ durationMs: GLIDE_MS, easing: "var\(--ease-house\)" \}\);/);
    expect(fs.readFileSync(path.join(process.cwd(), "components/onboarding/RemindersOn.tsx"), "utf8")).toContain(
      '<div data-flip-key="reminders" className="flex flex-col">',
    );
  });

  it("no longer says anything in gold", () => {
    expect(step).not.toMatch(/gold/);
  });
});
