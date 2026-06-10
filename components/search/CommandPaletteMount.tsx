import { buildSearchCorpus } from "@/lib/search/buildCorpus";
import { CommandPalette } from "./CommandPalette";

/**
 * Server wrapper: assembles the search corpus once per render (the topic
 * loader touches the filesystem) and hands the serialisable list to the
 * client palette. Mounted once in the app-group layout.
 */
export async function CommandPaletteMount() {
  const items = await buildSearchCorpus();
  return <CommandPalette items={items} />;
}
