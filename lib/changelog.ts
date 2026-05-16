import patchesJson from "@/data/changelog/patches.json";

export type PatchSection = { heading: string; body: string };
export type PatchFutureItem = { title: string; body: string };

export type Patch = {
  id: string;
  version: string;
  date: string;
  title: string;
  intro: string;
  sections: PatchSection[];
  future: PatchFutureItem[];
  closing: string;
  signOff: string;
};

export const PATCHES: Patch[] = (patchesJson as Patch[])
  .slice()
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

export function latestPatch(): Patch | undefined {
  return PATCHES[0];
}
