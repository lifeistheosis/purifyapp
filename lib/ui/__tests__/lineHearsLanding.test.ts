// The running line is settled in the frame a verse link's chapter is first
// drawn at its verse, with motion on and reduced (Gate 3c rule 3; Updates 91).
// It heard the landing only from the scroll's event, which the browser sends
// in the next frame's scroll steps, and settled in an animation frame asked
// for from there, after every frame callback asked for before it: a read in
// requestAnimationFrame in that frame (the motion walk's) found the chapter at
// its verse with the line shut, the fade under the pill at 582 and then 530,
// or with the words read at the scroll of the page left (James 1:19-20, "v 5
// of 27 · 2 min left" and then "v 19 of 27"). Every case fails on the code
// before the mend: readingPlace.ts had no landingDue or onLanded.
import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import * as place from "../readingPlace";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const { goOnArrival } = place;
const landingDue = () => (place as { landingDue?: () => boolean }).landingDue?.();
const onLanded = (hear: () => void) => {
  const listen = (place as { onLanded?: (h: () => void) => () => void }).onLanded;
  expect(listen, "readingPlace.ts tells a running line of a landing (onLanded)").toBeTypeOf("function");
  return listen!(hear);
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("an arrival's landing tells the running line itself", () => {
  it("with motion reduced, the line is told in the landing's own microtask, after it moved the page", async () => {
    const order: string[] = [];
    const stop = onLanded(() => order.push(`heard (due ${landingDue()})`));
    goOnArrival(() => order.push(`landed (due ${landingDue()})`), true);
    // Due from the call: the line's first read, in a layout effect after the landing's, waits for it.
    expect(landingDue()).toBe(true);
    queueMicrotask(() => order.push("anything after"));
    await new Promise((done) => setTimeout(done, 0));
    stop();
    expect(order).toEqual(["landed (due true)", "heard (due false)", "anything after"]);
    expect(landingDue()).toBe(false);
  });

  it("with motion on, it is told in the frame the glide starts, never a frame later", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    const order: string[] = [];
    const stop = onLanded(() => order.push("heard"));
    goOnArrival(() => order.push("glide starts"), false);
    expect(landingDue()).toBe(true);
    expect(frames).toHaveLength(1);
    frames[0](0);
    stop();
    expect(order).toEqual(["glide starts", "heard"]);
    expect(frames).toHaveLength(1);
    expect(landingDue()).toBe(false);
  });

  it("a landing that finds nothing to go to still ends, and the line still hears it", async () => {
    const heard = vi.fn();
    const stop = onLanded(heard);
    goOnArrival(() => {
      throw new Error("the page had gone");
    }, true);
    const thrown = new Promise<unknown>((done) => {
      const was = process.listeners("uncaughtException");
      process.removeAllListeners("uncaughtException");
      process.once("uncaughtException", (e) => {
        for (const l of was) process.on("uncaughtException", l);
        done(e);
      });
    });
    expect(((await thrown) as Error).message).toBe("the page had gone");
    stop();
    expect(heard).toHaveBeenCalledTimes(1);
    expect(landingDue()).toBe(false);
  });

  it("a line that stopped hearing is not told", async () => {
    const heard = vi.fn();
    onLanded(heard)();
    goOnArrival(() => {}, true);
    await Promise.resolve();
    expect(heard).not.toHaveBeenCalled();
  });
});

describe("the chapter's running line waits for the landing and settles from it", () => {
  const src = read("components/bible/ChapterVerseStatus.tsx");
  it("a shut line does not open while a landing is due", () => {
    expect(src).toMatch(/if \(!open && landingDue\(\)\) return;/);
  });
  it("it settles from the landing, at once and with flushSync, and stops hearing when it goes", () => {
    expect(src).toMatch(/const stopHearing = onLanded\(\(\) => \{\s*cancelAnimationFrame\(raf\);\s*settle\(flushSync\);\s*\}\);/);
    expect(src).toMatch(/return \(\) => \{\s*stopHearing\(\);/);
  });
  it("the landing goes through goOnArrival, which the line hears", () => {
    expect(read("components/bible/VerseFocusFlash.tsx")).toMatch(/if \(arriving\) goOnArrival\(land\);/);
  });
});
