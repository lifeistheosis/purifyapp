"use client";

import type { ComponentType, ReactNode } from "react";

import { PageInReadersLanguage } from "@/components/i18n/PageInReadersLanguage";
import type { Loaders } from "@/components/i18n/useInReadersLanguage";

/** The Privacy Policy's other languages, each loaded on the device (1.9): German, as the legal sheet's. */
export const PRIVACY_PAGES: Loaders<ComponentType<object>> = {
  de: () => import("./PrivacyDe").then((m) => m.PrivacyDe),
};

/** The Privacy Policy in the reader's language: the English (children, drawn on the server), or the reader's own. */
export function PrivacyInReadersLanguage({ children }: { children: ReactNode }) {
  return (
    <PageInReadersLanguage pageKey="privacy" loaders={PRIVACY_PAGES} props={{}}>
      {children}
    </PageInReadersLanguage>
  );
}
