"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { X, UserPlus } from "lucide-react";

interface CrearSocioModalProps {
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

export default function CrearSocioModal({
  onClose,
  onSuccess,
  onError,
}: CrearSocioModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    numeroSocio: "",
    nombre: "",
    telefono: "",
    email: "",
    fechaNacimiento: "",
    tipoMembresia: "",
    descripcionMembresia: "",
    formaPago: "EFECTIVO" as
      | "EFECTIVO"
      | "TARJETA_DEBITO"
      | "TARJETA_CREDITO"
      | "TRANSFERENCIA",
  });

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!formData.numeroSocio) {
      onError("El número de socio es requerido");
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        numeroSocio: formData.numeroSocio,
        nombre: formData.nombre || undefined,
        telefono: formData.telefono || undefined,
        email: formData.email || undefined,
        fechaNacimiento: formData.fechaNacimiento
          ? new Date(formData.fechaNacimiento).toISOString()
          : undefined,
        tipoMembresia: formData.tipoMembresia || undefined,
        descripcionMembresia: formData.descripcionMembresia || undefined,
        formaPago: formData.formaPago,
      };

      const res = await fetch("/api/socios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear socio");
      }

      onSuccess(
        `Socio creado${formData.tipoMembresia ? " y venta registrada" : ""}`,
      );
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Nuevo Socio</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-6 overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Número de Socio <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.numeroSocio}
                onChange={(e) => handleChange("numeroSocio", e.target.value)}
                placeholder="FN001"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                placeholder="Juan Pérez García"
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
                placeholder="311-123-4567"
                type="tel"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="socio@email.com"
                type="email"
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de Nacimiento</Label>
              <Input
                value={formData.fechaNacimiento}
                onChange={(e) =>
                  handleChange("fechaNacimiento", e.target.value)
                }
                type="date"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Membresía</Label>
              <Select
                value={formData.tipoMembresia}
                onValueChange={(value) => handleChange("tipoMembresia", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VISITA">Visita - $50</SelectItem>
                  <SelectItem value="SEMANA">Semana - $180</SelectItem>
                  <SelectItem value="MES_ESTUDIANTE">
                    Mes Estudiante - $450
                  </SelectItem>
                  <SelectItem value="MES_GENERAL">
                    Mes General - $540
                  </SelectItem>
                  <SelectItem value="TRIMESTRE_ESTUDIANTE">
                    Trimestre Estudiante - $1,215
                  </SelectItem>
                  <SelectItem value="TRIMESTRE_GENERAL">
                    Trimestre General - $1,458
                  </SelectItem>
                  <SelectItem value="ANUAL_ESTUDIANTE">
                    Anual Estudiante - $4,320
                  </SelectItem>
                  <SelectItem value="ANUAL_GENERAL">
                    Anual General - $5,184
                  </SelectItem>
                  <SelectItem value="PROMOCION">Promoción</SelectItem>
                  <SelectItem value="RENACER">Renacer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción de Membresía</Label>
            <Input
              value={formData.descripcionMembresia}
              onChange={(e) =>
                handleChange("descripcionMembresia", e.target.value)
              }
              placeholder="EFECTIVO MENSUALIDAD GENERAL ENE 2026"
            />
          </div>

          {formData.tipoMembresia && (
            <div className="space-y-2">
              <Label>Forma de Pago</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "EFECTIVO", label: "Efectivo" },
                  { key: "TARJETA_DEBITO", label: "Débito" },
                  { key: "TARJETA_CREDITO", label: "Crédito" },
                  { key: "TRANSFERENCIA", label: "Transfer" },
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    type="button"
                    variant={formData.formaPago === key ? "default" : "outline"}
                    onClick={() => handleChange("formaPago", key)}
                    size="sm"
                    className="h-9"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 gap-2"
              disabled={loading}
            >
              <UserPlus className="h-4 w-4" />
              {loading ? "Creando..." : "Crear Socio"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
