import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The greeting as Today draws it, for each type of reader (1.8, the owner's
// round 14, transitionary), on 8 November (the Synaxis of the Archangel
// Michael) and 21 November (the Entry, a great feast, in the Nativity Fast).
// The reader's day and type are set here; everything else is the app's own:
// the calendar, the catalog, the Psalter's files. The hour is the server's
// morning, as the first drawing has it.

const live = vi.hoisted(() => ({
  today: null as Date | null,
  type: "orthodox" as "orthodox" | "learning" | "new",
}));
vi.mock("@/lib/calendar/useToday", () => ({ useToday: () => live.today }));
vi.mock("@/lib/onboarding/useReaderType", () => ({ useReaderType: () => live.type }));

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { GreetingHeader } from "@/components/today/GreetingHeader";
import { getMessages } from "@/lib/i18n";

import { loadHourVerses } from "../hourVerse.server";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const en = getMessages("en");
const html = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

async function draw(type: typeof live.type, today: Date | null): Promise<string> {
  live.type = type;
  live.today = today;
  const verses = await loadHourVerses();
  return renderToString(
    createElement(MessagesProvider, { locale: "en", messages: en } as ProviderProps, createElement(GreetingHeader, { verses })),
  );
}

const NOV_8 = new Date(Date.UTC(2026, 10, 8, 12));
const NOV_21 = new Date(Date.UTC(2026, 10, 21, 12));
const SYNAXIS = "Synaxis of the Holy Archangel Michael and All the Bodiless Powers";

describe("the greeting, drawn", () => {
  it("gives the Orthodox reader the feast, its marks, its icon, its hymns and the hour's prayers", async () => {
    const out = await draw("orthodox", NOV_8);
    expect(out).toContain("Sunday, November 8 · Feast · No fast");
    expect(out).toContain(SYNAXIS);
    expect(out).toContain('src="/saints/icons/archangel-michael.v2.jpg"');
    expect(out).toContain('href="/saints/archangel-michael#hymns"');
    expect(out).toContain(en["today.greet.hymns"]);
    expect(out).toContain('href="/prayers/morning"');
    expect(out).toContain(`${en["today.prayNow.morningFallback"]} · 8 min`);
    expect(out).not.toContain(en["today.greetingMorning"]);
    expect(out).not.toMatch(/<h1\b/);
  });

  it("marks a great feast, and the fast it falls in", async () => {
    const out = await draw("orthodox", NOV_21);
    expect(out).toContain(`Saturday, November 21 · ${en["today.greet.greatFeast"]} · ${en["calendar.fast.nativityWeekend.label"]}`);
    expect(out).toContain("Entrance of the Most Holy Theotokos into the Temple");
    // The Theotokos has an akathist but no hymns of the feast in the library.
    expect(out).not.toContain(en["today.greet.hymns"]);
  });

  it("gives the reader who is learning the greeting, one line naming the day, and the way to it", async () => {
    const out = await draw("learning", NOV_8);
    expect(out).toContain(en["today.greetingMorning"]);
    expect(out).toContain(html(en["today.greet.feastLine"].replace("{name}", SYNAXIS)));
    expect(out).toContain('href="/calendar"');
    expect(out).toContain(en["today.greet.seeDay"]);
    expect(out).not.toContain(en["today.abide"]);
  });

  it("gives the reader new to the faith the greeting and a psalm for the hour, from the Psalter's own words", async () => {
    const out = await draw("new", NOV_8);
    expect(out).toContain(en["today.greetingMorning"]);
    expect(out).toContain("In the morning thou shalt hear my voice");
    expect(out).toContain("Psalm 5:3");
    expect(out).toContain('lang="en"');
    expect(out).not.toContain(SYNAXIS);
  });

  it("holds the Orthodox reader on a blank before the day is known, never a Good morning that turns into a feast", async () => {
    const out = await draw("orthodox", null);
    expect(out).not.toContain(en["today.greetingMorning"]);
    expect(out).toContain('aria-hidden="true"');
    // The reader new to the faith needs no day: greeting and verse at once.
    const fresh = await draw("new", null);
    expect(fresh).toContain(en["today.greetingMorning"]);
    expect(fresh).toContain("Psalm 5:3");
  });

  it("speaks the reader's language around the calendar's English names", async () => {
    live.type = "learning";
    live.today = NOV_21;
    const el = getMessages("el");
    const out = renderToString(
      createElement(MessagesProvider, { locale: "el", messages: el } as ProviderProps, createElement(GreetingHeader, { verses: await loadHourVerses() })),
    );
    expect(out).toContain(html(el["today.greet.greatFeastLine"].replace("{name}", "Entrance of the Most Holy Theotokos into the Temple")));
    expect(out).toContain(el["today.greet.seeDay"]);
  });
});
