"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Calendar, CreditCard, TrendingUp, X } from "lucide-react";
import type { SocioResponse } from "@/types/api/members";
import {
  formatearFecha,
  formatearFechaHora,
  obtenerLabelMembresia,
  obtenerEstadoVigencia,
  calcularEdad,
} from "@/lib/domain/members";

interface DetalleSocioModalProps {
  member: SocioResponse | null;
  onClose: () => void;
}

function VigenciaDetalleBadge({
  endDate,
}: {
  endDate: SocioResponse["endDate"];
}) {
  const estado = obtenerEstadoVigencia(endDate);

  switch (estado) {
    case "vigente":
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
          Vigente hasta {formatearFecha(endDate)}
        </Badge>
      );
    case "vencida":
      return (
        <Badge
          variant="destructive"
          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
        >
          Vencida desde {formatearFecha(endDate)}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-muted">
          Sin membresía
        </Badge>
      );
  }
}

export function DetalleSocioModal({ member, onClose }: DetalleSocioModalProps) {
  if (!member) return null;

  const edad = member.birthDate ? calcularEdad(member.birthDate) : null;

  return (
    <Dialog open={!!member} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl sm:text-2xl mb-2">
                {member.name ?? "Sin nombre"}
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
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">
              Información de Contacto
            </h3>
            <div className="space-y-3">
              {member.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{member.phone}</span>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="break-all">{member.email}</span>
                </div>
              )}
              {member.birthDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>
                    {formatearFecha(member.birthDate)}
                    {edad !== null && ` (${edad} años)`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Membresía */}
          <div>
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">
              Membresía
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    {member.membershipType
                      ? obtenerLabelMembresia(member.membershipType)
                      : "Sin membresía activa"}
                  </p>
                  {member.membershipDescription && (
                    <p className="text-sm text-muted-foreground">
                      {member.membershipDescription}
                    </p>
                  )}
                </div>
              </div>

              <div className="pl-7">
                <VigenciaDetalleBadge endDate={member.endDate} />
              </div>

              {member.startDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">
                    Inicio: {formatearFecha(member.startDate)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actividad */}
          <div>
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">
              Actividad
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="font-semibold text-lg">
                    {member.totalVisits}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {member.totalVisits === 1 ? "visita" : "visitas"}
                  </span>
                </div>
              </div>

              {member.lastVisit && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">
                    Última visita: {formatearFechaHora(member.lastVisit)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Registro */}
          <div>
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">
              Registro del Sistema
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Creado:</span>{" "}
                {formatearFechaHora(member.createdAt)}
              </p>
              <p>
                <span className="font-medium">Última actualización:</span>{" "}
                {formatearFechaHora(member.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
