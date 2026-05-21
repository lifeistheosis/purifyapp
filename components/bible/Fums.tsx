"use client";

import Script from "next/script";

/**
 * Fair Use Management System (FUMS) tracker. API.Bible returns a `fumsId` with
 * every licensed passage; loading the FUMS script with that id reports the
 * usage back to ABS/the publisher, which the license requires ("permit
 * accurate user statistics reporting"). Render one per licensed passage view.
 */
export function Fums({ fumsId }: { fumsId: string | null }) {
  if (!fumsId) return null;
  return (
    <Script
      id={`fums-${fumsId}`}
      strategy="afterInteractive"
      src={`https://d3a5kmrf6jne8b.cloudfront.net/fums.js?t=${encodeURIComponent(fumsId)}`}
    />
  );
}
