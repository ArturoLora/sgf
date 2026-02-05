"use client";

import { useEffect, useState } from "react";
import CorteAlert from "./corte-alert";
import DashboardStats from "./dashboard-stats";
import AlertasDashboard from "./alertas-dashboard";
import DashboardSkeleton from "./dashboard-skeleton";
import { ShiftsService, MembersService, ReportsService } from "@/services";
import type { CorteResponse } from "@/types/api/shifts";
import type { SocioVencidoResponse } from "@/types/api/members";
import type { ProductoBajoStockResponse } from "@/types/api/products";

interface DashboardState {
  corteActivo: CorteResponse | null;
  stats: {
    ventas: number;
    total: number;
  };
  sociosVencidos: SocioVencidoResponse[];
  stockBajo: ProductoBajoStockResponse[];
}

export default function DashboardContainer() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true);

        const [corteActivo, sociosVencidos, stockReport, dashboard] =
          await Promise.all([
            ShiftsService.getActiveShift(),
            MembersService.getExpiredMembers(),
            ReportsService.getCurrentStockReport(),
            ReportsService.getDashboardSummary(),
          ]);

        setData({
          corteActivo,
          stats: {
            ventas: dashboard.salesToday.tickets,
            total: dashboard.salesToday.total,
          },
          sociosVencidos,
          stockBajo: stockReport.lowStock,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resumen de operaciones
          </p>
        </div>
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error || "No se pudieron cargar los datos"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="space-y-0.5">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de operaciones</p>
      </div>

      <CorteAlert corteActivo={data.corteActivo} />

      <DashboardStats
        ventas={data.stats.ventas}
        total={data.stats.total}
        sociosVencidos={data.sociosVencidos.length}
        stockBajo={data.stockBajo.length}
      />

      <AlertasDashboard
        sociosVencidos={data.sociosVencidos}
        stockBajo={data.stockBajo}
      />
    </div>
  );
}
