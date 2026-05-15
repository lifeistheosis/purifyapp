import Link from "next/link";
import { Button } from "@/components/ui/Button";

const navItems = [
  { label: "Bible", href: "/bible" },
  { label: "Prayers", href: "/prayers" },
  { label: "Saints", href: "/saints" },
  { label: "Calendar", href: "/calendar" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Pricing", href: "/pricing" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-night/85 backdrop-blur border-b border-white/8 h-[72px]">
      <div className="mx-auto max-w-[1240px] h-full flex items-center justify-between px-5 md:px-8">
        <Link
          href="/"
          className="font-sans text-[22px] font-bold tracking-[-0.01em] text-paper hover:text-paper/80 transition-colors duration-150"
        >
          Purify
        </Link>
        <nav className="hidden md:flex items-center gap-9">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="font-sans text-[15px] font-medium text-paper/85 hover:text-paper transition-colors duration-150"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Button variant="inverse" className="hidden sm:inline-flex !py-2.5 !px-5 text-[14px]">
          Try Free
        </Button>
      </div>
    </header>
  );
}
