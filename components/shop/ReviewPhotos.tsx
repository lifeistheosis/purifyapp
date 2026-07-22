import Image from "next/image";

/**
 * Photo strip on a review row (product or store). Thumbnails open the full
 * image in a new tab. Unoptimized on purpose: review photos live in the
 * public shop-media bucket (or wherever a seed pointed) and this keeps the
 * strip host-agnostic.
 */
export function ReviewPhotos({ urls }: { urls?: string[] | null }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {urls.map((u, i) => (
        <a
          key={`${u}-${i}`}
          href={u}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block h-20 w-20 overflow-hidden rounded-lg border border-white/10 bg-night-soft/60"
        >
          <Image src={u} alt="" fill sizes="80px" unoptimized className="object-cover" />
        </a>
      ))}
    </div>
  );
}
