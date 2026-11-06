"use client";

import type { ReviewPayload } from "@/app/api/admin/review/route";
import { useAdminFetch } from "../adminFetch";
import { Skeleton } from "../primitives";

/**
 * The clergy review list, under its one line on the Content desk (1.9;
 * #tab=review opens it). Ours only: readers never see a review mark
 * (editorial standards 27). Each marked text by area, with since when and
 * what it rests on, and the file to open in git when a reviewer has read it.
 */

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;
const line = { borderColor: "var(--adm-line)" } as const;

export function ReviewDetail() {
  const { data, error } = useAdminFetch<ReviewPayload>("/api/admin/review");
  if (error) return <p className="font-sans text-[12.5px]" style={ink2}>{error}</p>;
  if (!data) return <Skeleton h={160} />;
  if (data.total === 0) return <p className="font-sans text-[12.5px]" style={ink2}>Nothing waits for review.</p>;
  return (
    <div className="space-y-5">
      <p className="max-w-[72ch] font-sans text-[12.5px] leading-[1.55]" style={ink2}>
        Texts the editorials wrote, waiting for a priest to read them. Readers never see this. When a reviewer has read
        one, its file in git records it (the review status, who, when).
      </p>
      {data.areas.map(({ area, count }) => (
        <section key={area}>
          <h3 className="font-sans text-[12.5px] font-semibold capitalize" style={ink}>
            {area} <span style={ink3}>· {count}</span>
          </h3>
          <ul className="mt-1.5 divide-y border-y" style={line}>
            {data.items
              .filter((i) => i.area === area)
              .map((i) => (
                <li key={i.file} className="py-2" style={line}>
                  <p className="font-sans text-[12.5px] font-medium" style={ink}>
                    {i.title}
                    {i.since ? <span style={ink3}> · since {i.since}</span> : null}
                  </p>
                  {i.basis ? (
                    <p className="mt-0.5 line-clamp-2 font-sans text-[11.5px] leading-[1.45]" style={ink3}>
                      {i.basis}
                    </p>
                  ) : null}
                  <p className="mt-0.5 break-all font-mono text-[11px]" style={ink3}>
                    {i.file}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
