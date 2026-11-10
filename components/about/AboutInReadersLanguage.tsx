"use client";

import type { ComponentType, ReactNode } from "react";

import { PageInReadersLanguage } from "@/components/i18n/PageInReadersLanguage";
import type { Loaders } from "@/components/i18n/useInReadersLanguage";

type Props = { credits: boolean };

/** About's other languages, each its own file, loaded on the device (1.9): German. */
export const ABOUT_PAGES: Loaders<ComponentType<Props>> = {
  de: () => import("./AboutDe").then((m) => m.AboutDe),
};

/** About in the reader's language: the English (children, drawn on the server), or the reader's own. */
export function AboutInReadersLanguage({ credits, children }: Props & { children: ReactNode }) {
  return (
    <PageInReadersLanguage pageKey="about" loaders={ABOUT_PAGES} props={{ credits }}>
      {children}
    </PageInReadersLanguage>
  );
}
