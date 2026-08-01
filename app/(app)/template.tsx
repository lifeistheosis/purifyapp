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
//
// This is the ENTRANCE only. React does not keep the outgoing tree mounted
// across a navigation, so the matching fade-out cannot live here; it is a body
// flag the tab bar raises on tap, fading the <main> above this wrapper. See
// lib/ui/routeTransition.ts and the `.route-exit` block in globals.css.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-fade">{children}</div>;
}
