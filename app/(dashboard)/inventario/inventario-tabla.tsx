"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import Link from "next/link";

interface Producto {
  id: number;
  name: string;
  salePrice: number;
  warehouseStock: number;
  gymStock: number;
  minStock: number;
  isActive: boolean;
}

interface InventarioTablaProps {
  productos: Producto[];
}

export default function InventarioTabla({ productos }: InventarioTablaProps) {
  const getEstadoStock = (actual: number, minimo: number) => {
    if (actual === 0) {
      return {
        variant: "destructive" as const,
        texto: "Sin stock",
      };
    }
    if (actual < minimo) {
      return {
        variant: "outline" as const,
        texto: "Bajo",
        className: "bg-orange-50 text-orange-700 border-orange-200",
      };
    }
    return {
      variant: "default" as const,
      texto: "OK",
      className: "bg-green-50 text-green-700 border-green-200",
    };
  };

  if (productos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No hay productos que coincidan</p>
      </div>
    );
  }

  return (
    <>
      {/* Vista Desktop/Tablet */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-semibold text-sm">Producto</th>
              <th className="text-center p-3 font-semibold text-sm">
                Stock Gym
              </th>
              <th className="text-center p-3 font-semibold text-sm">
                Stock Bodega
              </th>
              <th className="text-center p-3 font-semibold text-sm">Total</th>
              <th className="text-right p-3 font-semibold text-sm">Precio</th>
              <th className="text-right p-3 font-semibold text-sm">Valor</th>
              <th className="text-center p-3 font-semibold text-sm">Mín</th>
              <th className="text-center p-3 font-semibold text-sm">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto) => {
              const estadoGym = getEstadoStock(
                producto.gymStock,
                producto.minStock,
              );
              const estadoBodega = getEstadoStock(
                producto.warehouseStock,
                producto.minStock,
              );
              const stockTotal = producto.warehouseStock + producto.gymStock;
              const valorTotal = Number(producto.salePrice) * stockTotal;

              return (
                <tr key={producto.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <p className="font-medium">{producto.name}</p>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`font-semibold ${
                          producto.gymStock === 0
                            ? "text-red-600"
                            : producto.gymStock < producto.minStock
                              ? "text-orange-600"
                              : ""
                        }`}
                      >
                        {producto.gymStock}
                      </span>
                      <Badge
                        variant={estadoGym.variant}
                        className={estadoGym.className}
                      >
                        {estadoGym.texto}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`font-semibold ${
                          producto.warehouseStock === 0
                            ? "text-red-600"
                            : producto.warehouseStock < producto.minStock
                              ? "text-orange-600"
                              : ""
                        }`}
                      >
                        {producto.warehouseStock}
                      </span>
                      <Badge
                        variant={estadoBodega.variant}
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
                      ${Number(producto.salePrice).toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="font-bold text-purple-600">
                      ${valorTotal.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-gray-500 text-sm">
                      {producto.minStock}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <Link href={`/inventario/kardex/${producto.id}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Kardex
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista Mobile */}
      <div className="md:hidden space-y-3">
        {productos.map((producto) => {
          const estadoGym = getEstadoStock(
            producto.gymStock,
            producto.minStock,
          );
          const estadoBodega = getEstadoStock(
            producto.warehouseStock,
            producto.minStock,
          );
          const stockTotal = producto.warehouseStock + producto.gymStock;
          const valorTotal = Number(producto.salePrice) * stockTotal;

          return (
            <div
              key={producto.id}
              className="border rounded-lg p-3 space-y-3 bg-white"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">
                    {producto.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Precio: ${Number(producto.salePrice).toFixed(2)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold">{stockTotal}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>

              {/* Stocks */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-600 mb-1">Gym</p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold ${
                        producto.gymStock === 0
                          ? "text-red-600"
                          : producto.gymStock < producto.minStock
                            ? "text-orange-600"
                            : ""
                      }`}
                    >
                      {producto.gymStock}
                    </span>
                    <Badge
                      variant={estadoGym.variant}
                      className={`${estadoGym.className} text-xs`}
                    >
                      {estadoGym.texto}
                    </Badge>
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-600 mb-1">Bodega</p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold ${
                        producto.warehouseStock === 0
                          ? "text-red-600"
                          : producto.warehouseStock < producto.minStock
                            ? "text-orange-600"
                            : ""
                      }`}
                    >
                      {producto.warehouseStock}
                    </span>
                    <Badge
                      variant={estadoBodega.variant}
                      className={`${estadoBodega.className} text-xs`}
                    >
                      {estadoBodega.texto}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-xs text-gray-500">Valor Total</p>
                  <p className="font-bold text-purple-600">
                    ${valorTotal.toFixed(2)}
                  </p>
                </div>
                <Link href={`/inventario/kardex/${producto.id}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Kardex
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
