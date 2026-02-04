"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import type { SocioResponse } from "@/types/api/members";

interface SociosStatsProps {
  members: SocioResponse[];
}

export function SociosStats({ members }: SociosStatsProps) {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activos = members.filter((m) => m.isActive).length;

    const conMembresia = members.filter((m) => {
      if (!m.endDate) return false;
      const endDate =
        typeof m.endDate === "string" ? new Date(m.endDate) : m.endDate;
      return endDate >= today;
    }).length;

    const vencidos = members.filter((m) => {
      if (!m.endDate) return false;
      const endDate =
        typeof m.endDate === "string" ? new Date(m.endDate) : m.endDate;
      return endDate < today;
    }).length;

    const totalVisitas = members.reduce((sum, m) => sum + m.totalVisits, 0);

    return {
      total: members.length,
      activos,
      conMembresia,
      vencidos,
      totalVisitas,
    };
  }, [members]);

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Total Socios
              </p>
              <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Vigentes
              </p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.conMembresia}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <UserX className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 dark:text-red-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Vencidos
              </p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.vencidos}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Visitas
              </p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.totalVisitas}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
