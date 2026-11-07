"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { FlorilegiumGate } from "@/components/florilegium/FlorilegiumGate";

/**
 * The Florilegium's page, or one gathering on it (1.9): in the apps a
 * gathering opens here, named in the query (?g=<id>; lib/florilegium/href.ts),
 * in the reading column its own page has on the website. Without one, the
 * page as it always was.
 */
export function FlorilegiumByQuery({ hub }: { hub: ReactNode }) {
  const id = useSearchParams().get("g");
  if (!id) return <>{hub}</>;
  return (
    <section className="relative overflow-hidden bg-night min-h-[calc(100dvh-72px)] px-5 py-12 md:px-8 md:py-16">
      <div
        aria-hidden
        className="page-halo pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 20% 10%, rgba(255,255,255,0.05) 0%, transparent 65%)",
        }}
      />
      <article className="relative mx-auto w-full max-w-[820px]">
        <FlorilegiumGate detailId={id} />
      </article>
    </section>
  );
}
