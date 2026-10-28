import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The saint web while it arrives (1.8): its own shape, not the saint page's.
 * A row of chips, the saint in the middle and a few around him, and the sheet
 * at the foot.
 */
export default function SaintWebLoading() {
  const around = [
    { left: "86%", top: 170 },
    { left: "14%", top: 170 },
    { left: "50%", top: 40 },
    { left: "50%", top: 302 },
  ];
  return (
    <div className="bg-night px-5 md:px-8">
      <div className="mx-auto w-full max-w-[1100px] pt-4 md:pt-14">
        <div className="cascade flex gap-[7px]">
          {[40, 72, 64].map((w, i) => (
            <Skeleton key={i} weight="faint" rounded="rounded-pill" className="h-8" style={{ width: w }} />
          ))}
        </div>
        <div className="relative mx-auto mt-2 h-[380px] w-full max-w-[560px]">
          <Skeleton weight="mid" rounded="rounded-full" className="absolute left-1/2 top-[122px] h-24 w-24 -translate-x-1/2" />
          {around.map((p, i) => (
            <Skeleton
              key={i}
              weight="faint"
              rounded="rounded-full"
              className="absolute h-12 w-12 -translate-x-1/2"
              style={{ left: p.left, top: p.top }}
            />
          ))}
        </div>
        <Skeleton weight="faint" rounded="rounded-[26px]" className="mx-auto mt-3 h-[150px] w-full max-w-[560px]" />
      </div>
    </div>
  );
}
