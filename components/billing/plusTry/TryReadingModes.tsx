"use client";

// Try Candlelight and Monastery (r3-07 A, "every row its own"): John 1 in
// Candlelight, and the three palettes in one carved switch, Dark beside the
// two that Plus adds. A tap repaints the page in the window, and only the
// page: the reader's own palette is never changed by a preview
// (lib/premium/plusTry.ts, TRY_PALETTES, held to app/globals.css).

import { useState, type CSSProperties } from "react";

import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { TRY_PALETTE_ORDER, paletteVars, type TryPalette } from "@/lib/premium/plusTry";

import { JohnPage } from "./TryBible";
import { TrySwitch, TryWindow } from "./TryKit";

export default function TryReadingModes({ row }: TryProps) {
  const { t } = useTranslate();
  const [palette, setPalette] = useState<TryPalette>("candlelight");

  return (
    <>
      <TryWindow label={t(row.name)} style={paletteVars(palette) as CSSProperties} className="motion-safe:transition-colors motion-safe:duration-300">
        <JohnPage />
      </TryWindow>
      <TrySwitch
        label={t(row.name)}
        value={palette}
        onChange={setPalette}
        options={TRY_PALETTE_ORDER.map((p) => ({ id: p.id, label: t(p.labelKey) }))}
      />
    </>
  );
}
