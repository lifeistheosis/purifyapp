"use client";

import type { AnchorHTMLAttributes } from "react";

import { scrollBehavior } from "@/lib/ui/motion";

/**
 * A link to a place on the same page that glides there (1.9; the owner's
 * ruling of 2026-11-13: in-page changes that move content move as page
 * switches do). A plain `<a href="#plus">` jumped there at once: Gate 2.0
 * found "See Purify Plus" and "See Purify Pro" on /premium/ cut, the whole
 * screen changed in one frame. The address takes the place as a plain
 * link's would, so a step back returns to where the reader was; with the
 * app's motion reduced the page is there at once; a click with a key held,
 * or a place that is not on the page, is left to the browser.
 */
export function GlideLink({ href, onClick, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: `#${string}` }) {
  return (
    <a
      {...rest}
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const place = document.getElementById(decodeURIComponent(href.slice(1)));
        if (!place) return;
        e.preventDefault();
        window.history.pushState(null, "", href);
        place.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      }}
    >
      {children}
    </a>
  );
}
