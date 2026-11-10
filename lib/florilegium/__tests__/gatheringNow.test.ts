// The gathering on the screen, for the bar over it (1.9, F2): the gathering
// says which it is as it is drawn and takes it away as it goes
// (lib/florilegium/gatheringNow.ts). The bar reads it, so it stands in no
// Suspense boundary: in one of its own it was drawn a beat after its page
// when the page's script was still arriving, and the page switch was
// pictured twice.

import { afterEach, describe, expect, it } from "vitest";

import { gatheringNow, hideGathering, onGatheringNow, showGathering } from "@/lib/florilegium/gatheringNow";

/** How many times a listener was told, and the way to stop listening. */
function listen() {
  const heard = { times: 0 };
  const stop = onGatheringNow(() => {
    heard.times += 1;
  });
  return { heard, stop };
}

afterEach(() => {
  const open = gatheringNow();
  if (open) hideGathering(open.id);
});

describe("the gathering on the screen", () => {
  it("is none until a gathering says it is there", () => {
    expect(gatheringNow()).toBeNull();
    showGathering("a", "On the light");
    expect(gatheringNow()).toEqual({ id: "a", title: "On the light" });
  });

  it("is said once: the same gathering under the same name tells nobody again", () => {
    const { heard, stop } = listen();
    showGathering("a", "On the light");
    const first = gatheringNow();
    showGathering("a", "On the light");
    // The same object, so a reader of it is not drawn again for nothing.
    expect(gatheringNow()).toBe(first);
    expect(heard.times).toBe(1);
    stop();
  });

  it("follows a new name, the reader's own words", () => {
    const { heard, stop } = listen();
    showGathering("a", "On the light");
    showGathering("a", "نور");
    expect(gatheringNow()).toEqual({ id: "a", title: "نور" });
    expect(heard.times).toBe(2);
    stop();
  });

  it("is taken away by the gathering that said it, and by no other", () => {
    const { heard, stop } = listen();
    showGathering("a", "On the light");
    hideGathering("b");
    expect(gatheringNow()).toEqual({ id: "a", title: "On the light" });
    expect(heard.times).toBe(1);
    hideGathering("a");
    expect(gatheringNow()).toBeNull();
    expect(heard.times).toBe(2);
    // Taking away what is not there tells nobody.
    hideGathering("a");
    expect(heard.times).toBe(2);
    stop();
  });

  it("ends on the gathering that arrived, whichever of the two is heard first as one page gives way to the next", () => {
    // The next page is drawn before the last has gone.
    showGathering("a", "On the light");
    showGathering("b", "On mercy");
    hideGathering("a");
    expect(gatheringNow()).toEqual({ id: "b", title: "On mercy" });
    // The last page goes first.
    hideGathering("b");
    showGathering("a", "On the light");
    hideGathering("a");
    showGathering("b", "On mercy");
    expect(gatheringNow()).toEqual({ id: "b", title: "On mercy" });
  });

  it("stops telling a listener that has stopped listening", () => {
    const { heard, stop } = listen();
    stop();
    showGathering("a", "On the light");
    expect(heard.times).toBe(0);
  });
});
