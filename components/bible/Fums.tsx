"use client";

import Script from "next/script";

/**
 * Fair Use Management System (FUMS) tracker. API.Bible returns a `fumsToken`
 * with every licensed passage (fums-version=3); loading the FUMS reporter with
 * that token reports usage back to ABS/the publisher, which the license
 * requires ("permit accurate user statistics reporting"). One per licensed
 * passage view.
 */
export function Fums({ fumsToken }: { fumsToken: string | null }) {
  if (!fumsToken) return null;
  return (
    <Script
      id="fums"
      strategy="afterInteractive"
      src={`https://fums.api.bible/f3.js?t=${encodeURIComponent(fumsToken)}`}
    />
  );
}
