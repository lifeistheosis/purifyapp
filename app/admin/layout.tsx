import "./admin-theme.css";

// Owns two things for every page under /admin: the Ledger stylesheet, and the
// data-surface attribute the stylesheet keys its tokens on.
//
// The stylesheet import lives here rather than in app/admin/page.tsx so that
// the theme covers /admin/shop, /admin/styleguide and the previews too. The
// auth gate in page.tsx is untouched.
//
// There used to be a pre-paint script here choosing between a dark and a
// light palette from localStorage and the OS. The admin is light only now,
// so there is nothing to choose before first paint, no attribute on <html>,
// and this layout no longer needs headers() for a script nonce. It stays
// dynamic because every page under it is: the panel is force-dynamic and
// scripts/native-build.mjs stashes the whole tree out of the native export.
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-surface="admin" is the token root: app/admin/admin-theme.css
    // defines every --adm-* token on it. The Modal and the mobile sheet
    // portal to document.body, outside this div, and carry .adm themselves
    // so the same block reaches them.
    <div data-surface="admin" className="adm min-h-[100dvh]">
      {children}
    </div>
  );
}
