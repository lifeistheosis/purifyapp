import { CommandPalette } from "./CommandPalette";

/**
 * Mounts the command palette. Mounted once in the app-group layout.
 *
 * This used to be an async server component that awaited buildSearchCorpus()
 * and handed the whole list down as a prop, which made Next serialise the
 * corpus into every page it rendered: 66,778 bytes of HTML and 59,596 of RSC
 * payload on 1,811 of 1,820 exported pages, 218 MB raw and 44.5 MB of the
 * download, to power a dialog that returns null until someone presses Cmd+K.
 *
 * The corpus is a static file now, app/search-corpus.json, and the palette
 * fetches it the first time it is opened.
 *
 * Kept as a component rather than inlining <CommandPalette /> into the
 * layout, so the layout does not have to know about the palette's client
 * boundary and the mount point stays one named thing.
 */
export function CommandPaletteMount() {
  return <CommandPalette />;
}
