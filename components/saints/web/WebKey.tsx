"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Graph } from "@/components/ui/icons/Graph";
import type { WebFilter } from "@/lib/saints/webLayout";

import { WebLineMark } from "./WebLineMark";
import { FILTER_LABEL, FILTER_LINE } from "./webWords";

/**
 * The web's key (1.8, round 3, r3-06, card A): the kinds a reader can pick
 * out, as one carved track in place of the loose pills of build 80, which
 * never said which line was which. Each part is a kind with the line the web
 * draws it with and how many saints it holds; All first, with the web's mark.
 * The chosen part lifts and lights; every saint and line not in it falls to a
 * fifth, as the pills did. Only the kinds this web has are offered, and none
 * when it has one kind (webFilters in lib/saints/webLayout.ts).
 */
export function WebKey({
  filters,
  filter,
  counts,
  onPick,
}: {
  filters: readonly WebFilter[];
  filter: WebFilter | "all";
  counts: Record<WebFilter | "all", number>;
  onPick: (next: WebFilter | "all") => void;
}) {
  const { t } = useTranslate();
  return (
    <div className="saint-web-key -mx-1 flex h-[50px] gap-1 rounded-[17px] p-1 md:mx-auto md:max-w-[560px]">
      {(["all", ...filters] as const).map((f) => (
        <button
          key={f}
          type="button"
          aria-pressed={filter === f}
          onClick={() => onPick(f)}
          className="saint-web-key-part tap-press flex min-w-0 flex-[1_1_auto] flex-col items-center justify-center gap-[5px] rounded-[13px] px-2"
        >
          {f === "all" ? <Graph size={14} strokeWidth={2} /> : <WebLineMark line={FILTER_LINE[f]} width={18} />}
          <span className="flex max-w-full items-baseline gap-1 font-sans text-[12.5px] font-semibold leading-none">
            <span className="saint-web-key-word truncate">{t(FILTER_LABEL[f])}</span>
            <span className="saint-web-key-count shrink-0 font-medium">{counts[f]}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
