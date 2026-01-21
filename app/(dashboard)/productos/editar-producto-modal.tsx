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

interface EditarProductoModalProps {
  productoId: number;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

export default function EditarProductoModal({
  productoId,
  onClose,
  onSuccess,
  onError,
}: EditarProductoModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    precioVenta: "",
    existenciaMin: "",
    activo: true,
  });

  useEffect(() => {
    cargarProducto();
  }, [productoId]);

  const cargarProducto = async () => {
    try {
      const res = await fetch(`/api/productos/${productoId}`);
      if (!res.ok) throw new Error("Error al cargar producto");

      const producto = await res.json();
      setFormData({
        nombre: producto.nombre,
        precioVenta: producto.precioVenta.toString(),
        existenciaMin: producto.existenciaMin.toString(),
        activo: producto.activo,
      });
    } catch (err) {
      onError("Error al cargar los datos del producto");
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
      const res = await fetch(`/api/productos/${productoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre,
          precioVenta: Number(formData.precioVenta),
          existenciaMin: Number(formData.existenciaMin),
          activo: formData.activo,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar producto");
      }

      onSuccess("Producto actualizado exitosamente");
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
            <p>Cargando datos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Editar Producto</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={formData.nombre}
              onChange={(e) => handleChange("nombre", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Precio de Venta</Label>
            <Input
              type="number"
              value={formData.precioVenta}
              onChange={(e) => handleChange("precioVenta", e.target.value)}
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label>Stock Mínimo</Label>
            <Input
              type="number"
              value={formData.existenciaMin}
              onChange={(e) => handleChange("existenciaMin", e.target.value)}
            />
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
