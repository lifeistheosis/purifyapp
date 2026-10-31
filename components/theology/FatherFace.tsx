"use client";

import { SaintFace } from "@/components/today/SaintFace";
import { isNativeClient } from "@/lib/platform/native";
import { medallionInitial } from "@/lib/theology/page";
import { useMounted } from "@/lib/useMounted";

import { fatherPicture } from "./fatherPicture";

/**
 * A Father's face in a small round frame (1.8, round 3 r3-13, B's images):
 * beside a study he is quoted in most, beside the part of a study he speaks
 * in. His cover portrait, asked of the website in the apps, with the icon
 * the app carries when it cannot be had (lib/today/saintFaces.ts), chosen on
 * the device; his initial in a ring when the app has no picture of him.
 * Decoration: his name, or the study's, is beside it.
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
  const picture = onDevice && father?.slug ? fatherPicture({ saintSlug: father.slug, iconUrl: father.iconUrl }, native) : null;
  // A Father with a page has a picture, chosen once the page is on the device.
  const coming = !onDevice && Boolean(father?.slug);
  return (
    <span
      aria-hidden
      className={`theology-face relative block shrink-0 overflow-hidden rounded-full bg-night-soft ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {picture ? (
        <SaintFace key={picture.src} picture={picture} zoom={zoom} />
      ) : coming || !father ? null : (
        <span
          className="theology-all grid size-full place-items-center rounded-full font-serif font-bold text-paper/85"
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {medallionInitial(father.name)}
        </span>
      )}
    </span>
  );
}
