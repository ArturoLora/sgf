"use client";

import { useState, useEffect } from "react";
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
import { X, Save } from "lucide-react";

interface EditarSocioModalProps {
  socioId: number;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

export default function EditarSocioModal({
  socioId,
  onClose,
  onSuccess,
  onError,
}: EditarSocioModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    fechaNacimiento: "",
    tipoMembresia: "",
    descripcionMembresia: "",
    fechaInicio: "",
    fechaFin: "",
    activo: true,
  });

  useEffect(() => {
    cargarSocio();
  }, [socioId]);

  const cargarSocio = async () => {
    try {
      const res = await fetch(`/api/socios/${socioId}`);
      if (!res.ok) throw new Error("Error al cargar socio");

      const socio = await res.json();
      setFormData({
        nombre: socio.nombre || "",
        telefono: socio.telefono || "",
        email: socio.email || "",
        fechaNacimiento: socio.fechaNacimiento
          ? new Date(socio.fechaNacimiento).toISOString().split("T")[0]
          : "",
        tipoMembresia: socio.tipoMembresia || "",
        descripcionMembresia: socio.descripcionMembresia || "",
        fechaInicio: socio.fechaInicio
          ? new Date(socio.fechaInicio).toISOString().split("T")[0]
          : "",
        fechaFin: socio.fechaFin
          ? new Date(socio.fechaFin).toISOString().split("T")[0]
          : "",
        activo: socio.activo,
      });
    } catch (err) {
      onError("Error al cargar los datos del socio");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    setSaving(true);

    try {
      const payload: any = {
        nombre: formData.nombre || undefined,
        telefono: formData.telefono || undefined,
        email: formData.email || undefined,
        fechaNacimiento: formData.fechaNacimiento || undefined,
        tipoMembresia: formData.tipoMembresia || undefined,
        descripcionMembresia: formData.descripcionMembresia || undefined,
        fechaInicio: formData.fechaInicio || undefined,
        fechaFin: formData.fechaFin || undefined,
        activo: formData.activo,
      };

      const res = await fetch(`/api/socios/${socioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar socio");
      }

      onSuccess("Socio actualizado exitosamente");
    } catch (err: any) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <p>Cargando datos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Editar Socio</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-6 overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2">
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
                  <SelectItem value="VISITA">Visita</SelectItem>
                  <SelectItem value="SEMANA">Semana</SelectItem>
                  <SelectItem value="MES_ESTUDIANTE">Mes Estudiante</SelectItem>
                  <SelectItem value="MES_GENERAL">Mes General</SelectItem>
                  <SelectItem value="TRIMESTRE_ESTUDIANTE">
                    Trimestre Estudiante
                  </SelectItem>
                  <SelectItem value="TRIMESTRE_GENERAL">
                    Trimestre General
                  </SelectItem>
                  <SelectItem value="ANUAL_ESTUDIANTE">
                    Anual Estudiante
                  </SelectItem>
                  <SelectItem value="ANUAL_GENERAL">Anual General</SelectItem>
                  <SelectItem value="PROMOCION">Promoción</SelectItem>
                  <SelectItem value="RENACER">Renacer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.activo ? "activo" : "inactivo"}
                onValueChange={(value) =>
                  handleChange("activo", value === "activo")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha de Inicio</Label>
              <Input
                value={formData.fechaInicio}
                onChange={(e) => handleChange("fechaInicio", e.target.value)}
                type="date"
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de Fin</Label>
              <Input
                value={formData.fechaFin}
                onChange={(e) => handleChange("fechaFin", e.target.value)}
                type="date"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 gap-2"
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
