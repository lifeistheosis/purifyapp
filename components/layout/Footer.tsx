"use client";

import Link from "next/link";
import { Instagram } from "@/components/ui/icons/Instagram";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";

type LinkItem = { label: string; href: string; external?: boolean };

export function Footer() {
 const { t } = useTranslate();

 const cols: { heading: string; links: LinkItem[] }[] = [
  {
   heading: t("footer.bible"),
   links: [
    { label: "Old Testament", href: "/bible#ot" },
    { label: "New Testament", href: "/bible#nt" },
    { label: t("discover.tile.psalter"), href: "/bible/psalms/1" },
    { label: t("common.search"), href: "/bible" },
   ],
  },
  {
   heading: t("footer.saints"),
   links: [
    { label: t("saints.h1"), href: "/saints" },
    { label: "The Fathers", href: "/saints" },
    { label: t("saints.writings"), href: "/saints" },
    { label: t("discover.tile.patristic"), href: "/bible/john/1" },
   ],
  },
  {
   heading: t("footer.calendar"),
   links: [
    { label: t("nav.today"), href: "/calendar" },
    { label: "This month", href: "/calendar" },
    { label: t("calendar.pascha"), href: "/calendar" },
    { label: "The fasts", href: "/calendar" },
   ],
  },
  {
   heading: t("footer.prayer"),
   links: [
    { label: t("prayers.openTodaysPrayer").replace(" →", ""), href: "/prayers/today" },
    { label: t("prayers.morningRule"), href: "/prayers/morning" },
    { label: t("prayers.eveningRule"), href: "/prayers/evening" },
    { label: t("prayers.jesusPrayer"), href: "/prayers/jesus-prayer" },
    { label: t("prayers.learnToPray"), href: "/prayers/learning" },
   ],
  },
  {
   heading: t("footer.about"),
   links: [
    { label: t("nav.about"), href: "/about" },
    { label: t("footer.privacy"), href: "/privacy" },
    { label: t("footer.faq"), href: "/faq" },
    { label: t("footer.support"), href: "/support" },
    { label: t("footer.whatsNew"), href: "/whats-new" },
    { label: t("nav.account"), href: "/account" },
    { label: t("footer.discord"), href: "https://discord.gg/VzBYYUsNJ6", external: true },
    { label: t("footer.instagram"), href: "https://instagram.com/purifymylife", external: true },
   ],
  },
 ];

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
            <span aria-hidden className="ms-1 text-paper/40">
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
    {/* Community strip. */}
    <div className="mt-12 pt-6 border-t border-white/8 flex flex-col items-center gap-4">
     <p className="font-sans text-[12px] uppercase tracking-[1.5px] text-paper/45">
      {t("footer.findUs")}
     </p>
     <div className="flex items-center gap-3">
      <a
       href="https://discord.gg/VzBYYUsNJ6"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Discord"
       className="inline-flex items-center gap-2 rounded-pill border border-[#5865F2]/35 bg-[#5865F2]/[0.06] px-4 py-2 font-sans text-[13px] text-[#a4adff] hover:bg-[#5865F2]/[0.12] hover:border-[#5865F2]/55 hover:text-paper transition-colors"
      >
       <span aria-hidden className="text-[14px]">#</span>
       {t("footer.discord")}
      </a>
      <a
       href="https://instagram.com/purifymylife"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Instagram"
       className="inline-flex items-center gap-2 rounded-pill border border-paper/20 bg-paper/[0.04] px-4 py-2 font-sans text-[13px] text-paper/85 hover:bg-paper/10 hover:border-paper/45 hover:text-paper transition-colors"
      >
       <Instagram size={14} />
       @purifymylife
      </a>
     </div>
     {/* Locale switcher, sits below the community strip so it's
         findable but doesn't compete for attention. */}
     <div className="mt-2">
      <LocaleSwitcher />
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
      {t("footer.glory")}
     </p>
     <p className="font-sans text-[12px] text-paper/45 text-center sm:text-right">
      © {new Date().getFullYear()} · v6.4.2 · {t("footer.copyright")}
     </p>
    </div>
   </div>
  </footer>
 );
}
