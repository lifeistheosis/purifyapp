// The route-exit flag, and the guarantee that matters: it always clears.
//
// The flag fades the app's content out while a tab navigation resolves. If it
// could ever be left set, the reader would be looking at a blank screen with
// no way back, so there are two independent clears: RouteExitBridge on the
// committed pathname, and the watchdog asserted here. This tests the watchdog,
// because it is the one that has to hold when the navigation never commits at
// all (a suspended route, a dropped chunk, the app backgrounded mid-tap) and
// therefore the one a browser test cannot reliably provoke.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  beginRouteExit,
  endRouteExit,
  isRouteExiting,
} from "../routeTransition";

/** The module only ever touches `document.body.dataset`. */
function stubDocument() {
  const dataset: Record<string, string> = {};
  (globalThis as { document?: unknown }).document = { body: { dataset } };
  return dataset;
}

describe("route exit flag", () => {
  let dataset: Record<string, string>;

  beforeEach(() => {
    vi.useFakeTimers();
    dataset = stubDocument();
  });

  afterEach(() => {
    endRouteExit();
    vi.useRealTimers();
    delete (globalThis as { document?: unknown }).document;
  });

  it("sets the flag synchronously, in the same tick as the tap", () => {
    beginRouteExit();
    expect(dataset.routeExit).toBe("1");
    expect(isRouteExiting()).toBe(true);
  });

  it("clears itself even when the navigation never commits", () => {
    beginRouteExit();
    // Just under the watchdog: still fading, which is correct.
    vi.advanceTimersByTime(699);
    expect(isRouteExiting()).toBe(true);
    vi.advanceTimersByTime(2);
    expect(isRouteExiting()).toBe(false);
    expect(dataset.routeExit).toBeUndefined();
  });

  it("a second tap resets the watchdog rather than stacking another", () => {
    beginRouteExit();
    vi.advanceTimersByTime(600);
    beginRouteExit(); // the reader taps a different tab mid-fade
    vi.advanceTimersByTime(600);
    // The first timer must not have fired and cleared the second fade.
    expect(isRouteExiting()).toBe(true);
    vi.advanceTimersByTime(200);
    expect(isRouteExiting()).toBe(false);
  });

  it("an explicit clear cancels the watchdog, so it cannot fire later", () => {
    beginRouteExit();
    endRouteExit();
    expect(isRouteExiting()).toBe(false);
    // A stale timer firing here would clear a fade that a LATER tap started.
    beginRouteExit();
    vi.advanceTimersByTime(699);
    expect(isRouteExiting()).toBe(true);
  });

  it("is inert on the server, where there is no document", () => {
    delete (globalThis as { document?: unknown }).document;
    expect(() => beginRouteExit()).not.toThrow();
    expect(() => endRouteExit()).not.toThrow();
    expect(isRouteExiting()).toBe(false);
  });
});
