"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface HistorialStatsProps {
  tickets: any[];
}

export default function HistorialStats({ tickets }: HistorialStatsProps) {
  const stats = useMemo(() => {
    const totalValue = tickets.reduce((s, t) => s + Number(t.total), 0);
    const cancelled = tickets.filter((t) => t.isCancelled).length;
    const totalItems = tickets.reduce((s, t) => s + t.items.length, 0);

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
          <p className="text-xs text-gray-500">Total en ventas</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">
            {stats.uniqueTickets}
          </div>
          <p className="text-xs text-gray-500">Tickets</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold">
            {stats.totalItems}
          </div>
          <p className="text-xs text-gray-500">Items</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xl sm:text-2xl font-bold text-red-600">
            {stats.cancelled}
          </div>
          <p className="text-xs text-gray-500">Canceladas</p>
        </CardContent>
      </Card>
    </div>
  );
}
