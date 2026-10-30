"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SaintFace } from "@/components/today/SaintFace";
import { isNativeClient } from "@/lib/platform/native";
import { medallionInitial, medallionName } from "@/lib/theology/page";
import { useMounted } from "@/lib/useMounted";

import { fatherPicture } from "./fatherPicture";

/**
 * The Fathers in Theology's studies, a shelf of faces at the hub's foot (1.8,
 * round 3 r3-04, part 3). The foot became shelves (the owner's pick C,
 * 2026-10-30); the Fathers the doctrines quote, a list of names until then,
 * are kept, now as their faces, each opening his page.
 */
export function FathersShelf({ fathers }: { fathers: { slug: string; name: string; iconUrl?: string }[] }) {
  const { t } = useTranslate();
  // The apps ask the website for a portrait, so the picture is chosen on the device.
  const onDevice = useMounted();
  const native = onDevice && isNativeClient();
  if (fathers.length === 0) return null;
  return (
    <section className="mt-7">
      <h3 className="font-serif text-[17px] font-bold leading-tight text-paper">{t("study.theology.fathersInStudies")}</h3>
      <ul className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0">
        {fathers.map((f) => {
          const picture = onDevice ? fatherPicture({ saintSlug: f.slug, iconUrl: f.iconUrl }, native) : null;
          return (
            <li key={f.slug} className="shrink-0">
              <Link href={`/saints/${f.slug}`} prefetch={false} className="tap-press flex w-[76px] flex-col items-center gap-1.5">
                <span className="theology-face relative size-[52px] overflow-hidden rounded-full bg-night-soft">
                  {picture ? (
                    <SaintFace key={picture.src} picture={picture} zoom={1.4} />
                  ) : !onDevice ? null : (
                    <span aria-hidden className="theology-all grid size-full place-items-center rounded-full font-serif text-[17px] font-bold text-paper/85">
                      {medallionInitial(f.name)}
                    </span>
                  )}
                </span>
                <span lang="en" className="line-clamp-2 max-w-full text-center font-sans text-[10.5px] font-semibold leading-tight text-paper/70">
                  {medallionName(f.name)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
