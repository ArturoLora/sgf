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
import { X, UserPlus, Calendar } from "lucide-react";

interface RenovarMembresiaModalProps {
  socioId: number;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

export default function RenovarMembresiaModal({
  socioId,
  onClose,
  onSuccess,
  onError,
}: RenovarMembresiaModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [socio, setSocio] = useState<any>(null);
  const [formData, setFormData] = useState({
    tipoMembresia: "",
    descripcionMembresia: "",
    fechaInicio: new Date().toISOString().split("T")[0],
    formaPago: "EFECTIVO" as
      | "EFECTIVO"
      | "TARJETA_DEBITO"
      | "TARJETA_CREDITO"
      | "TRANSFERENCIA",
  });

  useEffect(() => {
    cargarSocio();
  }, [socioId]);

  const cargarSocio = async () => {
    try {
      const res = await fetch(`/api/socios/${socioId}`);
      if (!res.ok) throw new Error("Error al cargar socio");

      const data = await res.json();
      setSocio(data);

      // Pre-llenar con el tipo de membresía actual
      if (data.tipoMembresia) {
        setFormData((prev) => ({
          ...prev,
          tipoMembresia: data.tipoMembresia,
        }));
      }
    } catch (err) {
      onError("Error al cargar los datos del socio");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const calcularFechaFin = () => {
    if (!formData.tipoMembresia || !formData.fechaInicio) return null;

    const inicio = new Date(formData.fechaInicio);
    const fin = new Date(inicio);

    switch (formData.tipoMembresia) {
      case "VISITA":
        return inicio;
      case "SEMANA":
        fin.setDate(fin.getDate() + 7);
        break;
      case "MES_ESTUDIANTE":
      case "MES_GENERAL":
        fin.setMonth(fin.getMonth() + 1);
        break;
      case "TRIMESTRE_ESTUDIANTE":
      case "TRIMESTRE_GENERAL":
        fin.setMonth(fin.getMonth() + 3);
        break;
      case "ANUAL_ESTUDIANTE":
      case "ANUAL_GENERAL":
        fin.setFullYear(fin.getFullYear() + 1);
        break;
      case "PROMOCION":
      case "RENACER":
        fin.setMonth(fin.getMonth() + 1);
        break;
      default:
        return null;
    }

    return fin;
  };

  const handleSubmit = async () => {
    if (!formData.tipoMembresia) {
      onError("Selecciona un tipo de membresía");
      return;
    }

    setSaving(true);

    try {
      // Renovar membresía (esto también crea la venta automáticamente en el backend)
      const payload = {
        socioId,
        tipoMembresia: formData.tipoMembresia,
        descripcionMembresia: formData.descripcionMembresia || undefined,
        fechaInicio: formData.fechaInicio || undefined,
        formaPago: formData.formaPago,
      };

      const res = await fetch("/api/socios/renovar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al renovar membresía");
      }

      onSuccess("Membresía renovada y venta registrada");
    } catch (err: any) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <p>Cargando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fechaFin = calcularFechaFin();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Renovar Membresía</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {socio?.nombre || socio?.numeroSocio}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          {/* Estado Actual */}
          {socio?.tipoMembresia && (
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-2">Membresía Actual</p>
                <div className="space-y-1">
                  <p className="font-medium">
                    {socio.tipoMembresia.replace("_", " ")}
                  </p>
                  {socio.fechaFin && (
                    <p className="text-sm text-red-600">
                      Venció: {new Date(socio.fechaFin).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label>
              Tipo de Membresía <span className="text-red-500">*</span>
            </Label>
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
                <SelectItem value="MES_GENERAL">Mes General - $540</SelectItem>
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

          <div className="space-y-2">
            <Label>Fecha de Inicio</Label>
            <Input
              value={formData.fechaInicio}
              onChange={(e) => handleChange("fechaInicio", e.target.value)}
              type="date"
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Input
              value={formData.descripcionMembresia}
              onChange={(e) =>
                handleChange("descripcionMembresia", e.target.value)
              }
              placeholder="EFECTIVO MENSUALIDAD GENERAL ENE 2026"
            />
          </div>

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

          {/* Vista Previa */}
          {fechaFin && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">
                    Nueva Vigencia
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700">Inicio</p>
                    <p className="font-semibold text-blue-900">
                      {new Date(formData.fechaInicio).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">Vencimiento</p>
                    <p className="font-semibold text-blue-900">
                      {fechaFin.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 pt-2">
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
              disabled={saving || !formData.tipoMembresia}
            >
              <UserPlus className="h-4 w-4" />
              {saving ? "Renovando..." : "Renovar Membresía"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
