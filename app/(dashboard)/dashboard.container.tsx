"use client";

import { useEffect, useState } from "react";
import CorteAlert from "./corte-alert";
import DashboardStats from "./dashboard-stats";
import AlertasDashboard from "./alertas-dashboard";
import DashboardSkeleton from "./dashboard-skeleton";

interface SocioVencido {
  id: number;
  name: string;
  memberNumber: string;
}

interface ProductoBajoStock {
  id: number;
  name: string;
  gymStock: number;
  warehouseStock: number;
  minStock: number;
}

interface CorteActivo {
  folio: string;
  cashier: { name: string };
  openingDate: string;
  ticketCount: number;
}

interface DashboardData {
  corteActivo: CorteActivo | null;
  stats: {
    ventas: number;
    total: number;
  };
  sociosVencidos: SocioVencido[];
  stockBajo: ProductoBajoStock[];
}

export default function DashboardContainer() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/dashboard");

        if (!response.ok) {
          throw new Error("Error al cargar datos del dashboard");
        }

        const result = await response.json();
        setData(result);
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
