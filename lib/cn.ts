import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The design system declares a custom size-only type scale in
 * `app/globals.css` (`--text-eyebrow … --text-display-lg`), which Tailwind
 * turns into `text-eyebrow … text-display-lg` font-size utilities.
 *
 * tailwind-merge doesn't know these names, so out of the box it treats
 * `text-ui`, `text-body`, etc. as *text-colour* utilities and lets them
 * collide with real colours like `text-ink` / `text-paper` / `text-gold`.
 * When both land in one `cn(...)` call the colour gets silently dropped —
 * e.g. an inverse button keeps `bg-paper` but loses `text-ink` and inherits
 * white-on-white. Registering the scale as font-size keeps colour and size
 * in separate groups so both survive the merge.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "eyebrow",
            "caption",
            "detail",
            "ui",
            "body",
            "lede",
            "title-sm",
            "title",
            "heading",
            "display-sm",
            "display",
            "display-lg",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
