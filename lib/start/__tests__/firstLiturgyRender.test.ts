import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { FirstLiturgyCard } from "@/components/start/FirstLiturgyCard";
import { StartHere } from "@/components/start/StartHere";
import { FirstLiturgyGuide } from "@/components/start/liturgy/FirstLiturgyGuide";
import { FirstLiturgyReminder } from "@/components/today/FirstLiturgyReminder";
import { getMessages } from "@/lib/i18n";
import { STEP_IDS } from "@/lib/start/liturgyPlan";

// What the server writes for the guide, Start here and Today's reminder: the
// HTML the website sends and the apps' static export carries. The reader's
// plan and day live on the device, so before they are read the guide is its
// first question, Start here is its steps and the guide's door, and Today has
// no reminder at all (a reminder written by the server would be the build's).

const html = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

type ProviderProps = Parameters<typeof MessagesProvider>[0];

function render(node: (props: { className?: string }) => React.ReactNode, code: string): string {
  return renderToString(
    createElement(MessagesProvider, { locale: code, messages: getMessages(code) } as ProviderProps, createElement(node)),
  );
}

describe("the server's first drawing", () => {
  it("of the guide is its question, in the reader's language", () => {
    for (const code of ["en", "el", "ar", "ka"]) {
      const words = getMessages(code);
      const out = render(FirstLiturgyGuide, code);
      expect(out, code).toContain(html(words["start.liturgy.intro.title"]));
      expect(out, code).toContain(html(words["start.liturgy.intro.yes"]));
      expect(out, code).not.toMatch(/start\.liturgy\./);
      // One card at a time: nothing of the later cards yet.
      expect(out, code).not.toContain(html(words["start.liturgy.kind.title"]));
    }
    expect(STEP_IDS[0]).toBe("intro");
  });

  it("of Start here is its name, its steps, then the guide's door", () => {
    const words = getMessages("en");
    const out = render(StartHere, "en");
    const at = (s: string) => out.indexOf(html(s));
    expect(at(words["start.title"])).toBeGreaterThan(-1);
    expect(at(words["start.step.parish.title"])).toBeGreaterThan(at(words["start.step.prayer.title"]));
    expect(out.indexOf('href="/start/first-liturgy"')).toBeGreaterThan(at(words["start.step.parish.title"]));
    expect(at(words["start.closing"])).toBeGreaterThan(out.indexOf('href="/start/first-liturgy"'));
    // The guide's card begins as the door, before a reader has a plan.
    expect(render(FirstLiturgyCard, "en")).toContain(html(words["start.liturgy.card.open"]));
  });

  it("of Today holds no reminder", () => {
    expect(render(FirstLiturgyReminder, "en")).toBe("");
  });
});
