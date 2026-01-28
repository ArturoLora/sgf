// app/(dashboard)/alertas-dashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface Socio {
  id: number;
  name: string;
  memberNumber: string;
}

interface Producto {
  id: number;
  name: string;
  gymStock: number;
  warehouseStock: number;
  minStock: number;
}

interface AlertasProps {
  sociosVencidos: Socio[];
  stockBajo: Producto[];
}

export default function AlertasDashboard({
  sociosVencidos,
  stockBajo,
}: AlertasProps) {
  return (
    // Responsive grid: 1 col mobile, 2 cols lg
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
      {sociosVencidos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Socios con Membresía Vencida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sociosVencidos.slice(0, 5).map((socio) => (
                <div
                  key={socio.id}
                  className="flex items-center justify-between rounded-lg border p-3 gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{socio.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {socio.memberNumber}
                    </p>
                  </div>
                  <Badge variant="destructive" className="shrink-0 text-xs">
                    Vencido
                  </Badge>
                </div>
              ))}
              {sociosVencidos.length > 5 && (
                <p className="text-xs sm:text-sm text-gray-500">
                  + {sociosVencidos.length - 5} más
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {stockBajo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Productos con Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stockBajo.slice(0, 5).map((producto) => (
                <div
                  key={producto.id}
                  className="flex items-center justify-between rounded-lg border p-3 gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {producto.name}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Gym: {producto.gymStock} | Bodega:{" "}
                      {producto.warehouseStock}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-yellow-50 shrink-0 text-xs"
                  >
                    Min: {producto.minStock}
                  </Badge>
                </div>
              ))}
              {stockBajo.length > 5 && (
                <p className="text-xs sm:text-sm text-gray-500">
                  + {stockBajo.length - 5} más
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
