"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  TrendingUp,
  X,
} from "lucide-react";

interface Member {
  id: number;
  memberNumber: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  membershipType: string | null;
  membershipDescription: string | null;
  startDate: string | null;
  endDate: string | null;
  totalVisits: number;
  lastVisit: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DetalleSocioModalProps {
  member: Member | null;
  onClose: () => void;
}

const TIPOS_MEMBRESIA: Record<string, string> = {
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

export default function DetalleSocioModal({
  member,
  onClose,
}: DetalleSocioModalProps) {
  if (!member) return null;

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVigenciaBadge = () => {
    if (!member.endDate) {
      return (
        <Badge variant="outline" className="bg-gray-50">
          Sin membresía
        </Badge>
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(member.endDate);

    if (end >= today) {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200">
          Vigente hasta {formatDate(member.endDate)}
        </Badge>
      );
    }

    return (
      <Badge
        variant="destructive"
        className="bg-red-50 text-red-700 border-red-200"
      >
        Vencida desde {formatDate(member.endDate)}
      </Badge>
    );
  };

  const calcularEdad = () => {
    if (!member.birthDate) return null;
    const hoy = new Date();
    const nacimiento = new Date(member.birthDate);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  return (
    <Dialog open={!!member} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl sm:text-2xl mb-2">
                {member.name || "Sin nombre"}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  #{member.memberNumber}
                </Badge>
                {!member.isActive && (
                  <Badge variant="destructive">Inactivo</Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 sm:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Información de contacto */}
          <div>
            <h3 className="font-semibold mb-3 text-sm text-gray-500 uppercase">
              Información de Contacto
            </h3>
            <div className="space-y-3">
              {member.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{member.phone}</span>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="break-all">{member.email}</span>
                </div>
              )}
              {member.birthDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>
                    {formatDate(member.birthDate)}
                    {calcularEdad() && ` (${calcularEdad()} años)`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Membresía */}
          <div>
            <h3 className="font-semibold mb-3 text-sm text-gray-500 uppercase">
              Membresía
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CreditCard className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    {member.membershipType
                      ? TIPOS_MEMBRESIA[member.membershipType] ||
                        member.membershipType
                      : "Sin membresía activa"}
                  </p>
                  {member.membershipDescription && (
                    <p className="text-sm text-gray-500">
                      {member.membershipDescription}
                    </p>
                  )}
                </div>
              </div>

              <div className="pl-7">{getVigenciaBadge()}</div>

              {member.startDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm">
                    Inicio: {formatDate(member.startDate)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actividad */}
          <div>
            <h3 className="font-semibold mb-3 text-sm text-gray-500 uppercase">
              Actividad
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <span className="font-semibold text-lg">
                    {member.totalVisits}
                  </span>
                  <span className="text-gray-500 ml-2">
                    {member.totalVisits === 1 ? "visita" : "visitas"}
                  </span>
                </div>
              </div>

              {member.lastVisit && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm">
                    Última visita: {formatDateTime(member.lastVisit)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Registro */}
          <div>
            <h3 className="font-semibold mb-3 text-sm text-gray-500 uppercase">
              Registro del Sistema
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">Creado:</span>{" "}
                {formatDateTime(member.createdAt)}
              </p>
              <p>
                <span className="font-medium">Última actualización:</span>{" "}
                {formatDateTime(member.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
