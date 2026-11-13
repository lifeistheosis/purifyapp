// The bars at the foot step away while one of the app's own fields has the
// on-screen keyboard (build 95, with note 14; found by the Fable chat on the
// journal's list, 2026-11-13: with the keyboard up over the journal's search
// field, the tab bar and the Write button rode up on the keyboard and covered
// the field). lib/ui/keyboardFlag.ts says so on the page as
// html[data-keyboard="up"], and app/globals.css stands the bars down by it.
//
// What a reader would notice if this broke: the tab bar, the player or a
// toast riding up on the keyboard over the field they are typing in, or, the
// other way, the bars gone with no keyboard up, or a field that holds the
// keyboard hidden with the bar it sits in.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { KEYBOARD_FLAG, followKeyboard, takesTyping, type KeyboardWindow } from "../keyboardFlag";

type Listener = () => void;

/** A phone's window: its height, its visual viewport, a focused element, and the root's attributes. */
function phone(width: number, height: number) {
  const on = new Map<string, Set<Listener>>();
  const add = (k: string) => (type: string, fn: Listener) => (on.get(`${k}:${type}`) ?? on.set(`${k}:${type}`, new Set()).get(`${k}:${type}`)!).add(fn);
  const remove = (k: string) => (type: string, fn: Listener) => on.get(`${k}:${type}`)?.delete(fn);
  const fire = (k: string, type: string) => [...(on.get(`${k}:${type}`) ?? [])].forEach((fn) => fn());
  const attrs = new Map<string, string>();
  const vv = { width, height, offsetTop: 0, scale: 1, addEventListener: add("vv"), removeEventListener: remove("vv") };
  const win = {
    innerHeight: height,
    visualViewport: vv,
    document: {
      activeElement: null as Element | null,
      documentElement: { setAttribute: (n: string, v: string) => void attrs.set(n, v), removeAttribute: (n: string) => void attrs.delete(n) },
      addEventListener: add("doc"),
      removeEventListener: remove("doc"),
    },
    addEventListener: add("win"),
    removeEventListener: remove("win"),
  };
  return {
    win: win as unknown as KeyboardWindow,
    flag: () => attrs.get(KEYBOARD_FLAG) ?? null,
    listeners: () => [...on.values()].reduce((n, s) => n + s.size, 0),
    focus(el: Element | null) {
      win.document.activeElement = el;
      fire("doc", "focusin");
    },
    /** Android: the window and the visual viewport both shorten (the web view is padded for the keyboard). */
    resize(h: number) {
      win.innerHeight = h;
      vv.height = h;
      fire("win", "resize");
      fire("vv", "resize");
    },
    /** iPhone: the keyboard is laid over the page, so only the visual viewport shortens. */
    cover(px: number) {
      vv.height = win.innerHeight - px;
      fire("vv", "resize");
    },
    zoom(scale: number) {
      vv.scale = scale;
      fire("vv", "resize");
    },
  };
}

const el = (tagName: string, props: Record<string, unknown> = {}) => ({ tagName, isContentEditable: false, readOnly: false, disabled: false, ...props }) as unknown as Element;
const field = el("INPUT", { type: "search" });

describe("a field that takes typing", () => {
  it("is a text field, a text area or an editable block, not a button or a box to tick", () => {
    for (const type of ["text", "search", "email", "url", "tel", "password", "number", ""]) expect(takesTyping(el("INPUT", { type }))).toBe(true);
    expect(takesTyping(el("TEXTAREA"))).toBe(true);
    expect(takesTyping(el("DIV", { isContentEditable: true }))).toBe(true);
    for (const type of ["checkbox", "radio", "range", "button", "submit", "date", "color", "file"]) expect(takesTyping(el("INPUT", { type }))).toBe(false);
    expect(takesTyping(el("INPUT", { type: "text", readOnly: true }))).toBe(false);
    expect(takesTyping(el("INPUT", { type: "text", disabled: true }))).toBe(false);
    expect(takesTyping(el("BUTTON"))).toBe(false);
    expect(takesTyping(null)).toBe(false);
  });
});

describe("the keyboard flag", () => {
  it("goes up on Android when a field has the keyboard and the web view is shortened for it", () => {
    const p = phone(401, 844);
    const stop = followKeyboard(p.win);
    expect(p.flag()).toBeNull();
    p.focus(field);
    expect(p.flag()).toBeNull(); // the keyboard is not up yet
    p.resize(508);
    expect(p.flag()).toBe("up");
    p.resize(844);
    expect(p.flag()).toBeNull();
    stop();
  });

  it("goes up on an iPhone when the keyboard is laid over the page", () => {
    const p = phone(402, 844);
    const stop = followKeyboard(p.win);
    p.focus(field);
    p.cover(336);
    expect(p.flag()).toBe("up");
    p.cover(0);
    expect(p.flag()).toBeNull();
    stop();
  });

  it("stays down when nothing that takes typing has the focus: a window shortened by a split screen is no keyboard", () => {
    const p = phone(403, 844);
    const stop = followKeyboard(p.win);
    p.resize(508);
    expect(p.flag()).toBeNull();
    p.focus(el("BUTTON"));
    expect(p.flag()).toBeNull();
    stop();
  });

  it("stays down for a hardware keyboard, which covers nothing", () => {
    const p = phone(404, 844);
    const stop = followKeyboard(p.win);
    p.focus(field);
    expect(p.flag()).toBeNull();
    stop();
  });

  it("comes down only once the keyboard has gone, not the moment the field lets go of the focus", () => {
    const p = phone(405, 844);
    const stop = followKeyboard(p.win);
    p.focus(field);
    p.resize(508);
    expect(p.flag()).toBe("up");
    // A tap outside the field: the focus goes at once, the keyboard a moment later.
    p.focus(null);
    expect(p.flag()).toBe("up");
    p.resize(844);
    expect(p.flag()).toBeNull();
    stop();
  });

  it("leaves a pinch zoom alone, and stopping takes the flag down and every listener with it", () => {
    const p = phone(406, 844);
    const stop = followKeyboard(p.win);
    p.focus(field);
    p.resize(508);
    p.zoom(2);
    expect(p.flag()).toBe("up");
    stop();
    expect(p.flag()).toBeNull();
    expect(p.listeners()).toBe(0);
  });
});

describe("what steps away", () => {
  const css = fs.readFileSync("app/globals.css", "utf8");

  it("is everything fixed at the foot, hidden to the last part, unless it holds the field", () => {
    const parts = ':is([data-screen-edge="bottom"], .now-playing-lift, [data-foot-bar]):not(:focus-within)';
    const at = css.indexOf(`html[data-keyboard="up"] ${parts} {`);
    expect(at).toBeGreaterThan(-1);
    const rule = css.slice(at, css.indexOf("}", at));
    expect(rule).toContain("opacity: 0 !important;");
    expect(rule).toContain("visibility: hidden !important;");
    // At once as the keyboard comes, so no bar is seen riding it.
    expect(rule).toContain("transition: none !important;");
    // The player's card and the dock's faces say visible of themselves.
    expect(css).toContain(`html[data-keyboard="up"] ${parts} * {\n visibility: hidden !important;\n}`);
  });

  it("covers every bar the app fixes at the foot, by one of the three marks", () => {
    // Any of the three will do: a bar may change its mark (the journal's Write
    // button is the Fable chat's to redesign), as long as it keeps one.
    const marked = /data-screen-edge="bottom"|\bnow-playing-lift\b|\bdata-foot-bar\b/;
    for (const f of [
      "components/nav/MobileTabBar.tsx",
      "components/prayers/NowPlayingBar.tsx",
      "components/bible/ReaderDock.tsx",
      "components/bible/MobileChapterPill.tsx",
      "components/saints/MobileWorkPill.tsx",
      "components/flow/FlowBarShell.tsx",
      "components/chants/ChantPlay.tsx",
      "components/bible/MobileVerseToolbar.tsx",
      "components/ui/UndoBar.tsx",
      "components/journal/WriteButton.tsx",
      "components/player/PrayWithChant.tsx",
      "components/eikonBox/EikonBoxBridge.tsx",
      "components/ui/MotionNotice.tsx",
      "components/shop/BuyBar.tsx",
      "components/shop/CartClient.tsx",
    ]) {
      expect(fs.readFileSync(f, "utf8"), f).toMatch(marked);
    }
  });

  it("is said by the native shell, the one place the keyboard shortens the web view", () => {
    const bridge = fs.readFileSync("components/native/NativeBridge.tsx", "utf8");
    expect(bridge).toMatch(/useEffect\(\(\) => \{\s*if \(!isNativeClient\(\)\) return;\s*return followKeyboard\(\);\s*\}, \[\]\);/);
  });
});
