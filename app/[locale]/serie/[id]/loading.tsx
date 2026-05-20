import { Skeleton } from "@/components/ui/skeleton";

export default function SerieLoading() {
  return (
    <div className="flex flex-col flex-1">
      <header className="px-4 sm:px-6 py-4 max-w-5xl mx-auto w-full">
        <Skeleton className="h-5 w-20" />
      </header>

      <main className="px-4 sm:px-6 pb-16 max-w-5xl mx-auto w-full">
        <section className="flex flex-col md:flex-row gap-6 md:gap-8 mb-10">
          <div className="shrink-0 mx-auto md:mx-0">
            <Skeleton className="w-48 sm:w-56 md:w-64 aspect-[2/3] rounded-lg" />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-32 mx-auto md:mx-0" />
            <Skeleton className="h-9 w-3/4 mx-auto md:mx-0" />
            <Skeleton className="h-4 w-1/2 mx-auto md:mx-0" />
            <div className="flex gap-2 justify-center md:justify-start pt-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </section>

        <Skeleton className="h-6 w-40 mb-3" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[2/3] rounded-md" />
              <Skeleton className="mt-1.5 h-3 w-3/4" />
              <Skeleton className="mt-1 h-3 w-1/2" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
