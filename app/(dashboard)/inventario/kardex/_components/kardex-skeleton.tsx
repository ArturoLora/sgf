import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function KardexSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-32 sm:h-10 sm:w-40" />
        <Skeleton className="h-4 w-48 sm:w-64 mt-2" />
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className={i === 2 ? "col-span-2 lg:col-span-1" : ""}>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-full shrink-0" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3 w-20 sm:h-4 sm:w-24 mb-2" />
                  <Skeleton className="h-6 w-12 sm:h-8 sm:w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Movimientos */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48 sm:h-6 sm:w-56" />
        </CardHeader>
        <CardContent>
          {/* Desktop skeleton */}
          <div className="hidden md:block space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>

          {/* Mobile skeleton */}
          <div className="md:hidden space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="border border-border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
