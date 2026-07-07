"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/domain/sales";
import type { HistorialStatsResponse } from "@/types/api/sales";

interface HistorialStatsProps {
  // Story A2: stats precalculadas por getSalesHistory() sobre el universo
  // completo bajo filtros — ya no se recalculan aquí sobre la página actual.
  stats: HistorialStatsResponse;
}

export function HistorialStats({ stats }: HistorialStatsProps) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">
            ${formatCurrency(stats.totalValue)}
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
