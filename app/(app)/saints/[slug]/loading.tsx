export default function SaintLoading() {
  return (
    <div className="bg-night px-5 md:px-8 py-12 md:py-16">
      <div className="mx-auto max-w-[860px] w-full">
        {/* Hero: icon + name */}
        <div className="flex flex-col items-center text-center">
          <div className="h-28 w-28 md:h-36 md:w-36 rounded-full bg-paper/8 animate-pulse" />
          <div className="mt-6 h-10 md:h-12 w-[70%] max-w-[440px] rounded bg-paper/10 animate-pulse" />
          <div className="mt-4 h-4 w-48 rounded bg-paper/6 animate-pulse" />
        </div>

        {/* Life paragraphs */}
        <div className="mt-12 space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <div className="h-4 w-full rounded bg-paper/6 animate-pulse" />
              <div className="h-4 w-full rounded bg-paper/6 animate-pulse" />
              <div className="h-4 w-[88%] rounded bg-paper/6 animate-pulse" />
              <div className="h-4 w-[64%] rounded bg-paper/6 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
