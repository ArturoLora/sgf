"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import Link from "next/link";
import {
  formatearEstadoStock,
  formatearPrecio,
  formatearValor,
  calcularStockTotal,
  calcularValorProducto,
  type Producto,
} from "@/lib/domain/inventory";

interface InventarioTablaProps {
  productos: Producto[];
}

export function InventarioTabla({ productos }: InventarioTablaProps) {
  if (productos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay productos que coincidan</p>
      </div>
    );
  }

  return (
    <>
      {/* Vista Desktop/Tablet */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted">
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
              const estadoGym = formatearEstadoStock(
                producto.gymStock,
                producto.minStock,
              );
              const estadoBodega = formatearEstadoStock(
                producto.warehouseStock,
                producto.minStock,
              );
              const stockTotal = calcularStockTotal(producto);
              const valorTotal = calcularValorProducto(producto);

              return (
                <tr
                  key={producto.id}
                  className="border-b border-border hover:bg-muted"
                >
                  <td className="p-3">
                    <p className="font-medium">{producto.name}</p>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`font-semibold ${
                          producto.gymStock === 0
                            ? "text-red-600 dark:text-red-400"
                            : producto.gymStock < producto.minStock
                              ? "text-orange-600 dark:text-orange-400"
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
                            ? "text-red-600 dark:text-red-400"
                            : producto.warehouseStock < producto.minStock
                              ? "text-orange-600 dark:text-orange-400"
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
                      {formatearPrecio(producto.salePrice)}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {formatearValor(valorTotal)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-muted-foreground text-sm">
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
          const estadoGym = formatearEstadoStock(
            producto.gymStock,
            producto.minStock,
          );
          const estadoBodega = formatearEstadoStock(
            producto.warehouseStock,
            producto.minStock,
          );
          const stockTotal = calcularStockTotal(producto);
          const valorTotal = calcularValorProducto(producto);

          return (
            <div
              key={producto.id}
              className="border border-border rounded-lg p-3 space-y-3 bg-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">
                    {producto.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Precio: {formatearPrecio(producto.salePrice)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold">{stockTotal}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted rounded p-2">
                  <p className="text-xs text-muted-foreground mb-1">Gym</p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold ${
                        producto.gymStock === 0
                          ? "text-red-600 dark:text-red-400"
                          : producto.gymStock < producto.minStock
                            ? "text-orange-600 dark:text-orange-400"
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

                <div className="bg-muted rounded p-2">
                  <p className="text-xs text-muted-foreground mb-1">Bodega</p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold ${
                        producto.warehouseStock === 0
                          ? "text-red-600 dark:text-red-400"
                          : producto.warehouseStock < producto.minStock
                            ? "text-orange-600 dark:text-orange-400"
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

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="font-bold text-purple-600 dark:text-purple-400">
                    {formatearValor(valorTotal)}
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
