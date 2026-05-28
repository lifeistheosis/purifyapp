import type { Saint } from "@/lib/saints/saints";
import { SaintIcon } from "./SaintIcon";
import { BumpButton } from "./BumpButton";

type Props = {
  saint: Saint;
  bump: { bumped: boolean; total: number; signedIn: boolean };
};

export function SaintHero({ saint, bump }: Props) {
  const facts: { label: string; value: string }[] = [];
  if (saint.born) facts.push({ label: "Born", value: saint.born });
  if (saint.reposed) facts.push({ label: "Reposed", value: saint.reposed });
  if (saint.see) facts.push({ label: "See", value: saint.see });
  facts.push({ label: "Feast", value: saint.feastDays.join(" · ") });

  return (
    <header className="pt-12 md:pt-16 pb-10 border-b border-paper/8">
      <p
        className={
          "font-sans text-[13px] font-semibold uppercase tracking-[1.5px] mb-6 " +
          (saint.featured ? "text-gold" : "text-paper/55")
        }
      >
        {saint.featured ? "The Mother of God" : "Saints"}
      </p>
      <div className="flex flex-col md:flex-row md:items-start gap-8">
        <SaintIcon
          saint={saint}
          size="lg"
          priority
          className={saint.featured ? "ring-2 ring-gold/50 shadow-[0_0_40px_rgba(212,175,55,0.18)]" : undefined}
        />
        <div className="min-w-0 flex-1">
          {saint.byname && (
            <p className="font-serif text-[16px] md:text-[18px] italic text-gold/90 mb-3 tracking-wide">
              &ldquo;{saint.byname}&rdquo;
            </p>
          )}
          <h1 className="font-sans text-[40px] md:text-[56px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
            {saint.name}
          </h1>
          <p className="mt-3 font-serif text-[20px] md:text-[24px] text-paper/75 italic">
            {saint.epithet}
          </p>
          <p className="mt-6 max-w-[640px] font-sans text-[17px] text-paper/80 leading-relaxed">
            {saint.shortBio}
          </p>
          <div className="mt-6">
            <BumpButton
              slug={saint.slug}
              saintName={saint.name}
              initialBumped={bump.bumped}
              initialTotal={bump.total}
              signedIn={bump.signedIn}
              complete={saint.complete}
            />
          </div>
        </div>
      </div>
      <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="font-sans text-[12px] font-semibold uppercase tracking-[1.2px] text-paper/45">
              {f.label}
            </dt>
            <dd className="mt-1 font-sans text-[15px] text-paper">{f.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
