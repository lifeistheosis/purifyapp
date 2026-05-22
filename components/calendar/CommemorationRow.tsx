import Link from "next/link";
import type { Commemoration } from "@/lib/calendar/orthodox";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { Cross } from "@/components/ui/icons/Cross";
import { cn } from "@/lib/cn";

/**
 * One commemoration in a list: the saint's haloed icon (or a three-bar
 * Cross medallion fallback), the name in serif (linked when a profile
 * exists), and the one-line note. Feasts get a brighter gold-ring
 * medallion; ordinary saints get a quieter paper-ring one. Same glyph
 * (the three-bar Cross) so the visual idiom stays Orthodox throughout.
 */
export function CommemorationRow({ c }: { c: Commemoration }) {
  const saint = c.saint ?? null;
  const isFeast = c.kind === "feast";
  return (
    <div className="flex items-start gap-3">
      {saint ? (
        <SaintIcon saint={saint} size="sm" />
      ) : (
        <span
          aria-hidden
          className={cn(
            "shrink-0 h-9 w-9 rounded-full flex items-center justify-center border",
            isFeast
              ? "border-gold/45 text-gold bg-gold/10"
              : "border-paper/15 text-paper/55 bg-paper/[0.04]",
          )}
        >
          <Cross size={isFeast ? 17 : 15} />
        </span>
      )}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="font-serif text-[15.5px] text-paper leading-snug">
          {saint ? (
            <Link
              href={`/saints/${saint.slug}`}
              className="hover:text-gold transition-colors underline-offset-2 hover:underline"
            >
              {c.name}
            </Link>
          ) : (
            c.name
          )}
        </p>
        {c.note && (
          <p className="mt-0.5 font-sans text-[12px] text-paper/55 leading-[1.5]">
            {c.note}
          </p>
        )}
      </div>
    </div>
  );
}
