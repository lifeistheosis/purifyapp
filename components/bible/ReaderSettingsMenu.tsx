"use client";

import { useEffect, useRef, useState } from "react";
import { useInterlinear } from "@/lib/bible/interlinear";
import { useReaderPrefs } from "@/components/reader/ReaderPrefs";
import type { ReaderSize, ReaderFont } from "@/components/reader/ReaderPrefs";
import { cn } from "@/lib/cn";

const SIZES: { v: ReaderSize; label: string }[] = [
  { v: "sm", label: "Small" },
  { v: "md", label: "Medium" },
  { v: "lg", label: "Large" },
  { v: "xl", label: "X-Large" },
];

const FONTS: { v: ReaderFont; label: string }[] = [
  { v: "serif", label: "Serif" },
  { v: "display", label: "Display" },
  { v: "sans", label: "Sans" },
];

/**
 * Mobile-only consolidated menu: font size, font family, and
 * (when NT) interlinear toggle. Single ⚙ button collapses what
 * was three buttons on the chrome row.
 */
export function ReaderSettingsMenu({ showInterlinear }: { showInterlinear: boolean }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { size, setSize, font, setFont } = useReaderPrefs();
  const { on: interlinearOn, toggle: toggleInterlinear } = useInterlinear();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (buttonRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const tm = setTimeout(
      () => document.addEventListener("mousedown", onDoc),
      50,
    );
    return () => {
      clearTimeout(tm);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Reader settings"
        className="inline-flex items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] hover:border-paper/30 hover:bg-paper/10 px-3.5 h-[42px] font-sans text-[13px] font-medium text-paper transition-colors"
      >
        <span aria-hidden className="text-[15px] leading-none">⚙</span>
        <span>Reader</span>
        {interlinearOn && showInterlinear && (
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#d4af37]"
            title="Interlinear is on"
          />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Reader settings"
          className="absolute right-0 mt-2 w-[260px] z-50 rounded-lg border border-paper/20 bg-night-soft shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-4 space-y-4"
        >
          {/* Text size */}
          <div>
            <p className="font-sans text-[10.5px] font-semibold uppercase tracking-[1.2px] text-paper/55 mb-2">
              Text size
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s.v}
                  type="button"
                  onClick={() => setSize(s.v)}
                  className={cn(
                    "rounded-md border py-2 font-sans text-[12px] font-medium transition-colors",
                    size === s.v
                      ? "bg-paper/15 border-paper/45 text-paper"
                      : "border-paper/12 text-paper/65 hover:bg-paper/8 hover:text-paper",
                  )}
                >
                  {s.label.charAt(0)}
                </button>
              ))}
            </div>
          </div>

          {/* Font family */}
          <div>
            <p className="font-sans text-[10.5px] font-semibold uppercase tracking-[1.2px] text-paper/55 mb-2">
              Font
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {FONTS.map((f) => (
                <button
                  key={f.v}
                  type="button"
                  onClick={() => setFont(f.v)}
                  className={cn(
                    "rounded-md border py-2 font-sans text-[12px] font-medium transition-colors",
                    font === f.v
                      ? "bg-paper/15 border-paper/45 text-paper"
                      : "border-paper/12 text-paper/65 hover:bg-paper/8 hover:text-paper",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interlinear (NT only) */}
          {showInterlinear && (
            <div className="pt-3 border-t border-paper/10">
              <button
                type="button"
                onClick={toggleInterlinear}
                aria-pressed={interlinearOn}
                className={cn(
                  "w-full inline-flex items-center justify-between gap-3 rounded-pill border h-[40px] px-3.5 font-sans text-[13px] font-medium transition-colors",
                  interlinearOn
                    ? "border-[#d4af37] text-[#161219] bg-[#d4af37] hover:bg-[#c89e2c]"
                    : "border-paper/15 bg-paper/[0.04] text-paper/85 hover:bg-paper/10 hover:border-paper/30",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "inline-block w-2 h-2 rounded-full",
                      interlinearOn ? "bg-[#161219]" : "bg-paper/30",
                    )}
                  />
                  Interlinear Greek
                </span>
                <span className="font-semibold">{interlinearOn ? "On" : "Off"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
