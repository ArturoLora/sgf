import { requireAuth } from "@/lib/require-role";
import { ReportesManager } from "./_components/reportes-manager";

export default async function ReportesPage() {
  await requireAuth();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stock actual del inventario
        </p>
      </div>

      <ReportesManager />
    </div>
  );
}
