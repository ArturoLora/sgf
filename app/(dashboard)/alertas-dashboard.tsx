// app/(dashboard)/alertas-dashboard.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface Socio {
  id: number;
  nombre: string;
  numeroSocio: string;
}

interface Producto {
  id: number;
  nombre: string;
  existenciaGym: number;
  existenciaBodega: number;
  existenciaMin: number;
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
    <div className="grid gap-6 lg:grid-cols-2">
      {sociosVencidos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Socios con Membresía Vencida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sociosVencidos.slice(0, 5).map((socio) => (
                <div
                  key={socio.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{socio.nombre}</p>
                    <p className="text-sm text-gray-500">{socio.numeroSocio}</p>
                  </div>
                  <Badge variant="destructive">Vencido</Badge>
                </div>
              ))}
              {sociosVencidos.length > 5 && (
                <p className="text-sm text-gray-500">
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
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Productos con Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stockBajo.slice(0, 5).map((producto) => (
                <div
                  key={producto.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{producto.nombre}</p>
                    <p className="text-sm text-gray-500">
                      Gym: {producto.existenciaGym} | Bodega:{" "}
                      {producto.existenciaBodega}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50">
                    Min: {producto.existenciaMin}
                  </Badge>
                </div>
              ))}
              {stockBajo.length > 5 && (
                <p className="text-sm text-gray-500">
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
