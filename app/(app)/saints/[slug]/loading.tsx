import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function SaintLoading() {
  return (
    <div className="bg-night px-5 md:px-8 py-12 md:py-16">
      <div className="mx-auto max-w-[860px] w-full">
        {/* Hero: icon + name */}
        <div className="cascade flex flex-col items-center text-center">
          <Skeleton
            weight="mid"
            rounded="rounded-full"
            className="h-28 w-28 md:h-36 md:w-36"
          />
          <Skeleton
            weight="strong"
            className="mt-6 h-10 md:h-12 w-[70%] max-w-[440px]"
          />
          <Skeleton weight="faint" className="mt-4 h-4 w-48" />
        </div>

        {/* Life paragraphs */}
        <div className="mt-12 cascade space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonText key={i} lines={4} className="space-y-2.5" />
          ))}
        </div>
      </div>
    </div>
  );
}
