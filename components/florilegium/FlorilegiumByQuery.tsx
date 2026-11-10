"use client";

import { useSearchParams } from "next/navigation";

import { FlorilegiumGate } from "@/components/florilegium/FlorilegiumGate";

/**
 * A gathering in the apps (1.9): the one named in the query of the page the
 * bundle carries for all of them (?g=<id>; lib/florilegium/href.ts). With
 * none named, or one this device does not keep, the gathering's own gentle
 * word that it is not here, with the way back
 * (components/florilegium/FlorilegiumDetail.tsx).
 */
export function FlorilegiumByQuery() {
  const id = useSearchParams().get("g") ?? "";
  return <FlorilegiumGate detailId={id} />;
}
