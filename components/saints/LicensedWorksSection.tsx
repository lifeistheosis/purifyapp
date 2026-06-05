import Link from "next/link";
import type { LicensedWork } from "@/lib/saints/licensedWorks";
import { buildAmazonUrl, getAmazonCoverUrl } from "@/lib/affiliate/amazon";
import { LicensedWorkCover } from "./LicensedWorkCover";

const ROLE_LABEL: Record<NonNullable<LicensedWork["authorRole"]>, string> = {
  by: "By",
  about: "About",
  edited: "Edited by",
  translated: "Translated by",
};

export function LicensedWorksSection({ works }: { works: LicensedWork[] }) {
  if (works.length === 0) return null;

  return (
    <section className="py-14 border-t border-paper/8">
      <div className="mb-6">
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
          Licensed Works
        </p>
        <h2 className="font-sans text-title md:text-display-sm font-bold text-paper tracking-[-0.02em]">
          Books in print
        </h2>
        <p className="mt-4 max-w-[720px] font-serif italic text-ui text-paper/55 leading-relaxed">
          These works are licensed and copyrighted by their publishers and
          cannot be hosted on Purify. As an Amazon Associate, Purify earns
          from qualifying purchases.
        </p>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {works.map((w) => (
          <LicensedWorkCard key={w.slug} work={w} />
        ))}
      </ul>
    </section>
  );
}

function LicensedWorkCard({ work }: { work: LicensedWork }) {
  const amazonHref = buildAmazonUrl(work.amazonAsin);
  const cover = work.coverImageUrl ?? getAmazonCoverUrl(work.amazonAsin);
  const roleLabel = work.authorRole ? ROLE_LABEL[work.authorRole] : "By";

  return (
    <li className="rounded-lg border border-paper/10 bg-night/40 p-5 flex flex-col gap-4 hover:border-gold/40 transition-colors duration-200">
      <div className="flex gap-4">
        <a
          href={amazonHref}
          target="_blank"
          rel="noopener nofollow sponsored"
          aria-label={`Buy ${work.title} on Amazon`}
          className="block group shrink-0"
        >
          <div className="aspect-[2/3] w-20 sm:w-24 overflow-hidden rounded-md bg-night border border-paper/8 flex items-center justify-center">
            {/* Amazon product covers aren't whitelisted for next/image; the
                client cover handles Amazon's 1×1 "no image" placeholder by
                falling back to a typographic tile. */}
            <LicensedWorkCover
              src={cover}
              title={work.title}
              author={work.author}
            />
          </div>
        </a>

        <div className="flex flex-col gap-1.5 min-w-0">
          <h3 className="font-serif text-lede text-paper leading-tight">
            {work.title}
          </h3>
          {work.subtitle ? (
            <p className="font-sans text-detail text-paper/60 italic">
              {work.subtitle}
            </p>
          ) : null}
          <p className="font-sans text-detail text-paper/70">
            {roleLabel} {work.author}
          </p>
          <p className="font-sans text-caption uppercase tracking-[1.2px] text-paper/45">
            {work.publisher}
            {work.year ? ` · ${work.year}` : ""}
          </p>
        </div>
      </div>

      <p className="font-serif text-ui text-paper/80 leading-relaxed">
        {work.blurb}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
        <a
          href={amazonHref}
          target="_blank"
          rel="noopener nofollow sponsored"
          className="font-sans text-ui font-medium text-gold/85 hover:text-gold transition-colors"
        >
          Buy on Amazon →
        </a>
        {work.directPublisherUrl ? (
          <Link
            href={work.directPublisherUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-detail text-paper/55 hover:text-paper transition-colors"
          >
            Buy direct from {work.publisher}
          </Link>
        ) : null}
      </div>
    </li>
  );
}
