"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { faceLabelSize } from "@/lib/councils/faceLabel";
import type { CouncilFace, FacePicture as FacePictureData } from "@/lib/councils/fathers";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

/**
 * "The Holy Fathers principally associated", one at a time (1.8, the owner's
 * pick of r3-03, C's "Nicaea, at a glance": "I love that design"). The Father
 * shown is a card: his face, his name, his byname and his part at the
 * council, the whole card opening his page where Purify has one. Under it a
 * row of the council's Fathers, a face each with his first name, and a tap on
 * a face shows him; the one shown is lit, ringed in the page's ink with a
 * soft white glow, never gold.
 *
 * A Father with no settled picture (lib/councils/fathers.ts) is drawn by his
 * name: a halo and his initial on the dark ground a cover has, never a face.
 * A council with one Father has no row to choose from.
 */
export function CouncilFathers({ fathers }: { fathers: CouncilFace[] }) {
  const { t } = useTranslate();
  const [shown, setShown] = useState(0);
  if (!fathers.length) return null;
  const f = fathers[Math.min(shown, fathers.length - 1)];

  const inner = (
    // Keyed by the Father, so a new one arrives as the page's own entrance does.
    <span key={f.name} className="cascade flex min-w-0 gap-3.5">
      <FatherFace face={f} shape="portrait" />
      <span className="block min-w-0 flex-1">
        <span className="block font-serif text-[16px] font-semibold leading-[1.2] text-paper">{f.name}</span>
        {f.byname ? <span className="mt-0.5 block font-sans text-[11.5px] leading-snug text-paper/50">{f.byname}</span> : null}
        <span className="mt-2 block font-sans text-caption leading-[1.45] text-paper/80">{f.role}</span>
      </span>
    </span>
  );
  const card =
    "block rounded-[20px] bg-night-soft p-3.5 shadow-[0_22px_36px_-22px_rgba(0,0,0,0.95)] ring-1 ring-inset ring-paper/8 overflow-hidden";

  return (
    <section aria-labelledby="council-fathers" data-council-fathers="" className="mt-7">
      <h2 id="council-fathers" className="text-[18px] font-semibold leading-tight tracking-[-0.01em] text-paper">
        {t("study.councils.fathersAssociated")}
      </h2>
      <div className="mt-3" aria-live="polite">
        {f.href ? (
          <Link href={f.href} prefetch={false} className={cn("press-card", card)}>
            {inner}
          </Link>
        ) : (
          <div className={card}>{inner}</div>
        )}
      </div>
      {fathers.length > 1 ? (
        <ul className="mt-4 grid grid-cols-6 gap-y-3 md:max-w-[440px]" aria-label={t("study.councils.fathersAssociated")}>
          {fathers.map((x, i) => {
            const on = i === shown;
            return (
              // A size container, so the word under the face is sized to its column and never cut.
              <li key={x.name} className="@container min-w-0">
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={x.name}
                  onClick={() => setShown(i)}
                  data-father-face={on ? "shown" : ""}
                  className="tap-press flex w-full flex-col items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
                >
                  <span
                    className={cn(
                      "block rounded-full motion-safe:transition-shadow motion-safe:duration-200",
                      on
                        ? "shadow-[0_0_0_2px_var(--color-night),0_0_0_3.5px_var(--color-paper),0_0_18px_3px_rgb(255_255_255/0.3)]"
                        : "shadow-[0_0_0_1px_rgb(255_255_255/0.12)]",
                    )}
                  >
                    <FatherFace face={x} shape="round" />
                  </span>
                  <span
                    aria-hidden
                    data-father-label=""
                    className={cn(
                      "block whitespace-nowrap font-sans text-[10.5px] font-semibold leading-tight motion-safe:transition-colors motion-safe:duration-200",
                      on ? "text-paper" : "text-paper/50",
                    )}
                    style={{ fontSize: faceLabelSize(x.label) }}
                  >
                    {x.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * A Father's face, as a portrait for the card or a round to tap: his settled
 * picture, cut nearer to his face, fading in as it arrives; or, with none, a
 * halo and his initial. Either way a dark island, as a cover is, on every
 * palette.
 *
 * With no signal (build 83's walk of the apps) a portrait the website streams
 * cannot come: then the icon the app carries of him, where its rights are
 * settled (lib/councils/fathers.ts, `fallback`), and only then his name.
 */
export function FatherFace({ face, shape }: { face: Pick<CouncilFace, "picture" | "initial">; shape: "portrait" | "round" }) {
  // The pictures that could not come, so the next is tried, and then his name.
  const [gone, setGone] = useState<readonly string[]>([]);
  const box = shape === "portrait" ? "h-32 w-24 rounded-[12px]" : "size-11 rounded-full";
  const tries: FacePictureData[] = face.picture ? [face.picture, ...(face.picture.fallback ? [face.picture.fallback] : [])] : [];
  const picture = tries.find((p) => !gone.includes(p.src)) ?? null;
  return (
    <span
      aria-hidden
      className={cn(
        "dark-island relative block shrink-0 overflow-hidden bg-night shadow-[0_10px_20px_-10px_rgba(0,0,0,0.9)]",
        box,
      )}
    >
      {picture ? (
        <FacePicture
          key={picture.src}
          picture={picture}
          zoom={shape === "round" ? 1.9 : 1.4}
          onFail={() => setGone((g) => (g.includes(picture.src) ? g : [...g, picture.src]))}
        />
      ) : (
        <Halo initial={face.initial} shape={shape} />
      )}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />
    </span>
  );
}

function FacePicture({ picture, zoom, onFail }: { picture: FacePictureData; zoom: number; onFail: () => void }) {
  const { ref, onArrive } = useArrivingImage(picture.src);
  // One that failed before the page could listen.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.currentSrc && img.naturalWidth === 0) onFail();
  }, [ref, onFail]);
  const at = `50% ${picture.focusY}%`;
  const style: CSSProperties = { objectPosition: at, transformOrigin: at, transform: `scale(${zoom})` };
  return (
    // eslint-disable-next-line @next/next/no-img-element -- the cover's own picture, cut nearer.
    <img
      ref={ref}
      src={picture.src}
      alt=""
      loading="lazy"
      decoding="async"
      onLoad={onArrive}
      onError={onFail}
      className="img-arrive absolute inset-0 h-full w-full object-cover"
      style={style}
    />
  );
}

/** No settled picture: a halo and his initial, lit softly from above, never a face. */
function Halo({ initial, shape }: { initial: string; shape: "portrait" | "round" }) {
  const ground = {
    backgroundImage:
      shape === "round"
        ? "radial-gradient(circle at 50% 40%, rgb(255 255 255 / 0.12), rgb(255 255 255 / 0.03) 70%)"
        : "radial-gradient(80% 60% at 50% 38%, rgb(255 255 255 / 0.12), rgb(255 255 255 / 0) 75%)",
  } as CSSProperties;
  if (shape === "round") {
    return (
      <span data-father-halo="" className="absolute inset-0 grid place-items-center font-serif text-[17px] font-semibold text-paper/75" style={ground}>
        {initial}
      </span>
    );
  }
  return (
    <span data-father-halo="" className="absolute inset-0 rounded-[inherit]" style={ground}>
      <span className="absolute inset-[3px] rounded-[inherit] ring-1 ring-inset ring-white/10" />
      <span
        className={cn(
          "absolute left-1/2 grid -translate-x-1/2 place-items-center rounded-full font-serif font-semibold text-paper/80",
          "top-[30px] size-10 text-[19px] ring-[1.3px] ring-white/55 shadow-[0_0_12px_rgb(255_255_255/0.25),inset_0_0_10px_rgb(255_255_255/0.08)]",
        )}
      >
        {initial}
      </span>
    </span>
  );
}
