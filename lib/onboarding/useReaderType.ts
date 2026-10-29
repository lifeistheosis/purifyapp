"use client";

// The reader's type (./readerType.ts) as a live React value, in step with the
// answers as useSpace keeps them.

import { useMemo } from "react";

import { readerTypeOf, type ReaderType } from "./readerType";
import { useSpace } from "./useSpace";

export function useReaderType(): ReaderType {
  const { level, background } = useSpace();
  return useMemo(() => readerTypeOf(level, background), [level, background]);
}
