"use client";

/**
 * Two small text buttons that expand or collapse every <details> inside
 * the data-changelog section (both date groups and release entries).
 */
export function ChangelogControls() {
  function setAll(open: boolean) {
    const root = document.querySelector("[data-changelog]");
    if (!root) return;
    root.querySelectorAll("details").forEach((d) => {
      if (open) d.setAttribute("open", "");
      else d.removeAttribute("open");
    });
  }

  return (
    <div className="flex items-center gap-3 font-sans text-[12px] text-paper/55">
      <button
        type="button"
        onClick={() => setAll(true)}
        className="hover:text-paper transition-colors"
      >
        Expand all
      </button>
      <span className="text-paper/25">·</span>
      <button
        type="button"
        onClick={() => setAll(false)}
        className="hover:text-paper transition-colors"
      >
        Collapse all
      </button>
    </div>
  );
}
