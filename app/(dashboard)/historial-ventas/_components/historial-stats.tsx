"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { TicketVentaAgrupado } from "@/types/api/sales";

interface HistorialStatsProps {
  tickets: TicketVentaAgrupado[];
}

export function HistorialStats({ tickets }: HistorialStatsProps) {
  const stats = useMemo(() => {
    const totalValue = tickets.reduce(
      (sum, ticket) => sum + Number(ticket.total),
      0,
    );
    const cancelled = tickets.filter((ticket) => ticket.isCancelled).length;
    const totalItems = tickets.reduce(
      (sum, ticket) => sum + ticket.items.length,
      0,
    );

    return {
      totalValue,
      uniqueTickets: tickets.length,
      cancelled,
      totalItems,
    };
  }, [tickets]);

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">
            ${stats.totalValue.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">Total en ventas</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">
            {stats.uniqueTickets}
          </div>
          <p className="text-xs text-muted-foreground">Tickets</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">
            {stats.totalItems}
          </div>
          <p className="text-xs text-muted-foreground">Items</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold text-destructive">
            {stats.cancelled}
          </div>
          <p className="text-xs text-muted-foreground">Canceladas</p>
        </CardContent>
      </Card>
    </div>
  );
}
