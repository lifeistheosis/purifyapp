"use client";

import type { ReactNode } from "react";

/** The onboarding's one white button, the way on from a screen. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="block min-h-11 w-full rounded-pill bg-paper px-6 py-3.5 text-center font-sans text-ui font-semibold text-night transition-[transform,translate,scale,background-color] hover:bg-paper/90 active:scale-[0.98] disabled:opacity-60"
    >
      {children}
    </button>
  );
}
