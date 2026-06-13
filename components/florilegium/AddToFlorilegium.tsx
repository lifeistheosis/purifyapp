"use client";

import { useEffect, useRef, useState } from "react";

import {
  useFlorilegia,
  type FlorilegiumItemInput,
} from "@/lib/florilegium/florilegium";

/**
 * The "gather" affordance: a small button that opens a popover to drop a
 * line (a verse or a Father's quote) into one of the reader's florilegia,
 * or into a freshly named one. Local-first, so it is instant and offline.
 *
 * Drop it anywhere a quotable line is rendered, handing it the item to
 * gather. The label defaults to a quiet "Gather"; pass `compact` for an
 * icon-only trigger inside dense rows.
 */
export function AddToFlorilegium({
  item,
  className,
}: {
  item: FlorilegiumItemInput;
  className?: string;
}) {
  const { florilegia, create, addItem } = useFlorilegia();
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [title, setTitle] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function gatherInto(florilegiumId: string, name: string) {
    addItem(florilegiumId, item);
    setDone(name);
    setOpen(false);
    setNaming(false);
    setTitle("");
    window.setTimeout(() => setDone(null), 2400);
  }

  function createAndGather(e: React.FormEvent) {
    e.preventDefault();
    const id = create(title);
    gatherInto(id, title.trim() || "Untitled gathering");
  }

  return (
    <div ref={rootRef} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="font-sans text-caption text-paper/50 hover:text-paper/85 transition-colors"
      >
        {done ? `Gathered into ${done}` : "Gather"}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-2 min-w-[240px] z-50 rounded-md border border-white/12 bg-night/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.55)] p-2"
        >
          {naming ? (
            <form onSubmit={createAndGather} className="p-1">
              <label
                htmlFor="florilegium-new"
                className="block font-sans text-caption text-paper/60 mb-2"
              >
                Name a new gathering.
              </label>
              <input
                id="florilegium-new"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="On the Cross..."
                maxLength={80}
                autoFocus
                className="w-full bg-paper/[0.05] border border-paper/20 rounded-md px-3 py-2 font-sans text-detail text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/50"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  className="font-sans text-caption font-semibold rounded-pill px-3 py-1.5 bg-gold text-night hover:bg-gold-soft transition-colors"
                >
                  Gather
                </button>
                <button
                  type="button"
                  onClick={() => setNaming(false)}
                  className="font-sans text-caption text-paper/55 hover:text-paper transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          ) : (
            <>
              {florilegia.length > 0 ? (
                <ul className="max-h-[240px] overflow-y-auto">
                  {florilegia.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => gatherInto(f.id, f.title)}
                        className="w-full text-left px-3 py-2 rounded font-sans text-detail text-paper/85 hover:bg-white/[0.05] hover:text-paper transition-colors flex items-center justify-between gap-3"
                      >
                        <span className="truncate">{f.title}</span>
                        <span className="shrink-0 text-caption text-paper/35 tabular-nums">
                          {f.items.length}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 font-sans text-caption text-paper/45">
                  No gatherings yet.
                </p>
              )}
              <div className="mt-1 border-t border-white/10 pt-1">
                <button
                  type="button"
                  onClick={() => setNaming(true)}
                  className="w-full text-left px-3 py-2 rounded font-sans text-detail font-medium text-gold/90 hover:bg-white/[0.05] hover:text-gold transition-colors"
                >
                  Begin a new gathering…
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
