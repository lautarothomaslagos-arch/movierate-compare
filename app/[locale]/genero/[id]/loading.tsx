import { Skeleton } from "@/components/ui/skeleton";

export default function GeneroLoading() {
  return (
    <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
      <Skeleton className="h-4 w-32 mb-3" />
      <Skeleton className="h-9 w-40 mb-2" />
      <Skeleton className="h-4 w-64 mb-6" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[2/3] rounded-md" />
            <Skeleton className="mt-1.5 h-3 w-3/4" />
            <Skeleton className="mt-1 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </main>
  );
}
