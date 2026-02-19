import { ReportesSkeleton } from "./_components/reportes-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
      <ReportesSkeleton />
    </div>
  );
}
