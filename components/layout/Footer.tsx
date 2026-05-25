import Link from "next/link";
import { Instagram } from "@/components/ui/icons/Instagram";

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
 { label: "Instagram", href: "https://instagram.com/purifymylife", external: true },
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
 {/* Community strip. Soft invitation: Discord for the longer
 conversations, Instagram for the day-to-day. */}
 <div className="mt-12 pt-6 border-t border-white/8 flex flex-col items-center gap-4">
 <p className="font-sans text-[12px] uppercase tracking-[1.5px] text-paper/45">
 Find us
 </p>
 <div className="flex items-center gap-3">
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 aria-label="Join the Purify Discord"
 className="inline-flex items-center gap-2 rounded-pill border border-[#5865F2]/35 bg-[#5865F2]/[0.06] px-4 py-2 font-sans text-[13px] text-[#a4adff] hover:bg-[#5865F2]/[0.12] hover:border-[#5865F2]/55 hover:text-paper transition-colors"
 >
 <span aria-hidden className="text-[14px]">#</span>
 Discord
 </a>
 <a
 href="https://instagram.com/purifymylife"
 target="_blank"
 rel="noopener noreferrer"
 aria-label="Follow Purify on Instagram (@purifymylife)"
 className="inline-flex items-center gap-2 rounded-pill border border-paper/20 bg-paper/[0.04] px-4 py-2 font-sans text-[13px] text-paper/85 hover:bg-paper/10 hover:border-paper/45 hover:text-paper transition-colors"
 >
 <Instagram size={14} />
 @purifymylife
 </a>
 </div>
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
 © {new Date().getFullYear()} · v6.2 · Public-domain texts unless otherwise noted.
 </p>
 </div>
 </div>
 </footer>
 );
}
