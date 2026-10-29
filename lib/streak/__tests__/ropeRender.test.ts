import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { StreakView } from "../useStreak";

// The rope as Today draws it (1.8, the owner's pick B of round 5): "N days"
// and its line over this week's seven knots, today's lit once kept; nothing
// while the Day 1 card shows; and the evening card, the same rope with
// today's knot breathing. No red and no flame anywhere in either. The streak
// and the Day 1 card are set here; the week is the device's own today.

const live = vi.hoisted(() => ({ view: null as unknown as StreakView, dayOne: false }));
vi.mock("@/lib/streak/useStreak", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../useStreak")>()),
  useStreak: () => live.view,
}));
vi.mock("@/lib/onboarding/useDayOne", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/onboarding/useDayOne")>()),
  useDayOneShown: () => live.dayOne,
}));

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { StreakAtRisk } from "@/components/streak/StreakAtRisk";
import { StreakRow } from "@/components/today/StreakRow";
import { getMessages } from "@/lib/i18n";
import { todayKey } from "@/lib/rhythm/dayKey";

import { dayNumber, keyFromNumber } from "../compute";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const en = getMessages("en");

function draw(node: Parameters<typeof createElement>[0], props: Record<string, unknown> = {}): string {
  return renderToString(createElement(MessagesProvider, { locale: "en", messages: en } as ProviderProps, createElement(node, props)));
}

function view(over: Partial<StreakView>): StreakView {
  const today = todayKey();
  const strip = Array.from({ length: 7 }, (_, i) => ({ date: keyFromNumber(dayNumber(today) - 6 + i), state: "missed" as const }));
  return { ready: true, signedIn: false, current: 0, best: 0, keptToday: false, atRisk: false, saved: false, strip, ...over };
}

/** The knots drawn: one of 13px for each day but today kept, which is 17px. */
const knots = (out: string) => (out.match(/size-\[1[37]px\]/g) ?? []).length;
const RED = /text-streak|border-streak|bg-streak|crimson|rgb\(193/;

describe("the rope on Today, drawn", () => {
  it("is the count and its line over seven knots, today lit once kept", () => {
    const today = todayKey();
    const strip = view({}).strip.map((d) => (d.date === today ? { ...d, state: "kept" as const } : d));
    live.view = view({ current: 1, best: 1, keptToday: true, strip });
    live.dayOne = false;
    const out = draw(StreakRow, { className: "mt-4" });
    expect(out).toContain("1 day");
    expect(out).toContain(en["streak.rope.kept"]);
    expect(knots(out)).toBe(7);
    expect(out.match(/rope-knot-lit/g)).toHaveLength(1);
    expect(out).toContain("rope-count-lit");
    expect(out).not.toMatch(RED);
    expect(out).not.toMatch(/<svg[^>]*>(?:(?!<\/svg>).)*flame/i);
  });

  it("asks for today while it is not kept, with no knot lit", () => {
    live.view = view({});
    live.dayOne = false;
    const out = draw(StreakRow);
    expect(out).toContain("0 days");
    expect(out).toContain(en["streak.rope.keep"]);
    expect(knots(out)).toBe(7);
    expect(out).not.toContain("rope-knot-lit");
  });

  it("is not drawn at all while the Day 1 card shows, and comes back after", () => {
    live.view = view({});
    live.dayOne = true;
    expect(draw(StreakRow)).toBe("");
    live.dayOne = false;
    expect(draw(StreakRow)).not.toBe("");
  });

  it("gives way from 6 pm to the evening card: the rope with today's knot breathing, and no red", () => {
    live.view = view({ current: 3, best: 3, atRisk: true });
    live.dayOne = false;
    expect(draw(StreakRow)).toBe("");
    const out = draw(StreakAtRisk, { waitsForDayOne: true });
    expect(out).toContain("3 days");
    expect(out).toContain(en["streak.atRiskBody"]);
    expect(out).toContain(en["streak.atRiskTitle.other"].replace("{count}", "3"));
    expect(knots(out)).toBe(7);
    expect(out.match(/rope-knot-pulse/g)).toHaveLength(1);
    expect(out).toMatch(/href="\/prayers\/(morning|evening)"/);
    expect(out).not.toMatch(RED);
    expect(out).not.toContain("streak-pulse");
  });

  it("waits for the Day 1 card on Today only: /prayers/today has none", () => {
    live.view = view({ current: 3, best: 3, atRisk: true });
    live.dayOne = true;
    expect(draw(StreakAtRisk, { waitsForDayOne: true })).toBe("");
    expect(draw(StreakAtRisk)).toContain("3 days");
  });
});
