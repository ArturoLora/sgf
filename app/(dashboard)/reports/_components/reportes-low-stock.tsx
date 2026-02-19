import type { ReporteStockActual } from "@/types/api/reports";
import { formatUnits } from "@/lib/domain/reports/formatters";

interface ReportesLowStockProps {
  report: ReporteStockActual;
}

export function ReportesLowStock({ report }: ReportesLowStockProps) {
  if (report.lowStock.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Productos con stock bajo
        </h2>
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-6 text-center">
          No hay productos con stock bajo actualmente.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Productos con stock bajo ({report.lowStock.length})
      </h2>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Producto</th>
              <th className="px-4 py-2 text-right font-medium">Stock Gym</th>
              <th className="px-4 py-2 text-right font-medium">Stock Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {report.lowStock.map((item) => (
              <tr
                key={item.id}
                className="border-b last:border-0 hover:bg-muted/30"
              >
                <td className="px-4 py-2 font-medium">{item.name}</td>
                <td className="px-4 py-2 text-right text-yellow-600 dark:text-yellow-400 font-mono">
                  {formatUnits(item.gymStock)}
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground font-mono">
                  {formatUnits(item.minStock)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
