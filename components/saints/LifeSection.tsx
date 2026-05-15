export function LifeSection({ paragraphs }: { paragraphs: string[] }) {
  return (
    <section className="py-14 border-b border-paper/8">
      <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
        His Life
      </p>
      <div className="max-w-[680px] space-y-5">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="font-serif text-[19px] text-paper/85 leading-[1.7]"
          >
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
