"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";

interface Member {
  id: number;
  memberNumber: string;
  name: string | null;
  membershipType: string | null;
  endDate: string | null;
  isActive: boolean;
  totalVisits: number;
}

interface SociosStatsProps {
  members: Member[];
}

export default function SociosStats({ members }: SociosStatsProps) {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activos = members.filter((m) => m.isActive).length;

    const conMembresia = members.filter((m) => {
      if (!m.endDate) return false;
      return new Date(m.endDate) >= today;
    }).length;

    const vencidos = members.filter((m) => {
      if (!m.endDate) return false;
      return new Date(m.endDate) < today;
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
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">
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
            <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Vigentes
              </p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {stats.conMembresia}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <UserX className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Vencidos
              </p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">
                {stats.vencidos}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Visitas
              </p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">
                {stats.totalVisitas}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
