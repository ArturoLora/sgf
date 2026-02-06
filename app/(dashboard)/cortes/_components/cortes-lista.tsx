"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Calendar, ChevronLeft, ChevronRight, User } from "lucide-react";
import type { CorteResponse } from "@/types/api/shifts";

interface CortesListaProps {
  cortes: CorteResponse[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onVerDetalle: (corteId: number) => void;
}

export default function CortesLista({
  cortes,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  onVerDetalle,
}: CortesListaProps) {
  const formatFecha = (fecha: string | Date) => {
    return new Date(fecha).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calcularDiferencia = (corte: CorteResponse) => {
    if (corte.status !== "CLOSED") return null;
    return Number(corte.difference);
  };

  if (loading) {
    return (
      <p className="text-center text-muted-foreground py-8">Cargando...</p>
    );
  }

  if (!cortes || cortes.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">Sin resultados</p>
    );
  }

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {cortes.map((corte) => {
          const diferencia = calcularDiferencia(corte);
          const estaCerrado = corte.status === "CLOSED";

          const tieneDiferencia =
            diferencia !== null && Math.abs(diferencia) > 0.01;

          return (
            <div
              key={corte.id}
              className={`border rounded-lg p-3 sm:p-4 ${
                !estaCerrado
                  ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                  : ""
              } ${tieneDiferencia && estaCerrado ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900" : ""}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <strong className="text-sm sm:text-base truncate">
                      {corte.folio}
                    </strong>
                    {estaCerrado ? (
                      <Badge variant="secondary" className="shrink-0">
                        Cerrado
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-600 dark:bg-blue-700 text-white shrink-0">
                        Abierto
                      </Badge>
                    )}
                    {tieneDiferencia && (
                      <Badge
                        variant="outline"
                        className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-800 shrink-0"
                      >
                        Con diferencia
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {corte.cashier?.name || "Sin cajero"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        Apertura: {formatFecha(corte.openingDate)}
                      </span>
                    </div>

                    {estaCerrado && corte.closingDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          Cierre: {formatFecha(corte.closingDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <p className="text-xl sm:text-2xl font-bold">
                    $
                    {corte.status === "CLOSED"
                      ? Number(corte.totalSales).toFixed(2)
                      : "0.00"}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Fondo: ${Number(corte.initialCash).toFixed(2)}
                  </p>
                  {tieneDiferencia && (
                    <p
                      className={`text-xs sm:text-sm font-medium ${
                        diferencia! > 0
                          ? "text-green-600 dark:text-green-500"
                          : "text-red-600 dark:text-red-500"
                      }`}
                    >
                      Dif: ${Math.abs(diferencia!).toFixed(2)}{" "}
                      {diferencia! > 0 ? "↑" : "↓"}
                    </p>
                  )}
                </div>
              </div>

              {estaCerrado && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/50 rounded p-2 sm:p-3 border-t text-xs sm:text-sm">
                  <div>
                    <p className="text-muted-foreground">Tickets</p>
                    <p className="font-medium">{corte.ticketCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Efectivo</p>
                    <p className="font-medium">
                      ${Number(corte.cashAmount).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tarjetas</p>
                    <p className="font-medium">
                      $
                      {(
                        Number(corte.debitCardAmount) +
                        Number(corte.creditCardAmount)
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Retiros</p>
                    <p className="font-medium text-red-600 dark:text-red-500">
                      ${Number(corte.totalWithdrawals).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onVerDetalle(corte.id)}
                  className="gap-2 flex-1 sm:flex-initial"
                >
                  <Eye className="h-4 w-4" />
                  Ver Detalle
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t">
          <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1 || loading}
              onClick={() => onPageChange(currentPage - 1)}
              className="flex-1 sm:flex-initial"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === totalPages || loading}
              onClick={() => onPageChange(currentPage + 1)}
              className="flex-1 sm:flex-initial"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
