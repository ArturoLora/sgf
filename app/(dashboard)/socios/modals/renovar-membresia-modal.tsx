"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, AlertCircle } from "lucide-react";

interface Member {
  id: number;
  memberNumber: string;
  name: string | null;
  membershipType: string | null;
  endDate: string | null;
}

interface RenovarMembresiaModalProps {
  member: Member | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TIPOS_MEMBRESIA = [
  { value: "VISIT", label: "Visita", dias: 1 },
  { value: "WEEK", label: "Semana", dias: 7 },
  { value: "MONTH_STUDENT", label: "Mes Estudiante", dias: 30 },
  { value: "MONTH_GENERAL", label: "Mes General", dias: 30 },
  { value: "QUARTER_STUDENT", label: "Trimestre Estudiante", dias: 90 },
  { value: "QUARTER_GENERAL", label: "Trimestre General", dias: 90 },
  { value: "ANNUAL_STUDENT", label: "Anual Estudiante", dias: 365 },
  { value: "ANNUAL_GENERAL", label: "Anual General", dias: 365 },
  { value: "PROMOTION", label: "Promoción", dias: 30 },
  { value: "REBIRTH", label: "Renacer", dias: 30 },
  { value: "NUTRITION_CONSULTATION", label: "Consulta Nutrición", dias: 1 },
];

export default function RenovarMembresiaModal({
  member,
  onClose,
  onSuccess,
}: RenovarMembresiaModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [membershipType, setMembershipType] = useState("");
  const [nuevaFechaFin, setNuevaFechaFin] = useState<string>("");

  useEffect(() => {
    if (member?.membershipType) {
      setMembershipType(member.membershipType);
      calcularNuevaFecha(member.membershipType);
    }
  }, [member]);

  const calcularNuevaFecha = (tipo: string) => {
    const tipoInfo = TIPOS_MEMBRESIA.find((t) => t.value === tipo);
    if (!tipoInfo) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Si la membresía actual está vigente, partir de la fecha de fin actual
    let fechaInicio = hoy;
    if (member?.endDate) {
      const fechaFinActual = new Date(member.endDate);
      if (fechaFinActual >= hoy) {
        fechaInicio = fechaFinActual;
      }
    }

    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + tipoInfo.dias);

    setNuevaFechaFin(
      fechaFin.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    );
  };

  const handleTipoChange = (tipo: string) => {
    setMembershipType(tipo);
    calcularNuevaFecha(tipo);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/members/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          membershipType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al renovar membresía");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  const esVencida = member.endDate && new Date(member.endDate) < new Date();

  return (
    <Dialog open={!!member} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Renovar Membresía</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            {member.name || member.memberNumber}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Estado actual */}
            <div className="rounded-lg bg-gray-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Membresía actual:</span>
                <Badge variant={esVencida ? "destructive" : "default"}>
                  {member.membershipType
                    ? TIPOS_MEMBRESIA.find(
                        (t) => t.value === member.membershipType,
                      )?.label || member.membershipType
                    : "Sin membresía"}
                </Badge>
              </div>
              {member.endDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Vence:</span>
                  <span className="text-sm font-medium">
                    {new Date(member.endDate).toLocaleDateString("es-MX")}
                  </span>
                </div>
              )}
            </div>

            {/* Selección de nueva membresía */}
            <div className="space-y-2">
              <Label htmlFor="membershipType">
                Nuevo Tipo de Membresía <span className="text-red-500">*</span>
              </Label>
              <Select
                value={membershipType}
                onValueChange={handleTipoChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_MEMBRESIA.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label} ({tipo.dias} días)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nueva fecha de fin */}
            {nuevaFechaFin && (
              <div className="rounded-lg bg-blue-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-blue-900">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium text-sm">Nueva vigencia</span>
                </div>
                <p className="text-sm text-blue-700">
                  La membresía será válida hasta el{" "}
                  <span className="font-semibold">{nuevaFechaFin}</span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !membershipType}
              className="w-full sm:w-auto"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Renovando..." : "Renovar Membresía"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
