"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Settings } from "lucide-react";

interface AjusteModalProps {
  productoId: number;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

export default function AjusteModal({
  productoId,
  onClose,
  onSuccess,
  onError,
}: AjusteModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [producto, setProducto] = useState<any>(null);
  const [formData, setFormData] = useState({
    cantidad: "",
    ubicacion: "GYM" as "GYM" | "BODEGA",
    observaciones: "",
  });

  useEffect(() => {
    cargarProducto();
  }, [productoId]);

  const cargarProducto = async () => {
    try {
      const res = await fetch(`/api/productos/${productoId}`);
      if (!res.ok) throw new Error("Error al cargar producto");
      const data = await res.json();
      setProducto(data);
    } catch (err) {
      onError("Error al cargar los datos del producto");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!formData.cantidad || formData.cantidad === "0") {
      onError("Ingresa una cantidad válida");
      return;
    }

    if (!formData.observaciones) {
      onError("Las observaciones son requeridas para ajustes");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/inventario/ajuste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoId,
          cantidad: Number(formData.cantidad),
          ubicacion: formData.ubicacion,
          observaciones: formData.observaciones,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al realizar ajuste");
      }

      onSuccess("Ajuste realizado exitosamente");
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

  const stockActual =
    formData.ubicacion === "BODEGA"
      ? producto.existenciaBodega
      : producto.existenciaGym;
  const stockNuevo = stockActual + Number(formData.cantidad || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ajuste de Inventario</CardTitle>
              <p className="text-sm text-gray-500 mt-1">{producto.nombre}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Stock Bodega</p>
                  <p className="text-2xl font-bold">
                    {producto.existenciaBodega}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Stock Gym</p>
                  <p className="text-2xl font-bold">{producto.existenciaGym}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Ubicación</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={formData.ubicacion === "GYM" ? "default" : "outline"}
                onClick={() => handleChange("ubicacion", "GYM")}
              >
                Gym
              </Button>
              <Button
                type="button"
                variant={
                  formData.ubicacion === "BODEGA" ? "default" : "outline"
                }
                onClick={() => handleChange("ubicacion", "BODEGA")}
              >
                Bodega
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cantidad de Ajuste</Label>
            <Input
              type="number"
              value={formData.cantidad}
              onChange={(e) => handleChange("cantidad", e.target.value)}
              placeholder="Usa + para aumentar, - para disminuir"
            />
            <p className="text-xs text-gray-500">
              Valores positivos aumentan, negativos disminuyen
            </p>
          </div>

          {formData.cantidad && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700">Stock Actual</p>
                    <p className="text-xl font-bold text-blue-900">
                      {stockActual}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">Stock Nuevo</p>
                    <p
                      className={`text-xl font-bold ${
                        stockNuevo < 0 ? "text-red-600" : "text-blue-900"
                      }`}
                    >
                      {stockNuevo}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label>
              Observaciones <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.observaciones}
              onChange={(e) => handleChange("observaciones", e.target.value)}
              placeholder="Motivo del ajuste (requerido)"
            />
          </div>

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
              disabled={saving}
            >
              <Settings className="h-4 w-4" />
              {saving ? "Procesando..." : "Realizar Ajuste"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
