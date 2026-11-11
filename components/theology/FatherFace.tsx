"use client";

import { SaintFace } from "@/components/today/SaintFace";
import { FacePlate } from "@/components/ui/CrossPlate";
import { isNativeClient } from "@/lib/platform/native";
import { COVER_FACES } from "@/lib/today/saintFaces";
import { useMounted } from "@/lib/useMounted";

import { fatherPicture } from "./fatherPicture";
import { PictureCreditNote } from "@/components/saints/PictureCredit";

/**
 * A Father's face in a small round frame (1.8, round 3 r3-13, B's images):
 * beside a study he is quoted in most, beside the part of a study he speaks
 * in. His cover portrait, asked of the website in the apps, with the icon
 * the app carries when it cannot be had (lib/today/saintFaces.ts), chosen on
 * the device. It comes over the house's plate (FacePlate, its lit cross), so
 * a Father with no cleared picture, a text no saint wrote, or a picture that
 * cannot come is the plate: never an empty round and never a letter (1.9,
 * build 93 note 1). Decoration: his name, or the study's, is beside it.
 *
 * The frame is cut about his face, where his portrait has him to one side
 * (1.9, build 89 note 2; lib/today/saintFaces.ts, faceShift and COVER_FACES):
 * St Basil's face stood half out of it. A face is where it is in its
 * picture, so the frame keeps its direction in Arabic (`dir`), as a picture
 * does: it is not mirrored.
 */
export function FatherFace({
  father,
  size,
  zoom = 1.4,
  className,
}: {
  father?: { slug?: string; name: string; iconUrl?: string };
  size: number;
  zoom?: number;
  className?: string;
}) {
  const onDevice = useMounted();
  const native = onDevice && isNativeClient();
  // A Father with a page has a picture, chosen once the page is on the device.
  const picture = onDevice && father?.slug ? fatherPicture({ saintSlug: father.slug, iconUrl: father.iconUrl }, native) : null;
  return (
    <>
    <span
      aria-hidden
      dir="ltr"
      className={`theology-face relative block shrink-0 overflow-hidden rounded-full bg-night-soft ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <FacePlate size="disc" />
      {picture ? (
        <SaintFace key={picture.src} picture={picture} zoom={zoom} across={father?.slug ? COVER_FACES[father.slug]?.[0] : undefined} className="relative" />
      ) : null}
    </span>
    {/* A picture whose licence asks its maker be named says so to a screen reader (2026-11-11). */}
    <PictureCreditNote src={picture?.src} />
    </>
  );
}
