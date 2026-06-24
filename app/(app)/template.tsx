// Per-navigation entrance for the in-app routes (Bible, Discover, Prayers,
// You, and their pages). A `template` re-mounts on navigation (unlike a
// layout), so wrapping the page content here lets it fade in on every route
// change instead of hard-cutting into place ("teleporting").
//
// It renders INSIDE the (app) layout's <main>, so the persistent chrome — the
// bottom tab bar, the header — stays put while only the content arrives. The
// animation is opacity-only (see globals.css `.route-fade`): no transform, so
// fixed descendants (reader pills, overlays) are never displaced, and
// prefers-reduced-motion users get the instant swap.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-fade">{children}</div>;
}
