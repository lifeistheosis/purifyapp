"use client";

import type { ComponentType, ReactNode } from "react";

import { PageInReadersLanguage } from "@/components/i18n/PageInReadersLanguage";
import type { Loaders } from "@/components/i18n/useInReadersLanguage";

import type { SupportData } from "./SupportBody";

type Props = { native: boolean; data: SupportData | null };

/** Support's other languages, drawn on the device (1.9): German, from the same file as the English, loaded only for a German reader. */
export const SUPPORT_PAGES: Loaders<ComponentType<Props>> = {
  de: () =>
    import("./SupportBody").then((m) => {
      const Body = m.SupportBody;
      return function SupportDe(props: Props) {
        return <Body {...props} isDe />;
      };
    }),
};

/** Support in the reader's language: the English (children, drawn on the server), or the reader's own. */
export function SupportInReadersLanguage({ native, data, children }: Props & { children: ReactNode }) {
  return (
    <PageInReadersLanguage pageKey="support" loaders={SUPPORT_PAGES} props={{ native, data }}>
      {children}
    </PageInReadersLanguage>
  );
}
