// A change inside a page moves as a page switch does (the owner's ruling of
// 2026-11-13, relayed by Arbiter 2; lib/ui/inPageMove.ts). This holds the
// rules and the places that use them, since nothing else would say so if a
// piece went missing: a question would open at once again, a calendar day's
// fast would land sideways a frame late, a history event's parts would cut.
//
// What a reader would notice if this broke: an answer that appears at once,
// what is below it jumping down; a step under reduced motion that moves; a
// change never made at all.
//
// It cannot watch a transition (vitest runs with no browser). The check that
// does is the gate's motion walk (scripts/motion-walk.mjs) on the export.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

type Held = { update: () => unknown; finish: () => void };

function stubDocument({ motion = "full", transitions = true }: { motion?: string; transitions?: boolean } = {}) {
  const attrs = new Map<string, string>();
  const started: Held[] = [];
  const doc: Record<string, unknown> = {
    documentElement: {
      dataset: { motion },
      setAttribute: (k: string, v: string) => attrs.set(k, v),
      removeAttribute: (k: string) => attrs.delete(k),
      getAttribute: (k: string) => attrs.get(k) ?? null,
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  if (transitions) {
    doc.startViewTransition = (update: () => unknown) => {
      let finish = () => {};
      const finished = new Promise<void>((resolve) => {
        finish = resolve;
      });
      started.push({ update, finish });
      return { finished, ready: Promise.resolve(), skipTransition: () => {} };
    };
  }
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", { innerHeight: 844 });
  return { attrs, started };
}

const part = () => ({ style: { viewTransitionName: "" } }) as unknown as HTMLElement;

let mod: typeof import("../inPageMove");

beforeEach(async () => {
  vi.resetModules();
  mod = await import("../inPageMove");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a change inside a page", () => {
  it("is made at once where there are no View Transitions", () => {
    const { started } = stubDocument({ transitions: false });
    const update = vi.fn();
    mod.movePage(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(started).toEqual([]);
  });

  it("is made at once, and still, under reduced motion", () => {
    const { started } = stubDocument({ motion: "reduce" });
    const update = vi.fn();
    mod.movePage(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(started).toEqual([]);
  });

  it("is pictured: made inside the transition, never before it, exactly once", async () => {
    const { started, attrs } = stubDocument();
    const update = vi.fn();
    const grows = part();
    const glides = [part(), part()];
    mod.movePage(update, { grows: [grows], glides });
    expect(update).not.toHaveBeenCalled();
    expect(started).toHaveLength(1);
    // While it moves: the root says so, the part that opens is clipped by its name, what follows glides by its own.
    expect(attrs.has(mod.IN_PAGE_ATTR)).toBe(true);
    expect(grows.style.viewTransitionName).toBe(mod.GROWS[0]);
    expect(glides.map((g) => g.style.viewTransitionName)).toEqual([`${mod.GLIDES}1`, `${mod.GLIDES}2`]);
    expect(mod.isMovingInPage()).toBe(true);
    started[0].update();
    started[0].update();
    expect(update).toHaveBeenCalledTimes(1);
    // A second change while one moves is made at once, so the first is not cut short.
    const second = vi.fn();
    mod.movePage(second);
    expect(second).toHaveBeenCalledTimes(1);
    expect(started).toHaveLength(1);
    started[0].finish();
    await new Promise((r) => setTimeout(r, 0));
    expect(attrs.has(mod.IN_PAGE_ATTR)).toBe(false);
    expect(grows.style.viewTransitionName).toBe("");
    expect(glides.map((g) => g.style.viewTransitionName)).toEqual(["", ""]);
    expect(mod.isMovingInPage()).toBe(false);
  });

  it("a change that comes later holds the picture until it has come, and takes its step once", async () => {
    const { started } = stubDocument();
    const step = vi.fn();
    const ready = mod.awaitArrival("t");
    mod.movePageUntil(step, ready, { glides: [] });
    expect(step).not.toHaveBeenCalled();
    let held = false;
    void Promise.resolve(started[0].update()).then(() => {
      held = true;
    });
    expect(step).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(held).toBe(false);
    mod.arrive("t");
    await new Promise((r) => setTimeout(r, 0));
    expect(held).toBe(true);
  });

  it("a change that never says it has come is let go after HOLD_MS", async () => {
    vi.useFakeTimers();
    try {
      const { started } = stubDocument();
      mod.movePageUntil(() => {}, new Promise(() => {}), { glides: [] });
      let held = false;
      void Promise.resolve(started[0].update()).then(() => {
        held = true;
      });
      await vi.advanceTimersByTimeAsync(mod.HOLD_MS + 1);
      expect(held).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the places that move", () => {
  it("every question that opens in place, from one listener at the root", () => {
    expect(read("components/ui/MotionRoot.tsx")).toContain("useEffect(() => moveQuestions(), []);");
    const src = read("lib/ui/inPageMove.ts");
    expect(src).toMatch(/m\.preventDefault\(\);\s*const d = details as HTMLDetailsElement;\s*movePage\(\(\) => \{\s*d\.open = !d\.open;\s*\}, \{ grows: \[d\] \}\);/);
  });

  it("the calendar's days and months: the address changes inside the move, held until the day has drawn", () => {
    const cal = read("components/calendar/PhoneCalendar.tsx");
    expect(cal).toContain('movePageUntil(() => window.history.replaceState(null, "", href), awaitArrival(DAY_ARRIVED));');
    expect(cal).toMatch(/shownDay\.current = selectedIso;\s*arrive\(DAY_ARRIVED\);/);
    expect(cal).toMatch(/shownMonth\.current = monthKey;\s*arrive\(DAY_ARRIVED\);/);
    expect(cal).toContain("(step: 1 | -1) => turnTo(step === 1 ? nextHref : prevHref),");
    expect(cal).not.toMatch(/function stayInPlace[\s\S]{0,300}window\.history\.replaceState\(null, "", href\);\s*\}/);
  });

  it("a work's chapter steps are pictured, held until the chapter stands at its top (a council's Next: Canon I)", () => {
    const place = read("components/saints/useWorkPlace.ts");
    expect(place).toMatch(/movePageUntil\(\(\) => \{\s*window\.location\.hash = hash;\s*\}, awaitArrival\(CHAPTER_ARRIVED\)\);/);
    // The landing at a chapter's top is made in the frame the chapter is drawn in, before the screen is, and says so.
    const layout = place.match(/useLayoutEffect\(\(\) => \{[\s\S]*?\}, \[target, owner, slug\]\);/)?.[0] ?? "";
    expect(layout).toMatch(/window\.scrollTo\(\{ top: 0, behavior: "instant" \}\);/);
    expect(layout).toMatch(/if \(isMovingInPage\(\)\) for \(const el of document\.querySelectorAll\("\.page-open-after"\)\) for \(const a of el\.getAnimations\(\)\) a\.finish\(\);/);
    expect(layout).toMatch(/arrive\(CHAPTER_ARRIVED\);/);
    // Every way to a chapter takes that one step, in a council and in a Father's work.
    for (const reader of ["components/councils/CouncilReader.tsx", "components/saints/WritingReader.tsx"]) expect(read(reader)).toMatch(/const go = useGoToChapter\(\);/);
  });

  it("a history event's parts glide to their place", () => {
    expect(read("components/history/EventPartsNav.tsx")).toMatch(/rowHeight: row\.getBoundingClientRect\(\)\.height,\s*\}\),\s*behavior: scrollBehavior\(\),/);
  });

  it("what opens is followed once the move is over, not under its picture", () => {
    expect(read("lib/ui/showOpened.ts")).toMatch(/if \(isMovingInPage\(\)\) \{\s*arrived = at;\s*last = at;\s*frame = window\.requestAnimationFrame\(look\);\s*return;\s*\}/);
  });

  it("the stylesheet times the move on the house curve and clips what opens", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/:root\[data-in-page\]::view-transition-group\(\*\),\s*:root\[data-in-page\]::view-transition-old\(\*\),\s*:root\[data-in-page\]::view-transition-new\(\*\) \{\s*animation-duration: var\(--duration-base\);\s*animation-timing-function: var\(--ease-house\);/);
    expect(css).toMatch(/::view-transition-group\(in-page-grows-1\),\s*::view-transition-group\(in-page-grows-2\) \{\s*overflow: clip;/);
  });
});

describe("Gate 2.0's in-page faults under his ruling, each moved (Updates 22)", () => {
  it("Community: the replies open and arrive, and Read more unfolds, as the card grows", () => {
    const c = read("components/community/CommunityClient.tsx");
    expect(c).toMatch(/movePage\(\s*\(\) => \{\s*setOpen\(next\);\s*if \(fetching\) setRepliesState\("loading"\);\s*\},\s*\{ grows: \[cardRef\.current\] \},\s*\);/);
    expect(c).toMatch(/if \(!cardRef\.current\?\.isConnected\) return land\(\);\s*await afterMoves\(\);\s*movePage\(land, \{ grows: \[cardRef\.current\] \}\);/);
    expect(read("lib/ui/inPageMove.ts")).toMatch(/ending = transition\.finished\.then\(undress, undress\);/);
    expect(c).toContain("onClick={() => movePage(() => setUnfolded((v) => !v), { grows: [cardRef.current] })}");
  });

  it("a plan's day marked: the part over the days grows by its line, the circle under the finger", () => {
    const plan = read("components/plans/PlanClient.tsx");
    expect(plan).toMatch(/hold\(pressed\);\s*keepHead\(\);[\s\S]{0,400}movePage\(\s*\(\) => \{\s*if \(read\) completeDay\(plan, day\);\s*else uncompleteDay\(id, day\);\s*\},\s*\{ grows: \[head\.current\] \},\s*\);/);
  });

  it("Today: a road card folds away, and the saints' readings are let down", () => {
    expect(read("components/onboarding/RoadCards.tsx")).toContain('onClick={(e) => movePage(onClose, { grows: [e.currentTarget.closest("[data-road-card]")] })}');
    const rail = read("components/today/ChurchTodayRail.tsx");
    expect(rail).toContain("onClick={() => movePage(onToggle, { grows: [region.current] })}");
    expect(rail.match(/\[:root\[data-in-page\]_&\]:transition-none/g)).toHaveLength(2);
  });

  it("the prayer book: the open chapter shuts as the tapped one opens, its fold standing down", () => {
    expect(read("components/prayers/PrayerBookContents.tsx")).toContain("movePage(() => setOpen(next), { grows: folds });");
    expect(read("app/globals.css")).toMatch(/:root\[data-in-page\] \.book-fold,\s*:root\[data-in-page\] \.book-page \{\s*transition: none;/);
  });

  it("pagers and tabs cross-fade: a study's parts, the first liturgy's steps, the saints' web views", () => {
    expect(read("components/theology/StudyReader.tsx")).toMatch(/function showPart\(n: number\): void \{[\s\S]{0,300}movePage\(\(\) => \{\s*window\.history\.replaceState/);
    expect(read("components/start/liturgy/FirstLiturgyGuide.tsx")).toMatch(/moved\.current = true;[\s\S]{0,300}movePage\(\(\) => \{\s*goToStep\(next\);/);
    expect(read("components/saints/web/WebViewSwitch.tsx")).toMatch(/export function chooseWebView[\s\S]{0,400}movePage\(\(\) => \{\s*window\.history\.replaceState\(null, "", url\);/);
  });

  it("Job's order: the order grows by its row and the moments left glide; a hint is let down", () => {
    const order = read("components/walkthrough/Synthesis.tsx");
    expect(order).toContain("{ grows: [listRef.current], glides: [...left, ...partsAfter(poolRef.current)] },");
    expect(order).toContain("movePage(() => setHint(expected), { grows: [hintRef.current] });");
  });

  it("Try it reads the feature's screen first and cross-fades to it, and back", () => {
    const tryIt = read("components/billing/PlusTry.tsx");
    expect(tryIt).toMatch(/Promise\.race\(\[readTryScreen\(next\), new Promise\(\(resolve\) => setTimeout\(resolve, HOLD_MS\)\)\]\)\.then\(\(\) =>\s*movePage\(\(\) => \{\s*beginTry\(next\);/);
    expect(tryIt.match(/const Preview = SCREENS\[row\.id\];/g)).toHaveLength(2);
    expect(tryIt).toContain("flushSync(() => setId(null));");
  });

  it("the florilegium's naming form grows in the row's place", () => {
    const hub = read("components/florilegium/FlorilegiaHub.tsx");
    expect(hub).toContain("movePage(() => setCreating(true), { grows: [place.current] });");
    expect(hub).toContain('<li ref={place} className="theology-rule">');
  });

  it("what a disclosure opens is let down: the legal contents, More details, Settings' goal, a rule's Start from", () => {
    expect(read("components/legal/LegalContents.tsx")).toContain("onClick={() => movePage(() => setOpen((was) => !was), { grows: [anchor.current] })}");
    expect(read("components/shop/RequestIconForm.tsx")).toContain("onClick={() => movePage(() => setMore((m) => !m), { grows: [moreBox.current] })}");
    const modes = read("components/settings/ReadingModePages.tsx");
    expect(modes).toContain("movePage(() => setGoal(goal === id ? null : id), { grows: [goalBox.current] })");
    expect(modes).toContain("<div ref={goalBox}>");
    expect(read("components/prayers/mine/MyRuleBuilder.tsx")).toMatch(/movePage\(\s*\(\) => \{\s*save\(addItems\(rule, chosen, seedOf\(chosen\)\)\);\s*\},\s*\{ grows: \[document\.getElementById\(`mine-panel-\$\{chosen\}`\)\] \},\s*\);/);
  });

  it("/premium/'s two links glide to their plans", () => {
    const premium = read("app/(app)/premium/page.tsx");
    expect(premium).toContain('<GlideLink href="#plus" className={PREMIUM_CTA}>');
    expect(premium).toContain('<GlideLink href="#pro" className={PREMIUM_GHOST}>');
    expect(premium).not.toMatch(/<a href="#(plus|pro)"/);
    expect(read("components/ui/GlideLink.tsx")).toContain('place.scrollIntoView({ behavior: scrollBehavior(), block: "start" });');
  });

  it("a line a tap shows moves what is below it: Buy now's, the sign-up's", () => {
    expect(read("components/shop/BuyBar.tsx").match(/\{ grows: \[barRef\.current\] \}/g)).toHaveLength(2);
    const signUp = read("components/auth/SignUpForm.tsx");
    expect(signUp).toContain("const agree = (now: boolean) => movePage(() => setAgreed(now), { grows: [oauthBox.current] });");
    expect(signUp).toContain("onChange={(e) => agree(e.target.checked)}");
  });

  it("the gift's Try again leaves its line standing, busy, and the answer moves in", () => {
    const gift = read("components/gifts/OrderGiftClient.tsx");
    expect(gift).not.toMatch(/setLoadError\(false\);\s*void load\(\);/);
    expect(gift).toMatch(/aria-busy=\{retrying \|\| undefined\}\s*onClick=\{\(\) => \{\s*setRetrying\(true\);\s*void load\(\);/);
    expect(read("app/globals.css")).toMatch(/\.set-btn\[aria-busy="true"\] \{\s*opacity: 0\.6;/);
    expect(gift.match(/\{ grows: \[footRef\.current\] \}/g)).toHaveLength(2);
  });

  it("a part that leaves folds away from its foot, and a part that comes is let down from its head", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/:root\[data-in-page\]::view-transition-old\(in-page-grows-1\):only-child,\s*:root\[data-in-page\]::view-transition-old\(in-page-grows-2\):only-child \{\s*animation-name: in-page-fold-away;/);
    expect(css).toMatch(/:root\[data-in-page\]::view-transition-new\(in-page-grows-1\):only-child,\s*:root\[data-in-page\]::view-transition-new\(in-page-grows-2\):only-child \{\s*animation-name: in-page-let-down;/);
  });
});
