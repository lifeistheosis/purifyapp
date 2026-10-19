"use client";

// The page end of "Read it in Purify" (1.7.2, lib/reading/quoteFocus.ts):
// when a page opens on words a link came to read, find them, bring them up
// the screen and light them, for as long as the reader stays.
//
// Mounted once, in components/layout/AppFrame.tsx, so every text the app
// carries answers: a council's decree, a Father's work, a psalm.
//
// The words are looked for in the page's own text, so they are found however
// the page draws them, and they wait for it: in the apps a Father's work lands
// a moment after its page opens, and a long one opens the section its link
// names first. A reader who has started to scroll by then is not moved
// (lib/ui/lastInput.ts); the words are lit where they stand.
//
// The light is the CSS Custom Highlight API, which paints over the text
// without touching it, so nothing React drew is changed. Where the browser has
// none (iOS before 17.2) the page is still brought to the words, unlit. Should
// the page draw the words again (a reader's own highlights arriving), they are
// found again.

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { locate, takeQuoteFocus } from "@/lib/reading/quoteFocus";
import { inputSince, watchInput } from "@/lib/ui/lastInput";

const NAME = "purify-quote";

/**
 * A grey wash behind the words, which lifts them off the black of every dark
 * mode and sets them down on Parchment alike. Never a colour a reader's own
 * highlights wear, and no box: it follows the words, line by line. Written
 * into the page from here, not app/globals.css, because the bundler's CSS
 * parser does not know ::highlight() yet and refuses the file over it.
 */
const WASH = `::highlight(${NAME}) { background-color: rgb(140 140 145 / 0.3); }`;

function ensureWash(): void {
  if (document.querySelector("style[data-quote-wash]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-quote-wash", "");
  style.textContent = WASH;
  document.head.appendChild(style);
}

/**
 * How long to keep looking for words a page has not drawn yet, and to bring
 * them up the screen once found: a slow phone opening a long work.
 */
const WAIT_MS = 20_000;

/** The words a reader reads, in order: not what is hidden from them, nor a note's mark. */
function textNodes(root: Element): Text[] {
  const out: Text[] = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    if (node.parentElement?.closest('[aria-hidden="true"], script, style, sup')) continue;
    out.push(node as Text);
  }
  return out;
}

/** Up the screen to a third of the way down, at once: the page has only just opened. */
function bringUp(range: Range): void {
  const top = range.getBoundingClientRect().top;
  window.scrollTo({ top: Math.max(0, window.scrollY + top - window.innerHeight * 0.3), behavior: "instant" as ScrollBehavior });
}

export function QuoteFocus() {
  const pathname = usePathname();

  useEffect(() => {
    const texts = takeQuoteFocus(pathname);
    if (!texts?.length) return;
    const lights = typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight === "function" ? CSS.highlights : null;
    if (lights) ensureWash();
    watchInput();
    const opened = performance.now();
    const found = new Map<string, Range>();
    const deadline = opened + WAIT_MS;
    let scrolled = false;
    let queued: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;

    const root = () => document.querySelector("main[data-route-content]") ?? document.body;
    const live = (r: Range) => r.startContainer.isConnected && r.endContainer.isConnected;

    /** Looks for the words not yet found, or found and since drawn again. */
    const search = () => {
      const nodes = textNodes(root());
      const pieces = nodes.map((n) => n.data);
      let changed = false;
      for (const text of texts) {
        const had = found.get(text);
        if (had && live(had)) continue;
        const place = locate(pieces, text);
        if (!place) {
          if (had) {
            found.delete(text);
            changed = true;
          }
          continue;
        }
        const range = document.createRange();
        range.setStart(nodes[place.start.piece], place.start.offset);
        range.setEnd(nodes[place.end.piece], place.end.offset);
        found.set(text, range);
        changed = true;
      }
      if (changed && lights) lights.set(NAME, new Highlight(...found.values()));
      if (!scrolled) {
        // The first quotation the link carried, as it reads in the guide.
        const first = texts.map((t) => found.get(t)).find((r): r is Range => r !== undefined);
        if (first) {
          scrolled = true;
          if (!inputSince(opened) && performance.now() < deadline) bringUp(first);
        }
      }
    };

    // The first look comes after the page's own first moves: the router's
    // scroll to the place the link names, a long work opening that section.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(search);
    });

    // Then a look each time the page changes and settles, while words are
    // still to come (a page whose text lands after it opens) or were drawn
    // again (a reader's own highlights arriving).
    const watch = new MutationObserver(() => {
      const coming = performance.now() < deadline && texts.some((t) => !found.has(t));
      const redrawn = [...found.values()].some((r) => !live(r));
      if (!coming && !redrawn) return;
      clearTimeout(queued);
      queued = setTimeout(search, 120);
    });
    watch.observe(root(), { childList: true, subtree: true, characterData: true });

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(queued);
      watch.disconnect();
      lights?.delete(NAME);
    };
  }, [pathname]);

  return null;
}
