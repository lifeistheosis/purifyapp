import { EikonBoxClient } from "@/components/eikonBox/EikonBoxClient";

export const metadata = { title: "EIKON Box" };

/**
 * Server shell only.
 *
 * This page SHIPS INTO THE ANDROID BUNDLE (only app/api, app/admin and the
 * few trees listed in scripts/android-build.mjs are stashed out), so it must
 * not read auth or data on the server: no force-dynamic, no cookies(), no
 * getUser(). The client child fetches at runtime through apiFetch.
 *
 * It is also a plain static route with no dynamic segment, deliberately. A
 * route the export cannot resolve drops the reader on Today in the Capacitor
 * shell, which is the same failure that produced the theme-chip bug.
 */
export default function EikonBoxPage() {
  return <EikonBoxClient />;
}
