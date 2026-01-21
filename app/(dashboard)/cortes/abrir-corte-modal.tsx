"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, X } from "lucide-react";

interface AbrirCorteModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

export default function AbrirCorteModal({
  userId,
  onClose,
  onSuccess,
  onError,
}: AbrirCorteModalProps) {
  const [fondoCaja, setFondoCaja] = useState("500");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/cortes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cajeroId: userId,
          fondoCaja: Number(fondoCaja),
          observaciones: observaciones || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al abrir corte");
      }

      onSuccess("Corte abierto exitosamente");
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Abrir Nuevo Corte</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Fondo de Caja Inicial</Label>
            <Input
              type="number"
              value={fondoCaja}
              onChange={(e) => setFondoCaja(e.target.value)}
              placeholder="500"
            />
          </div>
          <div className="space-y-2">
            <Label>Observaciones (opcional)</Label>
            <Input
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Turno matutino"
            />
          </div>
          <div className="flex gap-2">
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
              <Calculator className="h-4 w-4" />
              {loading ? "Abriendo..." : "Abrir Corte"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
