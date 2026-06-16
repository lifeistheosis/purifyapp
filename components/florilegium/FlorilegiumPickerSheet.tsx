"use client";

import { useEffect, useState } from "react";

import { setOverlayOpen } from "@/lib/ui/overlay";
import {
  useFlorilegia,
  type FlorilegiumItemInput,
} from "@/lib/florilegium/florilegium";

/**
 * Controlled centered sheet for gathering a line into a florilegium.
 * Used where an inline popover doesn't fit, e.g. driven from the Bible
 * verse context menu and mobile toolbar. Visual register matches
 * ConfirmDialog (night surface, gold hairline, backdrop/Escape dismiss,
 * two-phase mount for fade-out).
 *
 * The inline popover variant (AddToFlorilegium) is the right tool inside
 * a quote card; this sheet is the right tool when the trigger lives in a
 * menu that has already closed.
 */
export function FlorilegiumPickerSheet({
  open,
  item,
  onClose,
}: {
  open: boolean;
  /** The line to gather. Null is allowed so callers can keep the sheet
   * mounted and set the item at open time. */
  item: FlorilegiumItemInput | null;
  onClose: () => void;
}) {
  const { florilegia, create, addItem } = useFlorilegia();
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [naming, setNaming] = useState(false);
  const [title, setTitle] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setMounted(true);
      setOverlayOpen(true);
      const r = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(r);
    } else if (mounted) {
      setShown(false);
      setOverlayOpen(false);
      const t = setTimeout(() => {
        setMounted(false);
        setNaming(false);
        setTitle("");
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!shown) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, onClose]);

  if (!mounted) return null;

  function gatherInto(florilegiumId: string) {
    if (item) addItem(florilegiumId, item);
    onClose();
  }

  function createAndGather(e: React.FormEvent) {
    e.preventDefault();
    const id = create(title);
    if (item) addItem(id, item);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add to a florilegium"
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
    >
      <div
        aria-hidden
        onClick={onClose}
        className={
          "absolute inset-0 bg-night/72 backdrop-blur-sm transition-opacity duration-200 " +
          (shown ? "opacity-100" : "opacity-0")
        }
      />
      <div
        className={
          "relative w-full max-w-[420px] rounded-lg border border-paper/15 bg-night-soft/95 shadow-2xl transition-all duration-200 " +
          (shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")
        }
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(29,29,32,0.65) 0%, rgba(16,16,19,0.95) 100%)",
        }}
      >
        <div className="p-6">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold/85 mb-3">
            Gather into a florilegium
          </p>

          {item ? (
            <blockquote className="mb-5 border-l border-gold/40 pl-4 font-serif italic text-detail text-paper/75 leading-[1.6] line-clamp-3">
              {item.text}
            </blockquote>
          ) : null}

          {naming ? (
            <form onSubmit={createAndGather}>
              <label
                htmlFor="picker-new-name"
                className="block font-sans text-caption text-paper/60 mb-2"
              >
                Name a new gathering.
              </label>
              <input
                id="picker-new-name"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="On the Cross..."
                maxLength={80}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                className="w-full bg-paper/[0.05] border border-paper/20 rounded-md px-3 py-2 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/50"
              />
              <div className="mt-4 flex gap-3">
                <button
                  type="submit"
                  className="font-sans text-detail font-semibold rounded-pill px-5 py-2 bg-gold text-night hover:bg-gold-soft transition-colors"
                >
                  Gather
                </button>
                <button
                  type="button"
                  onClick={() => setNaming(false)}
                  className="font-sans text-detail text-paper/60 hover:text-paper transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          ) : (
            <>
              {florilegia.length > 0 ? (
                <ul className="max-h-[280px] overflow-y-auto -mx-1">
                  {florilegia.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => gatherInto(f.id)}
                        className="w-full text-left px-3 py-2.5 rounded font-sans text-ui text-paper/85 hover:bg-white/[0.05] hover:text-paper transition-colors flex items-center justify-between gap-3"
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
                <p className="px-1 py-2 font-sans text-detail text-paper/45">
                  You have no gatherings yet.
                </p>
              )}
              <div className="mt-2 border-t border-white/10 pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setNaming(true)}
                  className="font-sans text-detail font-medium text-gold/90 hover:text-gold transition-colors"
                >
                  Begin a new gathering…
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="font-sans text-detail text-paper/55 hover:text-paper transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
