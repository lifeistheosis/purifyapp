import Link from "next/link";

const cols = [
  {
    heading: "Pray",
    links: [
      { label: "Bible", href: "/bible" },
      { label: "Prayer Plans", href: "/prayers" },
      { label: "Personal Plans", href: "/prayers/personal" },
      { label: "Campaigns", href: "/campaigns" },
    ],
  },
  {
    heading: "Discover",
    links: [
      { label: "Saints", href: "/saints" },
      { label: "Calendar", href: "/calendar" },
      { label: "Pricing", href: "/pricing" },
      { label: "Account", href: "/account" },
    ],
  },
  {
    heading: "Marketplace",
    links: [
      { label: "Browse", href: "/marketplace" },
      { label: "Monasteries", href: "/marketplace/monasteries" },
      { label: "Blessings", href: "/marketplace/blessings" },
      { label: "Sell", href: "/marketplace/sell" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Account", href: "/account" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-night border-t border-white/8">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8 py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          {cols.map((col) => (
            <div key={col.heading}>
              <h4 className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
                {col.heading}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="font-sans text-[15px] text-paper/85 hover:text-paper transition-colors duration-150"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 pt-8 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            className="font-sans text-[20px] font-bold tracking-[-0.01em] text-paper"
          >
            Purify
          </Link>
          <p className="font-sans text-[13px] text-paper/50">
            © {new Date().getFullYear()} Purify. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
