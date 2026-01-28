import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, TrendingDown } from "lucide-react";

interface StatsProps {
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
}: StatsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
            Ventas Hoy
          </CardTitle>
          <ShoppingCart className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            {ventas}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">tickets</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
            Total Hoy
          </CardTitle>
          <DollarSign className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            ${total.toFixed(0)}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">MXN</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
            Vencidos
          </CardTitle>
          <Users className="h-4 w-4 text-orange-400" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            {sociosVencidos}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {sociosVencidos === 1 ? "socio" : "socios"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
            Stock Bajo
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            {stockBajo}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {stockBajo === 1 ? "producto" : "productos"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
