"use client";

import Link from "next/link";
import { Instagram } from "@/components/ui/icons/Instagram";
import { Discord } from "@/components/ui/icons/Discord";
import { TikTok } from "@/components/ui/icons/TikTok";
import { Reddit } from "@/components/ui/icons/Reddit";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { shopEnabled } from "@/lib/shop/flags";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";

type LinkItem = { label: string; href: string; external?: boolean };

export function Footer() {
 const { t } = useTranslate();

 const cols: { heading: string; links: LinkItem[] }[] = [
  {
   heading: t("footer.bible"),
   links: [
    { label: t("footer.oldTestament"), href: "/bible#ot" },
    { label: t("footer.newTestament"), href: "/bible#nt" },
    { label: t("common.search"), href: "/bible" },
   ],
  },
  {
   heading: t("footer.saints"),
   links: [
    { label: t("footer.saints"), href: "/saints" },
    { label: t("footer.theFathers"), href: "/saints" },
    { label: t("saints.writings"), href: "/saints" },
   ],
  },
  {
   heading: t("footer.library"),
   links: [
    { label: t("nav.reading"), href: "/reading" },
    { label: t("nav.discover"), href: "/discover" },
    { label: t("discover.tile.councils"), href: "/councils" },
    { label: t("discover.tile.topics"), href: "/topics" },
    { label: t("discover.tile.heresies"), href: "/heresies" },
    // Marketplace entry, dark until the shop flag flips. The ownership
    // disclosure rides in the footer bottom line beside it.
    ...(shopEnabled() ? [{ label: t("nav.shop"), href: "/shop" }] : []),
   ],
  },
  {
   heading: t("footer.calendar"),
   links: [
    { label: t("nav.today"), href: "/calendar" },
    { label: t("footer.thisMonth"), href: "/calendar" },
    { label: t("calendar.pascha"), href: "/calendar" },
    { label: t("footer.theFasts"), href: "/calendar" },
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
    { label: "Purify Plus", href: "/pricing" },
    { label: t("footer.privacy"), href: "/privacy" },
    { label: t("shop.terms"), href: "/terms" },
    { label: t("footer.faq"), href: "/faq" },
    { label: t("footer.support"), href: "/support" },
    { label: t("footer.whatsNew"), href: "/whats-new" },
    { label: t("nav.account"), href: "/account" },
   ],
  },
 ];

 return (
  <footer className="bg-night border-t border-white/8">
   <div className="mx-auto max-w-[1240px] px-5 md:px-8 pt-6 pb-10 md:py-20">
    {/* Phones: the six groups as headings in two columns that open on a
        tap, so the whole footer fits one screen (the owner, 2026-09-30: "too
        cluttered", "make sure each section fits"). The same links as the
        columns below. */}
    <div className="grid grid-cols-2 items-start gap-x-5 md:hidden">
     {cols.map((col) => (
      <details key={col.heading} className="group border-b border-white/8">
       <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <h4 className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/60">
         {col.heading}
        </h4>
        <svg
         aria-hidden
         viewBox="0 0 16 16"
         className="h-3.5 w-3.5 shrink-0 text-paper/45 transition-transform duration-200 ease-house group-open:rotate-180 motion-reduce:transition-none"
        >
         <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
       </summary>
       <ul className="flex flex-col pb-2">
        {col.links.map((l) => (
         <li key={l.href + l.label}>
          <Link
           href={l.href}
           target={l.external ? "_blank" : undefined}
           rel={l.external ? "noopener noreferrer" : undefined}
           className="inline-flex min-h-11 items-center font-sans text-ui text-paper/75 hover:text-paper transition-colors duration-150"
          >
           {l.label}
          </Link>
         </li>
        ))}
       </ul>
      </details>
     ))}
    </div>
    <div className="hidden md:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10">
     {cols.map((col) => (
      <div key={col.heading}>
       <h4 className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
        {col.heading}
       </h4>
       <ul className="flex flex-col gap-3">
        {col.links.map((l) => (
         <li key={l.href + l.label}>
          <Link
           href={l.href}
           target={l.external ? "_blank" : undefined}
           rel={l.external ? "noopener noreferrer" : undefined}
           className="font-sans text-ui text-paper/75 hover:text-paper transition-colors duration-150"
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
    <div className="mt-6 md:mt-12 md:pt-6 md:border-t md:border-white/8 flex flex-col items-center gap-3 md:gap-4">
     <p className="font-sans text-caption uppercase tracking-[1.5px] text-paper/45">
      {t("footer.findUs")}
     </p>
     {/* Wraps on narrow phones: unwrapped, the four pills run 560px wide
         and force horizontal page scroll at 360px viewports. On a phone
         they are the four marks alone, in one row; each keeps its name
         for a screen reader in aria-label. */}
     <div className="flex flex-wrap items-center justify-center gap-3 px-4 [&>a]:max-md:h-11 [&>a]:max-md:w-11 [&>a]:max-md:justify-center [&>a]:max-md:px-0 [&>a]:max-md:py-0 [&>a>span]:max-md:hidden">
      <a
       href="https://discord.gg/VzBYYUsNJ6"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Discord"
       className="inline-flex items-center gap-2 rounded-pill border border-[#5865F2]/35 bg-[#5865F2]/[0.06] px-4 py-2 font-sans text-detail text-link hover:bg-[#5865F2]/[0.12] hover:border-[#5865F2]/55 hover:text-paper transition-colors"
      >
       <Discord size={14} />
       <span>{t("footer.discord")}</span>
      </a>
      <a
       href="https://instagram.com/purifymylife"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Instagram"
       className="inline-flex items-center gap-2 rounded-pill border border-[#E1306C]/40 bg-[#E1306C]/[0.07] px-4 py-2 font-sans text-detail text-social-ig hover:bg-[#E1306C]/[0.13] hover:border-[#E1306C]/65 hover:text-paper transition-colors"
      >
       <Instagram size={14} />
       <span>@purifymylife</span>
      </a>
      <a
       href="https://www.tiktok.com/@purify.app"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="TikTok"
       className="inline-flex items-center gap-2 rounded-pill border border-paper/30 bg-paper/[0.06] px-4 py-2 font-sans text-detail text-paper/85 hover:bg-paper/[0.12] hover:border-paper/50 hover:text-paper transition-colors"
      >
       <TikTok size={14} />
       <span>@purify.app</span>
      </a>
      <a
       href="https://www.reddit.com/user/purifymylife"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Reddit"
       className="inline-flex items-center gap-2 rounded-pill border border-[#FF4500]/40 bg-[#FF4500]/[0.07] px-4 py-2 font-sans text-detail text-social-reddit hover:bg-[#FF4500]/[0.13] hover:border-[#FF4500]/65 hover:text-paper transition-colors"
      >
       <Reddit size={14} />
       <span>@purifymylife</span>
      </a>
     </div>
     {/* Locale switcher, sits below the community strip so it's
         findable but doesn't compete for attention. */}
     <div className="md:mt-2">
      <LocaleSwitcher />
     </div>
    </div>
    <div className="mt-6 pt-5 md:mt-8 md:pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-4">
     {/* The header already carries the name on a phone. */}
     <Link
      href="/"
      className="font-sans text-lede font-bold tracking-[-0.01em] text-paper sm:flex-1 max-md:hidden"
     >
      Purify
     </Link>
     <p className="font-serif italic text-ui text-paper/65 text-center">
      {t("footer.glory")}
     </p>
     <p className="font-sans text-caption text-paper/45 text-center sm:flex-1 sm:text-right">
      © {new Date().getFullYear()} · {CURRENT_VERSION} · {t("footer.copyright")}
     </p>
    </div>
   </div>
  </footer>
 );
}
