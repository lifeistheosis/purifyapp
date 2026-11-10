// A florilegium as words to hand on (1.9, s5-05 of docs/1.9-build/ideas.json:
// "share a florilegium as a page or a booklet, citations kept exact: readers
// bring readers"). Pure: the gathering's page shares it through the phone's
// share sheet in the apps, and prints it as a booklet on the website.

import type { Florilegium, FlorilegiumItem, FlorilegiumItemInput } from "./florilegium";

/**
 * Where a gathered line comes from, as its card names it: the reference, or
 * the Father and the work. Of a line already kept, or one about to be (the
 * sheet that picks its gathering shows it as it will stand).
 */
export function itemSource(item: FlorilegiumItem | FlorilegiumItemInput): string {
  return item.kind === "scripture" ? item.reference : [item.author, item.work].filter(Boolean).join(", ");
}

/**
 * The gathering as plain text: its name and its line under it, then each
 * gathered line, word for word as it was kept, with where it comes from
 * under it and the reader's note after, and where it was gathered at the
 * foot. Nothing reworded: the citations go as they were kept.
 */
export function florilegiumAsText(f: Florilegium): string {
  const parts = [f.title.trim()];
  if (f.description?.trim()) parts.push(f.description.trim());
  for (const item of f.items) {
    const text = item.text?.trim();
    if (!text) continue;
    const lines = [text, itemSource(item)];
    if (item.note?.trim()) lines.push(`(${item.note.trim()})`);
    parts.push(lines.join("\n"));
  }
  parts.push("purifyapp.net");
  return parts.join("\n\n");
}
