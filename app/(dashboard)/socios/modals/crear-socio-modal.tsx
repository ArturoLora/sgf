"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface CrearSocioModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TIPOS_MEMBRESIA = [
  { value: "VISIT", label: "Visita" },
  { value: "WEEK", label: "Semana" },
  { value: "MONTH_STUDENT", label: "Mes Estudiante" },
  { value: "MONTH_GENERAL", label: "Mes General" },
  { value: "QUARTER_STUDENT", label: "Trimestre Estudiante" },
  { value: "QUARTER_GENERAL", label: "Trimestre General" },
  { value: "ANNUAL_STUDENT", label: "Anual Estudiante" },
  { value: "ANNUAL_GENERAL", label: "Anual General" },
  { value: "PROMOTION", label: "Promoción" },
  { value: "REBIRTH", label: "Renacer" },
  { value: "NUTRITION_CONSULTATION", label: "Consulta Nutrición" },
];

export default function CrearSocioModal({
  open,
  onClose,
  onSuccess,
}: CrearSocioModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    memberNumber: "",
    name: "",
    phone: "",
    email: "",
    birthDate: "",
    membershipType: "",
    membershipDescription: "",
  });

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (!formData.phone.trim()) {
      setError("El teléfono es obligatorio");
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        memberNumber: formData.memberNumber,
        name: formData.name || null,
        phone: formData.phone,
        email: formData.email || null,
        birthDate: formData.birthDate || null,
        membershipType: formData.membershipType || null,
        membershipDescription: formData.membershipDescription || null,
      };

      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear socio");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Socio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="memberNumber">
                  Número de Socio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="memberNumber"
                  value={formData.memberNumber}
                  onChange={(e) => handleChange("memberNumber", e.target.value)}
                  placeholder="001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Juan Pérez"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Teléfono <span className="text-red-500">*</span>
                </Label>

                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="3111234567"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="socio@ejemplo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleChange("birthDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="membershipType">Tipo de Membresía</Label>
              <Select
                value={formData.membershipType}
                onValueChange={(value) => handleChange("membershipType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_MEMBRESIA.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="membershipDescription">
                Descripción de Membresía
              </Label>
              <Input
                id="membershipDescription"
                value={formData.membershipDescription}
                onChange={(e) =>
                  handleChange("membershipDescription", e.target.value)
                }
                placeholder="Información adicional"
              />
            </div>
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
              disabled={loading || !formData.memberNumber || !formData.phone}
              className="w-full sm:w-auto"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Guardando..." : "Crear Socio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
