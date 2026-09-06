import "../admin/admin-theme.css";

// One theme layer, not two. Until v4 this route also imported
// ./owner-theme.css, which re-bound the accent, the grounds, the inks and
// the series to a cool set. That file is gone: its palette IS the admin
// palette now, and its keyframes moved into admin-theme.css.
//
// The pre-paint theme script that used to be duplicated here is gone with
// the dark palette: the admin is light only and there is nothing to pick
// before first paint. The route is a redirect into the admin shell, so all
// this layout has to do is carry the stylesheet and the token root.
//
// force-dynamic because the page under it is. No IS_STATIC_EXPORT guard
// needed: scripts/native-build.mjs stashes app/owner out of the native
// export, so this file only exists in a web build.
export const dynamic = "force-dynamic";

export default function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div data-surface="admin" className="adm min-h-[100dvh]">
      {children}
    </div>
  );
}
