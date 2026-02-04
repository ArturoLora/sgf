"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Edit,
  RefreshCw,
  Calendar,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { SocioResponse } from "@/types/api/members";

interface SociosListaProps {
  members: SocioResponse[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onVerDetalle: (member: SocioResponse) => void;
  onEditar: (member: SocioResponse) => void;
  onRenovar: (member: SocioResponse) => void;
}

export function SociosLista({
  members,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  onVerDetalle,
  onEditar,
  onRenovar,
}: SociosListaProps) {
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getVigenciaBadge = (endDate: string | Date | null | undefined) => {
    if (!endDate) {
      return (
        <Badge variant="outline" className="bg-muted">
          Sin membresía
        </Badge>
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = typeof endDate === "string" ? new Date(endDate) : endDate;

    if (end >= today) {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
          Vigente
        </Badge>
      );
    }

    return (
      <Badge
        variant="destructive"
        className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
      >
        Vencida
      </Badge>
    );
  };

  const getTipoMembresiaLabel = (type: string | null) => {
    if (!type) return "-";

    const labels: Record<string, string> = {
      VISIT: "Visita",
      WEEK: "Semana",
      MONTH_STUDENT: "Mes Estudiante",
      MONTH_GENERAL: "Mes General",
      QUARTER_STUDENT: "Trimestre Estudiante",
      QUARTER_GENERAL: "Trimestre General",
      ANNUAL_STUDENT: "Anual Estudiante",
      ANNUAL_GENERAL: "Anual General",
      PROMOTION: "Promoción",
      REBIRTH: "Renacer",
      NUTRITION_CONSULTATION: "Consulta Nutrición",
    };

    return labels[type] || type;
  };

  if (loading) {
    return (
      <p className="text-center text-muted-foreground py-8">Cargando...</p>
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No se encontraron socios
      </p>
    );
  }

  return (
    <>
      {/* Vista móvil - Cards */}
      <div className="space-y-3 sm:hidden">
        {members.map((member) => (
          <div
            key={member.id}
            className={`border rounded-lg p-3 ${
              !member.isActive ? "bg-muted opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <strong className="text-sm truncate">
                    #{member.memberNumber}
                  </strong>
                  {getVigenciaBadge(member.endDate)}
                </div>
                <p className="font-medium truncate">
                  {member.name || "Sin nombre"}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground mb-3">
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span className="truncate">{member.phone}</span>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>Visitas: {member.totalVisits}</span>
              </div>
              {member.membershipType && (
                <p className="text-muted-foreground">
                  {getTipoMembresiaLabel(member.membershipType)}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onVerDetalle(member)}
                className="flex-1 gap-1"
              >
                <Eye className="h-3 w-3" />
                Ver
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditar(member)}
                className="flex-1 gap-1"
              >
                <Edit className="h-3 w-3" />
                Editar
              </Button>
              {member.membershipType && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRenovar(member)}
                  className="gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Vista desktop - Tabla */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted">
              <th className="text-left p-3 font-semibold text-sm">Número</th>
              <th className="text-left p-3 font-semibold text-sm">Nombre</th>
              <th className="text-left p-3 font-semibold text-sm">Contacto</th>
              <th className="text-left p-3 font-semibold text-sm">Membresía</th>
              <th className="text-center p-3 font-semibold text-sm">
                Vigencia
              </th>
              <th className="text-center p-3 font-semibold text-sm">Visitas</th>
              <th className="text-center p-3 font-semibold text-sm">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className={`border-b hover:bg-muted/50 ${
                  !member.isActive ? "opacity-60" : ""
                }`}
              >
                <td className="p-3">
                  <span className="font-mono text-sm font-medium">
                    {member.memberNumber}
                  </span>
                </td>
                <td className="p-3">
                  <p className="font-medium">{member.name || "Sin nombre"}</p>
                  {member.birthDate && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(member.birthDate)}
                    </p>
                  )}
                </td>
                <td className="p-3">
                  {member.phone && (
                    <p className="text-sm flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {member.phone}
                    </p>
                  )}
                  {member.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {member.email}
                    </p>
                  )}
                </td>
                <td className="p-3">
                  <p className="text-sm font-medium">
                    {getTipoMembresiaLabel(member.membershipType ?? null)}
                  </p>

                  {member.endDate && (
                    <p className="text-xs text-muted-foreground">
                      Vence: {formatDate(member.endDate)}
                    </p>
                  )}
                </td>
                <td className="p-3 text-center">
                  {getVigenciaBadge(member.endDate)}
                </td>
                <td className="p-3 text-center">
                  <span className="font-semibold">{member.totalVisits}</span>
                  {member.lastVisit && (
                    <p className="text-xs text-muted-foreground">
                      Última: {formatDate(member.lastVisit)}
                    </p>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onVerDetalle(member)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditar(member)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {member.membershipType && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRenovar(member)}
                        className="h-8 w-8 p-0"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t">
          <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1 || loading}
              onClick={() => onPageChange(currentPage - 1)}
              className="flex-1 sm:flex-initial"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === totalPages || loading}
              onClick={() => onPageChange(currentPage + 1)}
              className="flex-1 sm:flex-initial"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
