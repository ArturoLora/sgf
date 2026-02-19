import type { ReporteStockActual } from "@/types/api/reports";
import {
  getTotalProducts,
  getLowStockCount,
  getTotalStockValue,
  getTotalUnits,
} from "@/lib/domain/reports/calculations";
import { formatCurrency, formatUnits } from "@/lib/domain/reports/formatters";

interface ReportesStockStatsProps {
  report: ReporteStockActual;
}

interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  variant?: "default" | "warning" | "danger";
}

function StatCard({
  label,
  value,
  description,
  variant = "default",
}: StatCardProps) {
  const variantClasses: Record<string, string> = {
    default: "border-border",
    warning: "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20",
    danger: "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
  };

  return (
    <div
      className={`rounded-xl border p-4 ${variantClasses[variant] ?? variantClasses["default"]}`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {description !== undefined && description !== "" && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function ReportesStockStats({ report }: ReportesStockStatsProps) {
  const totalProducts = getTotalProducts(report);
  const lowStockCount = getLowStockCount(report);
  const totalValue = getTotalStockValue(report);
  const totalUnits = getTotalUnits(report);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard label="Productos activos" value={formatUnits(totalProducts)} />
      <StatCard
        label="Unidades totales"
        value={formatUnits(totalUnits)}
        description={`Almacén: ${formatUnits(report.stockSummary.warehouse)} · Gym: ${formatUnits(report.stockSummary.gym)}`}
      />
      <StatCard label="Valor total" value={formatCurrency(totalValue)} />
      <StatCard
        label="Stock bajo"
        value={formatUnits(lowStockCount)}
        variant={lowStockCount > 0 ? "warning" : "default"}
        description={lowStockCount > 0 ? "Requieren atención" : "Todo en orden"}
      />
    </div>
  );
}
