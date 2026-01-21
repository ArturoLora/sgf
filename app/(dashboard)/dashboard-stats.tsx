// app/(dashboard)/dashboard-stats.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";

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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
          <ShoppingCart className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{ventas}</div>
          <p className="text-xs text-gray-500">tickets registrados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total del Día</CardTitle>
          <DollarSign className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${total.toFixed(2)}</div>
          <p className="text-xs text-gray-500">en ventas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Socios Vencidos</CardTitle>
          <Users className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{sociosVencidos}</div>
          <p className="text-xs text-gray-500">
            {sociosVencidos === 1 ? "socio" : "socios"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
          <TrendingUp className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stockBajo}</div>
          <p className="text-xs text-gray-500">
            {stockBajo === 1 ? "producto" : "productos"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
