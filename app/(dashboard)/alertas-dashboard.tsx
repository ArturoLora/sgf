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
  if (sociosVencidos.length === 0 && stockBajo.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
      {sociosVencidos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
              Membresías Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {sociosVencidos.slice(0, 5).map((socio) => (
                <div
                  key={socio.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 p-2.5 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {socio.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
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
                <p className="text-xs text-gray-500 pl-2.5 pt-1">
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
              <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
              Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {stockBajo.slice(0, 5).map((producto) => (
                <div
                  key={producto.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 p-2.5 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {producto.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Gym: {producto.gymStock} · Bodega:{" "}
                      {producto.warehouseStock}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-yellow-50 text-yellow-700 border-yellow-200 shrink-0 text-xs px-2 py-0.5"
                  >
                    Min {producto.minStock}
                  </Badge>
                </div>
              ))}
              {stockBajo.length > 5 && (
                <p className="text-xs text-gray-500 pl-2.5 pt-1">
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
