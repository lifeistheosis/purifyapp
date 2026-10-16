/**
 * A saint's life, paragraph by paragraph, as it is written: the profile's
 * own words, in Lora at the reading size. No heading of its own: on a phone
 * the switch above it says Life, and the part is labelled by it.
 */
export function LifeSection({ paragraphs }: { paragraphs: string[] }) {
  if (paragraphs.length === 0) return null;
  return (
    <div className="max-w-[680px] space-y-5">
      {paragraphs.map((p, i) => (
        <p key={i} className="font-serif text-lede leading-[1.7] text-paper/85">
          {p}
        </p>
      ))}
    </div>
  );
}
