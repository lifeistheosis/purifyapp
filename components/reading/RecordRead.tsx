"use client";

import { useEffect } from "react";
import { recordRead, type ReadEntry } from "@/lib/reading/history";

/**
 * Invisible logger. Mount it inside a reader page with the already-loaded
 * metadata; it records one reading-history visit on mount (deduped by href).
 * Renders nothing.
 */
export function RecordRead(props: Omit<ReadEntry, "at">) {
 const { kind, href, label, saintSlug, topics } = props;
 useEffect(() => {
 recordRead({ kind, href, label, saintSlug, topics });
 // Re-run only if the identity of the read changes.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [href]);
 return null;
}
