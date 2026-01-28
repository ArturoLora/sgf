import { ShiftsService, MembersService, ReportsService } from "@/services";
import CorteAlert from "./corte-alert";
import DashboardStats from "./dashboard-stats";
import AlertasDashboard from "./alertas-dashboard";
import { prisma } from "@/lib/db";

async function getStatsDelDia() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const ventas = await prisma.inventoryMovement.findMany({
    where: {
      type: "SALE",
      isCancelled: false,
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
    select: {
      total: true,
    },
  });

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
    <div className="space-y-3 sm:space-y-4">
      <div className="space-y-0.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500">Resumen de operaciones</p>
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
