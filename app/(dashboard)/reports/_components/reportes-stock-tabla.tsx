import type { ReporteStockActual } from "@/types/api/reports";
import {
  formatCurrency,
  formatUnits,
  getStockStatus,
} from "@/lib/domain/reports/formatters";

interface ReportesStockTablaProps {
  report: ReporteStockActual;
}

const statusLabels: Record<string, string> = {
  ok: "OK",
  low: "Bajo",
  out: "Sin stock",
};

const statusClasses: Record<string, string> = {
  ok: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  low: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  out: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function ReportesStockTabla({ report }: ReportesStockTablaProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Stock actual por producto
      </h2>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Producto</th>
              <th className="px-4 py-3 text-right font-medium">Almacén</th>
              <th className="px-4 py-3 text-right font-medium">Gym</th>
              <th className="px-4 py-3 text-right font-medium">Mínimo</th>
              <th className="px-4 py-3 text-right font-medium">Precio</th>
              <th className="px-4 py-3 text-center font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {report.products.map((product) => {
              const status = getStockStatus(product.gymStock, product.minStock);
              return (
                <tr
                  key={product.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-2 font-medium">{product.name}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                    {formatUnits(product.warehouseStock)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {formatUnits(product.gymStock)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                    {formatUnits(product.minStock)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {formatCurrency(product.salePrice)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[status] ?? ""}`}
                    >
                      {statusLabels[status] ?? status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
