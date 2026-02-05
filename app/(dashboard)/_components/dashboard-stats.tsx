import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, TrendingDown } from "lucide-react";

interface DashboardStatsProps {
  ventas: number;
  total: number;
  sociosVencidos: number;
  stockBajo: number;
}

export default function DashboardStats({
  ventas,
  total,
  sociosVencidos,
  stockBajo,
}: DashboardStatsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Ventas Hoy
          </CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl sm:text-3xl font-bold">{ventas}</div>
          <p className="text-xs text-muted-foreground mt-0.5">tickets</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Total Hoy
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl sm:text-3xl font-bold">
            ${total.toFixed(0)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">MXN</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Vencidos
          </CardTitle>
          <Users className="h-4 w-4 text-orange-500 dark:text-orange-400" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl sm:text-3xl font-bold">{sociosVencidos}</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sociosVencidos === 1 ? "socio" : "socios"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Stock Bajo
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl sm:text-3xl font-bold">{stockBajo}</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stockBajo === 1 ? "producto" : "productos"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
