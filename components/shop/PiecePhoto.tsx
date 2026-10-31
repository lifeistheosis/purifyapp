"use client";

import type { CSSProperties } from "react";
import Image from "next/image";

import { CrossPlate } from "@/components/ui/CrossPlate";
import { cn } from "@/lib/cn";
import type { BuyerOrderItem } from "@/lib/shop/buyerReads";
import { piecePhoto } from "@/lib/shop/orderStory";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

/**
 * A piece's photograph in the shop's own lit vitrine, small, for an order's
 * line, the list of orders and the thread about it (r3-19: build 85 showed
 * no piece anywhere on these pages). Contained, never covered: icons are
 * sacred images and a face is never cut (components/shop/ProductCard.tsx).
 *
 * It arrives whole (lib/ui/useArrivingImage.ts, note 52's rule): drawn as
 * nothing until it is in, then faded in on the app's motion switch, in a box
 * of its own size, so nothing moves. A piece taken down since it was bought
 * has no photo to show, and stands as the plate with the cross.
 */
export function PiecePhoto({
  photo,
  sizes,
  className,
  style,
}: {
  photo: { src: string; alt: string } | null;
  /** The drawn width, for the picture's `sizes`. */
  sizes: string;
  /** The box's corners, and its size when `style` does not give it. */
  className?: string;
  style?: CSSProperties;
}) {
  if (!photo) return <CrossPlate size="thumb" className={cn("shrink-0", className)} style={style} />;
  return (
    <span
      aria-hidden
      className={cn("shop-vitrine relative block shrink-0 overflow-hidden ring-1 ring-inset ring-paper/[0.07]", className)}
      style={style}
    >
      <PiecePicture key={photo.src} src={photo.src} sizes={sizes} />
    </span>
  );
}

function PiecePicture({ src, sizes }: { src: string; sizes: string }) {
  const { ref, onArrive } = useArrivingImage(src);
  return (
    <Image
      ref={ref}
      src={src}
      alt=""
      fill
      sizes={sizes}
      onLoad={onArrive}
      className="img-arrive object-contain p-[9%] drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)]"
    />
  );
}

/**
 * An order's pieces: its one piece, or the first two with the second behind
 * the first, as Orders B draws an order of two.
 */
export function OrderPieces({
  items,
  width,
  height,
  rounded = "rounded-xl",
}: {
  items: readonly BuyerOrderItem[];
  width: number;
  height: number;
  rounded?: string;
}) {
  const first = piecePhoto(items[0]?.product ?? null);
  if (items.length < 2) {
    return <PiecePhoto photo={first} sizes={`${width}px`} className={rounded} style={{ width, height }} />;
  }
  const second = piecePhoto(items[1]?.product ?? null);
  const w = width - 8;
  const h = height - 10;
  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: width + 14, height }}>
      <span className="absolute end-0 top-0 block opacity-90">
        <PiecePhoto photo={second} sizes={`${w}px`} className={rounded} style={{ width: w, height: h }} />
      </span>
      <span className="absolute bottom-0 start-0 block rounded-xl shadow-[0_8px_16px_-6px_rgba(0,0,0,0.6)]">
        <PiecePhoto photo={first} sizes={`${w}px`} className={rounded} style={{ width: w, height: h }} />
      </span>
    </span>
  );
}
