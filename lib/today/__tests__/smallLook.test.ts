import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Your first Liturgy and Today's Catechism on Today (1.8, the owner's round
// 17, transitionary "A and B"): one quiet line each for an Orthodox reader,
// two cards for a reader who is learning or new to the faith. The reader's
// type, day and plan are set here; the rest is the app's own.

const live = vi.hoisted(() => ({
  today: null as Date | null,
  type: "orthodox" as "orthodox" | "learning" | "new",
  plan: null as unknown,
}));
vi.mock("@/lib/calendar/useToday", () => ({ useToday: () => live.today }));
vi.mock("@/lib/onboarding/useReaderType", () => ({ useReaderType: () => live.type }));
vi.mock("@/lib/start/liturgyPlan", async (actual) => {
  const real = await actual<typeof import("@/lib/start/liturgyPlan")>();
  return { ...real, useLiturgyPlan: () => live.plan ?? real.EMPTY_PLAN };
});

import { CatechismCard } from "@/components/catechism/CatechismCard";
import { CatechismToday } from "@/components/catechism/CatechismToday";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { FirstLiturgyReminder } from "@/components/today/FirstLiturgyReminder";
import { bankHasQuestions } from "@/lib/catechism/bank";
import { getMessages } from "@/lib/i18n";
import { READER_TYPES } from "@/lib/onboarding/readerType";

import { smallLook } from "../smallLook";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const en = getMessages("en");
const html = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const draw = (node: (props: { className?: string }) => React.ReactNode) =>
  renderToString(createElement(MessagesProvider, { locale: "en", messages: en } as ProviderProps, createElement(node)));

// The walk's week (scripts/export-walk.mjs, "Today, that week"): a Greek
// Orthodox Liturgy on Sunday 18 October 2026, seen on the Saturday before.
const PLAN = { v: 1, going: true, kind: "greek", date: "2026-10-18", step: "ready", furthest: 8, done: true, checked: ["time", "priest"], hiddenFor: null };
const SATURDAY = new Date(Date.UTC(2026, 9, 17, 12));
const SUNDAY = new Date(Date.UTC(2026, 9, 18, 12));

describe("the look for each type of reader", () => {
  it("is quiet lines for the Orthodox, cards for those learning and new", () => {
    expect(READER_TYPES.map(smallLook)).toEqual(["line", "card", "card"]);
  });
});

describe("Your first Liturgy, drawn", () => {
  const reminder = (type: typeof live.type, today: Date = SATURDAY) => {
    live.type = type;
    live.today = today;
    live.plan = PLAN;
    return draw(FirstLiturgyReminder);
  };

  it("is one quiet line for an Orthodox reader: the day, the church, the count, the guide", () => {
    const out = reminder("orthodox");
    expect(out).toContain('data-look="line"');
    expect(out).toContain(`${en["start.liturgy.title"]} · ${en["start.liturgy.today.tomorrow"]}`);
    expect(out).toContain(`${en["start.liturgy.kind.greek.name"]} · 2 of 6 ready`);
    expect(out).toContain('href="/start/first-liturgy"');
    expect(out).toContain(`aria-label="${en["start.liturgy.today.hide"]}"`);
    expect(out).not.toContain(en["start.liturgy.today.open"]);
  });

  it("is a card for a reader learning or new: the day large, and the guide's door", () => {
    for (const type of ["learning", "new"] as const) {
      const out = reminder(type);
      expect(out, type).toContain('data-look="card"');
      expect(out, type).toContain(`>${en["start.liturgy.title"]}<`);
      expect(out, type).toContain(`>${en["start.liturgy.today.tomorrow"]}<`);
      expect(out, type).toContain(html(en["start.liturgy.today.open"]));
      expect(out, type).toContain('href="/start/first-liturgy"');
      expect(out, type).toContain(`aria-label="${en["start.liturgy.today.hide"]}"`);
    }
  });

  it("keeps its conditions: the calm line on the day only, nothing with no plan or no day", () => {
    expect(reminder("orthodox", SUNDAY)).toContain(en["start.liturgy.today.calm"]);
    expect(reminder("new", SUNDAY)).toContain(en["start.liturgy.today.calm"]);
    expect(reminder("orthodox")).not.toContain(en["start.liturgy.today.calm"]);
    live.plan = null;
    live.today = SATURDAY;
    expect(draw(FirstLiturgyReminder)).toBe("");
    live.plan = PLAN;
    live.today = null;
    expect(draw(FirstLiturgyReminder)).toBe("");
  });
});

describe("Today's Catechism, drawn", () => {
  const catechism = (type: typeof live.type) => {
    live.type = type;
    return draw(CatechismToday);
  };

  it("is one quiet line for an Orthodox reader", () => {
    const out = catechism("orthodox");
    expect(out).toContain('data-look="line"');
    expect(out).toContain(html(en["catechism.card.eyebrow"]));
    expect(out).toContain(html(en["catechism.title"]));
    expect(out).toContain('href="/catechism"');
    expect(out).not.toContain(en["today.prayNow.begin"]);
  });

  it("is a card with Begin for a reader learning or new", () => {
    for (const type of ["learning", "new"] as const) {
      const out = catechism(type);
      expect(out, type).toContain('data-look="card"');
      expect(out, type).toContain(html(en["catechism.title"]));
      expect(out, type).toContain(en["today.prayNow.begin"]);
      expect(out, type).toContain('href="/catechism"');
    }
  });

  it("is drawn only while the bank holds questions, and never shows one", () => {
    const out = draw(CatechismCard);
    if (!bankHasQuestions()) expect(out).toBe("");
    else expect(out).toContain('href="/catechism"');
  });
});
