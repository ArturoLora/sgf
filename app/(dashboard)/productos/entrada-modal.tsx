"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Package } from "lucide-react";

interface EntradaModalProps {
  productoId: number;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

export default function EntradaModal({
  productoId,
  onClose,
  onSuccess,
  onError,
}: EntradaModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [producto, setProducto] = useState<any>(null);
  const [formData, setFormData] = useState({
    cantidad: "",
    ubicacion: "BODEGA" as "GYM" | "BODEGA",
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
    if (!formData.cantidad || Number(formData.cantidad) <= 0) {
      onError("Ingresa una cantidad válida");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/inventario/entrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoId,
          cantidad: Number(formData.cantidad),
          ubicacion: formData.ubicacion,
          observaciones: formData.observaciones || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al registrar entrada");
      }

      onSuccess("Entrada registrada exitosamente");
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
              <CardTitle>Entrada de Producto</CardTitle>
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
            <Label>Ubicación de Entrada</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={
                  formData.ubicacion === "BODEGA" ? "default" : "outline"
                }
                onClick={() => handleChange("ubicacion", "BODEGA")}
              >
                Bodega
              </Button>
              <Button
                type="button"
                variant={formData.ubicacion === "GYM" ? "default" : "outline"}
                onClick={() => handleChange("ubicacion", "GYM")}
              >
                Gym
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input
              type="number"
              value={formData.cantidad}
              onChange={(e) => handleChange("cantidad", e.target.value)}
              placeholder="0"
              min="1"
            />
          </div>

          {formData.cantidad && Number(formData.cantidad) > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-700">Stock Actual</p>
                    <p className="text-xl font-bold text-green-900">
                      {stockActual}
                    </p>
                  </div>
                  <div>
                    <p className="text-green-700">Stock Nuevo</p>
                    <p className="text-xl font-bold text-green-900">
                      {stockNuevo}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label>Observaciones (opcional)</Label>
            <Input
              value={formData.observaciones}
              onChange={(e) => handleChange("observaciones", e.target.value)}
              placeholder="Proveedor, factura, etc."
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
              <Package className="h-4 w-4" />
              {saving ? "Procesando..." : "Registrar Entrada"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
