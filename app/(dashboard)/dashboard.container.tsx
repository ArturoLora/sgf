// app/(dashboard)/dashboard.container.tsx
import {
  ShiftsService,
  InventoryService,
  MembersService,
  ReportsService,
} from "@/services";
import CorteAlert from "./corte-alert";
import DashboardStats from "./dashboard-stats";
import AlertasDashboard from "./alertas-dashboard";

async function getStatsDelDia() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const movimientos = await InventoryService.getMovementsByDate(
    today,
    tomorrow,
  );
  const ventas = movimientos.filter((m) => m.type === "SALE" && !m.isCancelled);
  const total = ventas.reduce((sum, v) => sum + Number(v.total || 0), 0);

  return { ventas: ventas.length, total };
}

export default async function DashboardContainer() {
  const [corteActivo, stats, sociosVencidos, reporte] = await Promise.all([
    ShiftsService.getActiveShift(),
    getStatsDelDia(),
    MembersService.getExpiredMembers(),
    ReportsService.getCurrentStockReport(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Resumen general del gimnasio</p>
      </div>

      <CorteAlert corteActivo={corteActivo} />

      <DashboardStats
        ventas={stats.ventas}
        total={stats.total}
        sociosVencidos={sociosVencidos.length}
        stockBajo={reporte.lowStock.length}
      />

      <AlertasDashboard
        sociosVencidos={sociosVencidos}
        stockBajo={reporte.lowStock}
      />
    </div>
  );
}
