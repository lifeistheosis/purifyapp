import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The councils while they load: the page's own shape (1.8, the owner's pick of
 * r3-03), its name over the seven bands of the gallery.
 */
export default function CouncilsLoading() {
  return (
    <section className="bg-night px-5 md:px-8 pt-6 pb-16 md:py-24">
      <div className="mx-auto max-w-[1200px] w-full cascade">
        <Skeleton weight="strong" className="h-3 w-28" />
        <Skeleton weight="strong" className="mt-3 h-8 w-[70%] max-w-[420px]" />
        <Skeleton weight="strong" className="mt-2 h-8 w-[45%] max-w-[280px]" />

        <div className="mt-6 cascade grid grid-cols-1 gap-2.5 md:mt-10 md:grid-cols-2 md:gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} weight="mid" className="h-[150px] rounded-[20px]" />
          ))}
        </div>
      </div>
    </section>
  );
}
