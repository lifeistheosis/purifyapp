// The people of an event (1.7, the third of its four parts): who they were in
// it, one line each, in the order they matter to it. A saint the app has opens
// his page, with his own icon at the head of the row; anyone else is a name
// and a line, with no picture made up for them. Drawn on the server, so the
// saints' registry stays out of the page's script.

import Link from "next/link";

import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import type { EventPerson } from "@/lib/history/load";
import { getSaint } from "@/lib/saints/saints";

export function EventPeople({ people }: { people: EventPerson[] }) {
  if (!people.length) return null;
  return (
    <ul className="divide-y divide-paper/8">
      {people.map((person) => {
        const saint = person.saint ? getSaint(person.saint) : undefined;
        const body = (
          <>
            {saint?.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- the app's own icon, as it is.
              <img
                src={saint.iconUrl}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
                className="h-12 w-12 shrink-0 rounded-[10px] object-cover object-top ring-1 ring-paper/10"
              />
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-ui font-semibold leading-snug text-paper">{person.name}</span>
              <span className="mt-0.5 block font-sans text-detail leading-[1.5] text-paper/60">{person.role}</span>
            </span>
            {saint ? <ChevronRight size={15} className="shrink-0 text-paper/40 rtl:-scale-x-100" /> : null}
          </>
        );
        return (
          <li key={person.name}>
            {saint ? (
              <Link
                href={`/saints/${saint.slug}`}
                className="tap-press flex min-h-16 items-center gap-3 py-3 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
              >
                {body}
              </Link>
            ) : (
              <div className="flex min-h-16 items-center gap-3 py-3">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The people of an account written before 1.7, which names none of its own:
 * the saints the registry links, each with the first of his titles (or his
 * byname) as the line under the name.
 */
export function peopleFromSaints(slugs: string[]): EventPerson[] {
  return slugs.flatMap((slug) => {
    const saint = getSaint(slug);
    if (!saint) return [];
    const role = saint.epithet.split("·")[0]?.trim() || saint.byname || "";
    return [{ name: saint.name, saint: slug, role }];
  });
}
