import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { Church } from "@/components/ui/icons/Church";
import { councilFocus, councilPicture } from "@/lib/councils/page";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

/**
 * What a council wears at the start of a row: its own picture in a small
 * square, as a step of the path draws it (components/theology/StepView.tsx,
 * ReadMark), its soft preview under the picture until the picture is in
 * whole. A council with no picture (one outside the seven) wears the church
 * on a plate, the glyph the path gives a council. Decoration: the council's
 * name is beside it.
 */
export function CouncilMark({ slug }: { /** The council's slug in the registry; none for a council with no page of its own. */ slug?: string }) {
  const picture = slug ? councilPicture(slug, IS_STATIC_EXPORT) : null;
  if (!slug || !picture) {
    return (
      <span aria-hidden className="theology-plate grid size-[34px] shrink-0 place-items-center rounded-[10px] text-paper/85">
        <Church size={17} />
      </span>
    );
  }
  return (
    <span aria-hidden className="relative block size-[34px] shrink-0 overflow-hidden rounded-[10px] bg-night-soft ring-1 ring-inset ring-paper/15">
      {picture.preview ? <span className="absolute inset-0 scale-110 bg-cover bg-center blur-sm" style={{ backgroundImage: `url(${picture.preview})` }} /> : null}
      <ArrivingImage src={picture.src} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: councilFocus(slug) }} />
    </span>
  );
}
