import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import type { SocioVencidoResponse } from "@/types/api/members";
import type { ProductoBajoStockResponse } from "@/types/api/products";

interface AlertasDashboardProps {
  sociosVencidos: SocioVencidoResponse[];
  stockBajo: ProductoBajoStockResponse[];
}

export default function AlertasDashboard({
  sociosVencidos,
  stockBajo,
}: AlertasDashboardProps) {
  if (sociosVencidos.length === 0 && stockBajo.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
      {sociosVencidos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400 shrink-0" />
              Membresías Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {sociosVencidos.slice(0, 5).map((socio) => (
                <div
                  key={socio.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 border border-border p-2.5 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate text-foreground">
                      {socio.name || "Sin nombre"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {socio.memberNumber}
                    </p>
                  </div>
                  <Badge
                    variant="destructive"
                    className="shrink-0 text-xs px-2 py-0.5"
                  >
                    Vencido
                  </Badge>
                </div>
              ))}
              {sociosVencidos.length > 5 && (
                <p className="text-xs text-muted-foreground pl-2.5 pt-1">
                  +{sociosVencidos.length - 5} más
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {stockBajo.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 text-yellow-500 dark:text-yellow-400 shrink-0" />
              Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {stockBajo.slice(0, 5).map((producto) => (
                <div
                  key={producto.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 border border-border p-2.5 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate text-foreground">
                      {producto.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Gym: {producto.gymStock} · Bodega:{" "}
                      {producto.warehouseStock}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700 shrink-0 text-xs px-2 py-0.5"
                  >
                    Min {producto.minStock}
                  </Badge>
                </div>
              ))}
              {stockBajo.length > 5 && (
                <p className="text-xs text-muted-foreground pl-2.5 pt-1">
                  +{stockBajo.length - 5} más
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
