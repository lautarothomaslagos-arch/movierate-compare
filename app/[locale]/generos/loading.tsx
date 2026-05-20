import { Skeleton } from "@/components/ui/skeleton";

export default function GenerosLoading() {
  return (
    <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
      <Skeleton className="h-9 w-32 mb-2" />
      <Skeleton className="h-4 w-64 mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[16/9] rounded-lg" />
        ))}
      </div>
    </main>
  );
}
