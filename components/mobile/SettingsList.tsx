"use client";

// iOS-Settings-style row list. Quiet, scannable, single-tap targets.
// Used on the You tab as the final block beneath the dashboard pieces.

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SettingsItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  hint?: string;
  icon?: ReactNode;
  destructive?: boolean;
};

export function SettingsList({ items }: { items: SettingsItem[] }) {
  return (
    <ul className="rounded-2xl border border-paper/10 bg-paper/[0.03] overflow-hidden">
      {items.map((it, i) => (
        <li
          key={it.label}
          className={cn(i > 0 && "border-t border-paper/[0.06]")}
        >
          <SettingsRow item={it} />
        </li>
      ))}
    </ul>
  );
}

function SettingsRow({ item }: { item: SettingsItem }) {
  const inside = (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {item.icon && (
        <span
          className={cn(
            "shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md",
            item.destructive
              ? "bg-[#c1272d]/15 text-[#f8cac7]"
              : "bg-paper/[0.06] text-paper/75",
          )}
        >
          {item.icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-sans text-[14.5px] leading-tight",
            item.destructive ? "text-[#f8cac7]" : "text-paper",
          )}
        >
          {item.label}
        </p>
        {item.hint && (
          <p className="mt-0.5 font-sans text-[11.5px] text-paper/55 leading-tight">
            {item.hint}
          </p>
        )}
      </div>
      {!item.destructive && (
        <span aria-hidden className="shrink-0 text-paper/35 text-[18px]">
          ›
        </span>
      )}
    </div>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="block active:bg-paper/[0.04] transition-colors"
      >
        {inside}
      </Link>
    );
  }
  if (item.onClick) {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className="block w-full text-left active:bg-paper/[0.04] transition-colors"
      >
        {inside}
      </button>
    );
  }
  return inside;
}
