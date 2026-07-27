import { currentBoardMessage } from "@/lib/whatsNew/board";

/**
 * The weekly board message at the top of /whats-new.
 *
 * Renders nothing when no message has been written, so a missed week degrades
 * to the evergreen welcome around it rather than to an empty heading or a
 * stale one. That is the failure mode this replaced: the old hand-written
 * block sat on Beta 1.7 for eight releases because nothing made it obvious it
 * had gone out of date.
 *
 * Deliberately not translated. Every other locale falls back to English here,
 * the same way the long-prose sections of this page already do, because a
 * weekly note written on Sunday cannot wait on translation and a stale
 * translation would be worse than an honest English one. `TranslationDisclaimer`
 * at the top of the page already says so.
 */
export function BoardMessage() {
  const message = currentBoardMessage();
  if (!message) return null;

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
