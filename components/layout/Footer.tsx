import Link from "next/link";

type LinkItem = { label: string; href: string; external?: boolean };

const cols: { heading: string; links: LinkItem[] }[] = [
 {
 heading: "The Bible",
 links: [
 { label: "Old Testament", href: "/bible#ot" },
 { label: "New Testament", href: "/bible#nt" },
 { label: "The Psalter", href: "/bible/psalms/1" },
 { label: "Search Scripture", href: "/bible" },
 ],
 },
 {
 heading: "The Saints",
 links: [
 { label: "All saints", href: "/saints" },
 { label: "The Fathers", href: "/saints" },
 { label: "Their works", href: "/saints" },
 { label: "Patristic commentary", href: "/bible/john/1" },
 ],
 },
 {
 heading: "The Calendar",
 links: [
 { label: "Today", href: "/calendar" },
 { label: "This month", href: "/calendar" },
 { label: "Pascha", href: "/calendar" },
 { label: "The fasts", href: "/calendar" },
 ],
 },
 {
 heading: "The Prayer",
 links: [
 { label: "Today's prayer", href: "/prayers/today" },
 { label: "Morning rule", href: "/prayers/morning" },
 { label: "Evening rule", href: "/prayers/evening" },
 { label: "The Jesus Prayer", href: "/prayers/jesus-prayer" },
 { label: "Learn to pray", href: "/prayers/learning" },
 ],
 },
 {
 heading: "About this work",
 links: [
 { label: "About", href: "/about" },
 { label: "Privacy", href: "/privacy" },
 { label: "FAQ", href: "/faq" },
 { label: "Support the work", href: "/support" },
 { label: "What's new", href: "/whats-new" },
 { label: "Your saved", href: "/saved" },
 { label: "Your account", href: "/account" },
 { label: "Discord", href: "https://discord.gg/VzBYYUsNJ6", external: true },
 { label: "Write to us", href: "mailto:team@purify.app" },
 ],
 },
];

export function Footer() {
 return (
 <footer className="bg-night border-t border-white/8">
 <div className="mx-auto max-w-[1240px] px-5 md:px-8 py-16 md:py-20">
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
 {cols.map((col) => (
 <div key={col.heading}>
 <h4 className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
 {col.heading}
 </h4>
 <ul className="flex flex-col gap-3">
 {col.links.map((l) => (
 <li key={l.href + l.label}>
 <Link
 href={l.href}
 target={l.external ? "_blank" : undefined}
 rel={l.external ? "noopener noreferrer" : undefined}
 className="font-sans text-[14px] text-paper/75 hover:text-paper transition-colors duration-150"
 >
 {l.label}
 {l.external && (
 <span aria-hidden className="ml-1 text-paper/40">
 ↗
 </span>
 )}
 </Link>
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 {/* Community strip, soft invitation to the Discord. */}
 <div className="mt-12 pt-6 border-t border-white/8 text-center">
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="font-sans text-[13px] text-[#a4adff] hover:text-paper transition-colors"
 >
 Join the Discord, talk through prayer, akathists, and the road ahead →
 </a>
 </div>
 <div className="mt-8 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
 <Link
 href="/"
 className="font-sans text-[20px] font-bold tracking-[-0.01em] text-paper"
 >
 Purify
 </Link>
 <p className="font-serif italic text-[14px] text-paper/65 text-center">
 Glory to God for all things.
 </p>
 <p className="font-sans text-[12px] text-paper/45 text-center sm:text-right">
 © {new Date().getFullYear()} · v5.8 · Public-domain texts unless otherwise noted.
 </p>
 </div>
 </div>
 </footer>
 );
}
