import { councilFocus, councilPicture } from "@/lib/councils/page";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

import { CouncilPicture } from "./CouncilPicture";

/**
 * What a council wears at the start of a row: its own picture in a small
 * square, as a step of the path draws it (components/theology/StepView.tsx,
 * ReadMark), its soft preview under the picture until the picture is in
 * whole. A council with no picture (one outside the seven) wears nothing: a
 * row has no icon tile (1.9, the fifteen screens, rule 4). Decoration: the
 * council's name is beside it.
 */
export function CouncilMark({ slug }: { /** The council's slug in the registry; none for a council with no page of its own. */ slug?: string }) {
  const picture = slug ? councilPicture(slug, IS_STATIC_EXPORT) : null;
  if (!slug || !picture) return null;
  return (
    <span aria-hidden className="relative block size-[34px] shrink-0 overflow-hidden rounded-[10px] bg-night-soft ring-1 ring-inset ring-paper/15">
      {picture.preview ? <span className="absolute inset-0 scale-110 bg-cover bg-center blur-sm" style={{ backgroundImage: `url(${picture.preview})` }} /> : null}
      <CouncilPicture src={picture.src} avif={picture.avif} focus={councilFocus(slug)} className="absolute inset-0 h-full w-full object-cover" />
    </span>
  );
}
