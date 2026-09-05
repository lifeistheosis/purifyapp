// A synthetic bank for the selector tests. Nothing here is a real question:
// the prompts are labels, the sources are the shape the schema accepts, and
// every id is a fixed v4-shaped uuid so a run is reproducible.

import type { CalendarLookup, DayCalendar } from "../select";
import type { Question } from "../types";

const TAGS = ["creed", "saints", "scripture", "councils", "prayer"];

export function fixtureId(i: number): string {
  return `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
}

export function makeBank(
  n: number,
  patch: (i: number) => Partial<Question> = () => ({}),
): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < n; i++) {
    const type = i % 3 === 0 ? "multiple_choice" : i % 3 === 1 ? "true_false" : "fill_word";
    const base: Question =
      type === "multiple_choice"
        ? {
            id: fixtureId(i),
            type,
            prompt: `Fixture question ${i}`,
            options: ["Alpha", "Beta", "Gamma", "Delta"],
            answer: i % 4,
            explanation: `Fixture explanation ${i}`,
            source_ref: "/bible/john/1",
            tags: [TAGS[i % TAGS.length]],
            reviewed_by: "fixture",
          }
        : type === "true_false"
          ? {
              id: fixtureId(i),
              type,
              prompt: `Fixture question ${i}`,
              answer: i % 2 === 0,
              explanation: `Fixture explanation ${i}`,
              source_ref: "/bible/john/1",
              tags: [TAGS[i % TAGS.length]],
              reviewed_by: "fixture",
            }
          : {
              id: fixtureId(i),
              type,
              prompt: `Fixture question ${i}`,
              answer: ["Theotokos", "Mother of God"],
              explanation: `Fixture explanation ${i}`,
              source_ref: "/bible/john/1",
              tags: [TAGS[i % TAGS.length]],
              reviewed_by: "fixture",
            };
    out.push({ ...base, ...patch(i) });
  }
  return out;
}

const EMPTY_DAY: DayCalendar = { saints: new Set(), feast: "00-00", readings: new Set() };

/** A calendar with nothing on any day. */
export const quietCalendar: CalendarLookup = () => EMPTY_DAY;

/** A calendar that commemorates `slug` every day. */
export function calendarWithSaint(slug: string): CalendarLookup {
  const day: DayCalendar = { saints: new Set([slug]), feast: "00-00", readings: new Set() };
  return () => day;
}
