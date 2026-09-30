"use client";

import Image from "next/image";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { formatPrice } from "@/lib/shop/format";
import type { ShopProductFull } from "@/lib/shop/types";

/**
 * An EIKON piece, told before it is sold (the owner, 2026-09-30: product pages
 * as a scroll-driven story, not a catalogue entry).
 *
 * Four frames, then the ordinary product page underneath, where the buy bar,
 * the details, the reviews and the policies all still live:
 *
 *   1. THE PIECE. The photograph alone on obsidian, the title, one line.
 *   2. ITS MAKING. The same photograph, blurred and huge, drifting behind
 *      the facts the listing already holds: who made it, how, from what,
 *      where. Nothing is written that the listing does not say.
 *   3. UP CLOSE. The listing's own photographs, enlarged, one after another.
 *      Skipped when the photograph is marked representative: a close look at
 *      a stand-in would be a close look at something the buyer is not getting.
 *   4. THE CLOSE. The price, and the page carries on into the buy bar.
 *
 * Only the product's own media and fields are used. No stock footage, no
 * generated imagery, no invented provenance (the standing rule on images).
 *
 * The motion is CSS scroll-driven (`animation-timeline: view()`, the
 * `.eikon-*` rules in app/globals.css): each frame moves with the scroll, not
 * on a timer, and a browser without the feature shows the same frames still.
 * It is always on, like the phones on the front page, which the owner asked to
 * keep moving (components/marketing/AppsSection.tsx).
 */

function firstSentence(md: string | null): string | null {
  if (!md) return null;
  const plain = md.replace(/[#*_>`[\]]/g, "").replace(/\s+/g, " ").trim();
  const m = /^(.{20,180}?[.!?])(\s|$)/.exec(plain);
  return m ? m[1] : plain.length <= 180 ? plain : null;
}

export function EikonStory({ product }: { product: ShopProductFull }) {
  const { t } = useTranslate();
  const hero = product.media[0];
  if (!hero) return null;

  const hook = product.subtitle ?? firstSentence(product.description_md);
  const facts = [
    { term: t("shop.madeBy"), value: product.maker_name },
    { term: t("shop.productionMethod"), value: product.production_method },
    { term: t("shop.materials"), value: product.materials },
    { term: t("shop.countryOfOrigin"), value: product.country_of_origin },
  ].filter((f): f is { term: string; value: string } => Boolean(f.value));
  const closeUps = product.image_is_representative ? [] : product.media.slice(0, 3);

  return (
    // overflow-clip, never overflow-hidden: hidden makes this a scroll
    // container, and every view() timeline inside would then follow a box
    // that never scrolls, freezing each frame part way through its motion.
    <div className="dark-island relative -mx-5 overflow-clip bg-[#0a0a0a] text-paper md:-mx-8">
      {/* 1. The piece. */}
      {/* On a phone the buy bar is fixed along the foot of the screen, so
          the first frame is sized to the space above it, not the whole
          screen, or the title would open underneath the bar. */}
      <section
        aria-label={product.title}
        className="relative flex min-h-[58svh] flex-col items-center justify-center px-6 pb-12 pt-10 text-center md:min-h-[92svh] md:py-16"
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(50% 45% at 50% 42%, rgba(201,162,90,0.16), transparent 72%)" }}
        />
        <div className="eikon-hero relative aspect-[4/5] w-[min(52vw,380px)]">
          <Image src={hero.media_url} alt={hero.alt_text} fill priority sizes="380px" className="object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)]" />
        </div>
        <h1 className="relative mt-7 max-w-[22ch] text-balance font-serif text-title leading-tight text-[#f3ead6] md:mt-10 md:text-display-sm">
          {product.title}
        </h1>
        {hook ? <p className="relative mt-4 max-w-[36ch] text-pretty font-serif text-lede italic text-[#e2c68b]">{hook}</p> : null}
        <div aria-hidden className="relative mt-12 hidden h-10 w-px md:block" style={{ background: "linear-gradient(#c9a25a, transparent)" }} />
      </section>

      {/* 2. Its making. */}
      {facts.length > 0 ? (
        <section aria-label={t("shop.details")} className="relative flex min-h-[80svh] items-center overflow-clip px-6 py-24">
          <div aria-hidden className="eikon-drift absolute inset-[-12%]">
            <Image src={hero.media_url} alt="" fill sizes="100vw" className="scale-125 object-cover opacity-35 blur-2xl" />
          </div>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/40 to-[#0a0a0a]" />
          <dl className="relative mx-auto grid w-full max-w-[560px] gap-10">
            {facts.map((f) => (
              <div key={f.term} className="eikon-rise text-center">
                <dt className="font-sans text-caption uppercase tracking-[0.28em] text-[#c9a25a]">{f.term}</dt>
                <dd className="mt-2 text-balance font-serif text-title leading-snug text-[#f3ead6]">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* 3. Up close. */}
      {closeUps.map((m, i) => (
        <section key={m.id} aria-label={m.alt_text} className="relative px-5 py-10 md:px-8">
          <div className="eikon-macro relative mx-auto aspect-[4/3] max-w-[980px] overflow-hidden rounded-[3px]">
            <Image
              src={m.media_url}
              alt={m.alt_text}
              fill
              sizes="(min-width: 1024px) 980px, 100vw"
              className="scale-[1.6] object-cover"
              style={{ objectPosition: ["50% 30%", "30% 60%", "70% 45%"][i % 3] }}
            />
          </div>
        </section>
      ))}

      {/* 4. The close: the page carries on into the buy bar below. */}
      <section className="relative px-6 pb-20 pt-16 text-center">
        <div aria-hidden className="mx-auto h-px w-24" style={{ background: "linear-gradient(90deg, transparent, #c9a25a, transparent)" }} />
        <p className="eikon-rise mt-10 font-sans text-title tabular-nums tracking-[0.06em] text-[#f3ead6]">
          {formatPrice(product.price_cents)}
        </p>
        <p className="mt-2 font-serif text-detail italic text-paper/55">{product.store.public_name}</p>
      </section>
    </div>
  );
}
