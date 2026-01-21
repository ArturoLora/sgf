"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

interface CrearProductoModalProps {
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

export default function CrearProductoModal({
  onClose,
  onSuccess,
  onError,
}: CrearProductoModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    precioVenta: "",
    existenciaMin: "5",
  });

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!formData.nombre || !formData.precioVenta) {
      onError("El nombre y precio son requeridos");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre,
          precioVenta: Number(formData.precioVenta),
          existenciaMin: Number(formData.existenciaMin),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear producto");
      }

      onSuccess("Producto creado exitosamente");
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Nuevo Producto</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.nombre}
              onChange={(e) => handleChange("nombre", e.target.value)}
              placeholder="Agua 1L"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>
              Precio de Venta <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.precioVenta}
              onChange={(e) => handleChange("precioVenta", e.target.value)}
              placeholder="15.00"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label>Stock Mínimo</Label>
            <Input
              type="number"
              value={formData.existenciaMin}
              onChange={(e) => handleChange("existenciaMin", e.target.value)}
              placeholder="5"
            />
          </div>

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
              <Plus className="h-4 w-4" />
              {loading ? "Creando..." : "Crear Producto"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
