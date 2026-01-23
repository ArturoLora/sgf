"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

interface Producto {
  id: number;
  nombre: string;
  precioVenta: number;
  existenciaBodega: number;
  existenciaGym: number;
  existenciaMin: number;
  activo: boolean;
}

interface InventarioTablaProps {
  productos: Producto[];
  onVerKardex: (productoId: number) => void;
}

export default function InventarioTabla({
  productos,
  onVerKardex,
}: InventarioTablaProps) {
  const getEstadoStock = (actual: number, minimo: number) => {
    if (actual === 0) return { color: "destructive", texto: "Sin stock" };
    if (actual < minimo)
      return {
        color: "outline",
        texto: "Bajo",
        className: "bg-orange-50 text-orange-700 border-orange-200",
      };
    return {
      color: "default",
      texto: "OK",
      className: "bg-green-50 text-green-700 border-green-200",
    };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left p-3 font-semibold text-sm">Producto</th>
            <th className="text-center p-3 font-semibold text-sm">Stock Gym</th>
            <th className="text-center p-3 font-semibold text-sm">
              Stock Bodega
            </th>
            <th className="text-center p-3 font-semibold text-sm">Total</th>
            <th className="text-right p-3 font-semibold text-sm">Precio</th>
            <th className="text-right p-3 font-semibold text-sm">Valor</th>
            <th className="text-center p-3 font-semibold text-sm">Mín</th>
            <th className="text-center p-3 font-semibold text-sm">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((producto) => {
            const estadoGym = getEstadoStock(
              producto.existenciaGym,
              producto.existenciaMin,
            );
            const estadoBodega = getEstadoStock(
              producto.existenciaBodega,
              producto.existenciaMin,
            );
            const stockTotal =
              producto.existenciaBodega + producto.existenciaGym;
            const valorTotal = Number(producto.precioVenta) * stockTotal;

            return (
              <tr key={producto.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <p className="font-medium">{producto.nombre}</p>
                </td>
                <td className="p-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`font-semibold ${producto.existenciaGym === 0 ? "text-red-600" : producto.existenciaGym < producto.existenciaMin ? "text-orange-600" : ""}`}
                    >
                      {producto.existenciaGym}
                    </span>
                    <Badge
                      variant={estadoGym.color as any}
                      className={estadoGym.className}
                    >
                      {estadoGym.texto}
                    </Badge>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`font-semibold ${producto.existenciaBodega === 0 ? "text-red-600" : producto.existenciaBodega < producto.existenciaMin ? "text-orange-600" : ""}`}
                    >
                      {producto.existenciaBodega}
                    </span>
                    <Badge
                      variant={estadoBodega.color as any}
                      className={estadoBodega.className}
                    >
                      {estadoBodega.texto}
                    </Badge>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <span className="font-bold text-lg">{stockTotal}</span>
                </td>
                <td className="p-3 text-right">
                  <span className="font-medium">
                    ${Number(producto.precioVenta).toFixed(2)}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className="font-bold text-purple-600">
                    ${valorTotal.toFixed(2)}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span className="text-gray-500 text-sm">
                    {producto.existenciaMin}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <Button
                    onClick={() => onVerKardex(producto.id)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Kardex
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
