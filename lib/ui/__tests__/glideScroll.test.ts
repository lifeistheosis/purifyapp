// A scroll that goes a frame at a time (lib/ui/glideScroll.ts). Community's
// page for a new post folds its head on the first words; the smooth scroll it
// used was ended by the caret of the letter typed, in Chrome 153 (the
// Android WebView's engine), and the head never folded. These hold the glide
// that replaced it: it arrives, within the room the box has, at once when the
// reader asked for less motion, and a finger stops it where it stands.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GLIDE_MS, glideScroll } from "@/lib/ui/glideScroll";

type Listener = () => void;

/** A scroll box: its offset, its room, and the listeners a finger reaches. */
function box(scrollHeight = 775, clientHeight = 481) {
  const listeners = new Map<string, Set<Listener>>();
  return {
    scrollTop: 0,
    scrollHeight,
    clientHeight,
    addEventListener: (type: string, fn: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Listener) => listeners.get(type)?.delete(fn),
    fire: (type: string) => [...(listeners.get(type) ?? [])].forEach((fn) => fn()),
    count: (type: string) => listeners.get(type)?.size ?? 0,
  };
}

let frames: Map<number, FrameRequestCallback>;
let nextId: number;
/** Run the frames waiting, at `now`. */
const frame = (now: number) => {
  const waiting = [...frames.entries()];
  frames.clear();
  for (const [, fn] of waiting) fn(now);
};

beforeEach(() => {
  frames = new Map();
  nextId = 1;
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    const id = nextId++;
    frames.set(id, fn);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a glide", () => {
  it("arrives where it was sent, over a moment, a frame at a time", () => {
    const el = box();
    glideScroll(el as unknown as HTMLElement, 136, { smooth: true });
    expect(el.scrollTop).toBe(0);
    frame(1000);
    expect(el.scrollTop).toBe(0);
    frame(1000 + GLIDE_MS / 4);
    const quarter = el.scrollTop;
    expect(quarter).toBeGreaterThan(0);
    expect(quarter).toBeLessThan(136);
    frame(1000 + GLIDE_MS / 2);
    expect(el.scrollTop).toBeGreaterThan(quarter);
    frame(1000 + GLIDE_MS);
    expect(el.scrollTop).toBe(136);
    expect(frames.size).toBe(0);
    // Arrived, it lets go of the box.
    expect(el.count("touchstart") + el.count("wheel")).toBe(0);
  });

  it("is not ended by anything that moves the box between its frames, as a caret's reveal ended the smooth scroll", () => {
    const el = box();
    glideScroll(el as unknown as HTMLElement, 136, { smooth: true });
    frame(0);
    frame(GLIDE_MS / 3);
    // A letter typed: the field reveals its caret, the box stays put.
    el.scrollTop = el.scrollTop;
    frame(GLIDE_MS);
    expect(el.scrollTop).toBe(136);
  });

  it("goes no further than the room the box has", () => {
    const el = box(600, 481);
    glideScroll(el as unknown as HTMLElement, 400, { smooth: true });
    frame(0);
    frame(GLIDE_MS);
    expect(el.scrollTop).toBe(119);
  });

  it("is there at once when the reader asked for less motion", () => {
    const el = box();
    glideScroll(el as unknown as HTMLElement, 136, { smooth: false });
    expect(el.scrollTop).toBe(136);
    expect(frames.size).toBe(0);
  });

  it("stops where it stands when a finger or a wheel takes the box", () => {
    for (const how of ["touchstart", "wheel"]) {
      const el = box();
      glideScroll(el as unknown as HTMLElement, 136, { smooth: true });
      frame(0);
      frame(GLIDE_MS / 4);
      const at = el.scrollTop;
      el.fire(how);
      frame(GLIDE_MS);
      expect(el.scrollTop).toBe(at);
      expect(frames.size).toBe(0);
    }
  });

  it("and its stop does the same", () => {
    const el = box();
    const stop = glideScroll(el as unknown as HTMLElement, 136, { smooth: true });
    frame(0);
    frame(GLIDE_MS / 4);
    const at = el.scrollTop;
    stop();
    frame(GLIDE_MS);
    expect(el.scrollTop).toBe(at);
  });
});

describe("Community's page for a new post", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "../../../components/community/ComposePage.tsx"), "utf8");

  it("folds its head on the first words with the glide, not a smooth scroll a caret can end", () => {
    expect(src).toMatch(/glideScroll\(root, by, \{ smooth: !prefersReducedMotion\(\) \}\)/);
    expect(src).not.toMatch(/behavior:\s*scrollBehavior\(\)/);
  });
});
