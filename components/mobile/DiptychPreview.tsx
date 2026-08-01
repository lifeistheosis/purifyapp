"use client";

// Small horizontal scroll of the names in the user's diptychs. Renders
// nothing when both lists are empty — quietly absent rather than
// nagging the user to add entries.

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readIntentions,
  type Intention,
} from "@/lib/prayers/storage";
import { ShelfRow } from "./ShelfRow";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function DiptychPreview() {
  const { t } = useTranslate();
  const [living, setLiving] = useState<Intention[]>([]);
  const [departed, setDeparted] = useState<Intention[]>([]);

  useEffect(() => {
    function recompute() {
      setLiving(readIntentions("living").slice(0, 5));
      setDeparted(readIntentions("departed").slice(0, 5));
    }
    recompute();
    function on() {
      recompute();
    }
    window.addEventListener("purify:intentions", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("purify:intentions", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  if (living.length === 0 && departed.length === 0) return null;

  return (
    <ShelfRow label={t("ui.todayYouCarry")}>
      {living.map((p) => (
        <Chip key={`l-${p.id}`} name={p.name} note="living" />
      ))}
      {departed.map((p) => (
        <Chip key={`d-${p.id}`} name={p.name} note="reposed" />
      ))}
      <Link
        href="/prayers/personal"
        className="tap-press inline-flex items-center justify-center h-[44px] px-3 rounded-md border border-paper/15 bg-paper/[0.03] text-paper/65 font-sans text-caption uppercase tracking-[1px]"
      >
        {t("ui.manage")}
      </Link>
    </ShelfRow>
  );
}

function Chip({ name, note }: { name: string; note: string }) {
  return (
    <div className="inline-flex flex-col justify-center h-[44px] px-3 rounded-md border border-paper/12 bg-paper/[0.03] shrink-0">
      <span className="font-sans text-detail font-semibold text-paper leading-tight max-w-[140px] truncate">
        {name}
      </span>
      <span className="font-sans text-eyebrow uppercase tracking-[1px] text-paper/45 mt-0.5">
        {note}
      </span>
    </div>
  );
}
