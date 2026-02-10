"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import type { TicketVentaAgrupado } from "@/types/api/sales";
import {
  formatDateMX,
  formatPaymentMethod,
  formatCurrency,
  hasPreviousPage,
  hasNextPage,
} from "@/lib/domain/sales";

interface HistorialListaProps {
  tickets: TicketVentaAgrupado[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function HistorialLista({
  tickets,
  loading,
  currentPage,
  totalPages,
  onPageChange,
}: HistorialListaProps) {
  if (loading) {
    return (
      <p className="text-center text-muted-foreground py-8">Cargando...</p>
    );
  }

  if (tickets.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">Sin resultados</p>
    );
  }

  const showPagination = totalPages > 1;
  const canGoPrevious = hasPreviousPage(currentPage);
  const canGoNext = hasNextPage(currentPage, totalPages);

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {tickets.map((ticket) => (
          <div
            key={ticket.ticket}
            className={`border rounded-lg p-3 sm:p-4 ${
              ticket.isCancelled
                ? "bg-destructive/10 border-destructive/50"
                : "bg-card"
            }`}
          >
            {/* Header - responsive layout */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <strong className="text-sm sm:text-base truncate">
                    #{ticket.ticket}
                  </strong>
                  <Badge variant="secondary" className="shrink-0">
                    {ticket.items.length} items
                  </Badge>
                  {ticket.isCancelled && (
                    <Badge variant="destructive" className="shrink-0">
                      Cancelada
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span className="truncate">{formatDateMX(ticket.date)}</span>
                </div>

                <div className="space-y-0.5 text-xs sm:text-sm text-muted-foreground">
                  <p className="truncate">
                    Cajero:{" "}
                    <span className="font-medium text-foreground">
                      {ticket.cashier}
                    </span>
                  </p>

                  {ticket.paymentMethod && (
                    <p className="truncate">
                      Pago:{" "}
                      <span className="font-medium text-foreground">
                        {formatPaymentMethod(ticket.paymentMethod)}
                      </span>
                    </p>
                  )}

                  {ticket.member && (
                    <p className="truncate">
                      Cliente:{" "}
                      <span className="font-medium text-foreground">
                        {ticket.member.name || ticket.member.memberNumber}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Total - aligned right on desktop, full width on mobile */}
              <div className="text-left sm:text-right shrink-0">
                <p className="text-xl sm:text-2xl font-bold">
                  ${formatCurrency(ticket.total)}
                </p>
              </div>
            </div>

            {/* Items - responsive list */}
            <div className="space-y-1 bg-muted rounded p-2 sm:p-3 border-t border-border">
              {ticket.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start gap-2 text-xs sm:text-sm"
                >
                  <span className="text-muted-foreground flex-1 min-w-0">
                    <span className="font-medium text-foreground">
                      {Math.abs(item.quantity)}x
                    </span>{" "}
                    <span className="truncate inline-block max-w-full">
                      {item.product.name}
                    </span>
                  </span>
                  <span className="font-medium shrink-0">
                    ${formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination - responsive */}
      {showPagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-border">
          <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              disabled={!canGoPrevious || loading}
              onClick={() => onPageChange(currentPage - 1)}
              className="flex-1 sm:flex-initial"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={!canGoNext || loading}
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
