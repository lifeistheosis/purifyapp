import { createElement, startTransition, useLayoutEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";

// /set-password/'s blank of 22 frames (Updates 83, 90, 92, Gate 4: 1 in 4 to
// 1 in 8 runs, with motion on). The gate drew its own waiting line, "Loading
// your account.", for a reader with no session kept, although the hold
// answers signed out at once and never lets such a page draw.
//
// The cause is in how React replays a page that waited (react-dom 19.2,
// the same in the build the apps carry, next/dist/compiled/react-dom). A
// page that waits by `use(promise)` is first put aside for a moment, and a
// router push made in that moment does not start the render again. When the
// promise has resolved, React renders the waiting part once more and keeps
// the promises it was given the first time: if `use` is now handed another
// promise at the same place, React keeps the first one (trackUsedThenable,
// "Reuse the previous thenable"). The hold handed it the hold's own promise
// first and NEVER on the replay, so `use` returned the first, which had
// resolved, and the hook fell through to "the bound passed": the waiting line
// was drawn, committed, and only then replaced by sign in.
//
// This test runs the real react-dom over a document just wide enough for
// parts that draw nothing, and walks the switch the way the app does: a
// transition into the signed page, whose hold sends the reader on by a push.

const router: { push: (to: string) => void; replace: (to: string) => void } = { push: () => {}, replace: () => {} };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/supabase/localSession", () => ({ readLocalSessionUser: () => null }));

/** What react-dom touches to mount and commit parts that draw no element. */
function documentForNothing() {
  const noop = () => {};
  const doc = { nodeType: 9, addEventListener: noop, removeEventListener: noop, activeElement: null, body: null, defaultView: null };
  const win = {
    document: doc,
    location: { pathname: "/", search: "" },
    HTMLIFrameElement: class {},
    addEventListener: noop,
    removeEventListener: noop,
    event: undefined,
  };
  Object.assign(globalThis, { window: win, document: doc });
  return { nodeType: 1, nodeName: "DIV", tagName: "DIV", namespaceURI: "http://www.w3.org/1999/xhtml", ownerDocument: doc, addEventListener: noop, removeEventListener: noop, textContent: "", firstChild: null };
}

const settle = async () => {
  for (let i = 0; i < 12; i++) await new Promise((resolve) => setTimeout(resolve, 10));
};

describe("a signed-out reader's switch into a signed page (react-dom's replay)", () => {
  it("never commits the page's own waiting state: the page left goes straight to sign in", async () => {
    const container = documentForNothing();
    const { createRoot } = await import("react-dom/client");
    const { useSignedHold } = await import("../signedHold");
    const drawn: string[] = [];

    function Gate() {
      const held = useSignedHold("/set-password", "/signin", () => true);
      useLayoutEffect(() => {
        drawn.push(held === null ? "the waiting line" : `drawn ${held?.state}`);
      });
      return null;
    }

    let go: (to: string) => void = () => {};
    function Shell() {
      const [page, setPage] = useState("/");
      go = (to) => startTransition(() => setPage(to));
      router.push = go;
      router.replace = go;
      useLayoutEffect(() => {
        drawn.push(page);
      }, [page]);
      return page === "/set-password" ? createElement(Gate) : null;
    }

    const root = createRoot(container as unknown as Element);
    root.render(createElement(Shell));
    await settle();
    go("/set-password");
    await settle();
    root.unmount();

    expect(drawn).toEqual(["/", "/signin"]);
  });
});
