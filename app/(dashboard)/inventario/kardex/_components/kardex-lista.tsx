"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  ArrowRightLeft,
  X,
} from "lucide-react";
import type { KardexMovimientoResponse } from "@/types/api/inventory";
import { formatearPrecio, formatearValor } from "@/lib/domain/inventory";

interface KardexListaProps {
  movimientos: KardexMovimientoResponse[];
  producto: {
    id: number;
    name: string;
    gymStock: number;
    warehouseStock: number;
  };
}

export function KardexLista({ movimientos, producto }: KardexListaProps) {
  const getMovementIcon = (type: KardexMovimientoResponse["type"]) => {
    switch (type) {
      case "SALE":
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      case "ENTRY":
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case "TRANSFER":
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
      case "ADJUSTMENT":
        return <RefreshCw className="h-4 w-4 text-orange-600" />;
    }
  };

  const getMovementLabel = (type: KardexMovimientoResponse["type"]) => {
    switch (type) {
      case "SALE":
        return "Venta";
      case "ENTRY":
        return "Entrada";
      case "TRANSFER":
        return "Traspaso";
      case "ADJUSTMENT":
        return "Ajuste";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (movimientos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            No hay movimientos registrados para este producto
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Stats Card */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <ArrowUpCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Stock Gym
                </p>
                <p className="text-xl sm:text-2xl font-bold">
                  {producto.gymStock}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <ArrowUpCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Stock Bodega
                </p>
                <p className="text-xl sm:text-2xl font-bold">
                  {producto.warehouseStock}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <ArrowRightLeft className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Total
                </p>
                <p className="text-xl sm:text-2xl font-bold">
                  {producto.gymStock + producto.warehouseStock}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Historial de Movimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Vista Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left p-3 font-semibold text-sm">Tipo</th>
                  <th className="text-center p-3 font-semibold text-sm">
                    Fecha
                  </th>
                  <th className="text-center p-3 font-semibold text-sm">
                    Ubicación
                  </th>
                  <th className="text-center p-3 font-semibold text-sm">
                    Cantidad
                  </th>
                  <th className="text-center p-3 font-semibold text-sm">
                    Saldo
                  </th>
                  <th className="text-right p-3 font-semibold text-sm">
                    Precio
                  </th>
                  <th className="text-right p-3 font-semibold text-sm">
                    Total
                  </th>
                  <th className="text-left p-3 font-semibold text-sm">
                    Usuario
                  </th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((mov) => (
                  <tr
                    key={mov.id}
                    className={`border-b border-border hover:bg-muted ${
                      mov.isCancelled ? "opacity-50" : ""
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getMovementIcon(mov.type)}
                        <span className="font-medium">
                          {getMovementLabel(mov.type)}
                        </span>
                        {mov.isCancelled && (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center text-sm">
                      {formatDate(mov.date)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline">{mov.location}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`font-semibold ${
                          mov.quantity > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {mov.quantity > 0 ? "+" : ""}
                        {mov.quantity}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold">{mov.balance}</td>
                    <td className="p-3 text-right text-sm">
                      {mov.unitPrice ? formatearPrecio(mov.unitPrice) : "-"}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {mov.total ? formatearValor(mov.total) : "-"}
                    </td>
                    <td className="p-3 text-sm">{mov.user.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista Mobile */}
          <div className="md:hidden space-y-3">
            {movimientos.map((mov) => (
              <div
                key={mov.id}
                className={`border border-border rounded-lg p-3 space-y-2 ${
                  mov.isCancelled ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getMovementIcon(mov.type)}
                    <div>
                      <p className="font-semibold text-sm">
                        {getMovementLabel(mov.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(mov.date)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{mov.location}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground">Cantidad</p>
                    <p
                      className={`font-semibold ${
                        mov.quantity > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {mov.quantity > 0 ? "+" : ""}
                      {mov.quantity}
                    </p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className="font-bold">{mov.balance}</p>
                  </div>
                </div>

                {mov.total && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-semibold">
                        {formatearValor(mov.total)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {mov.user.name}
                </div>

                {mov.isCancelled && (
                  <Badge variant="destructive" className="text-xs">
                    Cancelado
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
