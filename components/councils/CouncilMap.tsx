import Link from "next/link";

import { T } from "@/components/i18n/T";
import { councilMap } from "@/lib/councils/map";

/**
 * Where the councils met (1.8): the Mediterranean's coastline, a mark for
 * each city, and under it the cities with their councils, each opening its
 * page. A city with one council links from its mark; the list is the way in
 * for all, so a mark never stands for a council a reader cannot see named.
 * Drawn in the page's own colours, no tiles and no map service.
 */
export function CouncilMap() {
  const { view, land, places } = councilMap();
  const [w, h] = view;
  return (
    <section aria-labelledby="council-map-title" className="mt-14">
      <h2 id="council-map-title" className="font-serif text-title-sm text-paper">
        <T k="councils.map.title" />
      </h2>
      <p className="mt-2 max-w-[720px] font-sans text-detail text-paper/55 leading-[1.6]">
        <T k="councils.map.intro" />
      </p>
      <div className="mt-5 overflow-hidden rounded-md border border-paper/12 bg-paper/[0.02]">
        <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby="council-map-title" className="block h-auto w-full">
          <path d={land} className="fill-paper/[0.08] stroke-paper/20" strokeWidth={0.6} />
          {places.map((p) => {
            const mark = (
              <g>
                <circle cx={p.x} cy={p.y} r={p.councils.length > 1 ? 7 : 5.5} className="fill-paper" />
                <text
                  x={p.side === "left" ? p.x - 10 : p.side === "right" ? p.x + 10 : p.x}
                  y={p.side === "up" ? p.y - 12 : p.side === "down" ? p.y + 24 : p.y + 5}
                  textAnchor={p.side === "left" ? "end" : p.side === "right" ? "start" : "middle"}
                  className="fill-paper/80 font-sans"
                  fontSize={15}
                >
                  {p.place}
                </text>
              </g>
            );
            return p.councils.length === 1 ? (
              <a key={p.id} href={`/councils/${p.councils[0].slug}`} aria-label={`${p.councils[0].byname}, ${p.councils[0].year}`}>
                {mark}
              </a>
            ) : (
              <a key={p.id} href={`#place-${p.id}`} aria-label={p.place}>
                {mark}
              </a>
            );
          })}
        </svg>
      </div>
      <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {places.map((p) => (
          <li key={p.id} id={`place-${p.id}`} className="scroll-mt-24">
            <p className="font-sans text-caption font-semibold text-paper/70">{p.place}</p>
            <ul className="mt-1 space-y-0.5">
              {p.councils.map((c) => (
                <li key={c.slug}>
                  <Link href={`/councils/${c.slug}`} className="font-serif text-ui text-paper/85 underline-offset-4 hover:underline">
                    {c.byname}
                  </Link>{" "}
                  <span className="font-sans text-caption text-paper/50">{c.year}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
