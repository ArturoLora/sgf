import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function KardexSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-8 w-64 sm:h-10 sm:w-96" />
          <Skeleton className="h-4 w-48 sm:w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-full sm:w-32" />
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

      {/* Movimientos */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48 sm:h-6 sm:w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="border border-border rounded-lg p-3 sm:p-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-36" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-12 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
