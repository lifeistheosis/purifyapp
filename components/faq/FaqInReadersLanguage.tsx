"use client";

import type { ComponentType, ReactNode } from "react";

import { PageInReadersLanguage } from "@/components/i18n/PageInReadersLanguage";
import type { Loaders } from "@/components/i18n/useInReadersLanguage";

/** The FAQ's other languages, each its own file, loaded on the device (1.9): German. */
export const FAQ_PAGES: Loaders<ComponentType<object>> = {
  de: () => import("./FaqDe").then((m) => m.FaqDe),
};

/** The FAQ in the reader's language: the English (children, drawn on the server), or the reader's own. */
export function FaqInReadersLanguage({ children }: { children: ReactNode }) {
  return (
    <PageInReadersLanguage pageKey="faq" loaders={FAQ_PAGES} props={{}}>
      {children}
    </PageInReadersLanguage>
  );
}
