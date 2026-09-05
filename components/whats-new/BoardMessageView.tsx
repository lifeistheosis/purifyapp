import type { BoardMessage } from "@/lib/whatsNew/board";

/**
 * The board message's markup, as a pure function of the message.
 *
 * Split out of BoardMessage so the admin editor's preview renders exactly
 * what a reader gets. No data reads, no hooks.
 */
export function BoardMessageView({ message }: { message: BoardMessage }) {
  const date = new Date(`${message.date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <section className="mb-12 md:mb-16" aria-labelledby="board-headline">
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-gold/85">
          {message.eyebrow}
        </p>
        <p className="font-sans text-caption uppercase tracking-[1.2px] text-paper/45">
          {date}
        </p>
      </div>
      <h2
        id="board-headline"
        className="mt-3 font-display-serif text-title md:text-heading text-paper leading-[1.1]"
      >
        {message.headline}
      </h2>
      {message.body.map((para, i) => (
        <p
          key={i}
          className="mt-5 font-serif text-lede text-paper/85 leading-[1.7]"
        >
          {para}
        </p>
      ))}
      <div aria-hidden className="mt-10 h-px w-full bg-gold/20" />
    </section>
  );
}
