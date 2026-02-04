import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function InventarioSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-48 sm:h-10 sm:w-64" />
        <Skeleton className="h-4 w-64 sm:w-80 mt-2" />
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-full shrink-0" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3 w-20 sm:h-4 sm:w-24 mb-2" />
                  <Skeleton className="h-6 w-16 sm:h-8 sm:w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Skeleton className="h-10 flex-1" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 flex-1 sm:flex-initial" />
              <Skeleton className="h-10 w-24 flex-1 sm:flex-initial" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 sm:h-6 sm:w-40" />
            <Skeleton className="h-4 w-24 sm:w-32" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop skeleton */}
          <div className="hidden md:block space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>

          {/* Mobile skeleton */}
          <div className="md:hidden space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Skeleton className="h-5 flex-1" />
                      <Skeleton className="h-8 w-12" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-9 w-28" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
