"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DollarSign, Loader2 } from "lucide-react";

interface AbrirCorteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AbrirCorteModal({
  onClose,
  onSuccess,
}: AbrirCorteModalProps) {
  const [fondoInicial, setFondoInicial] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const monto = parseFloat(fondoInicial);
    if (isNaN(monto) || monto < 0) {
      setError("Ingresa un monto válido");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialCash: monto }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al abrir corte");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Abrir Corte de Caja
          </DialogTitle>
          <DialogDescription>
            Ingresa el fondo inicial en efectivo para comenzar el turno
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fondoInicial">Fondo Inicial *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="fondoInicial"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
                className="pl-7"
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500">
              Monto en efectivo con el que inicias el turno
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Abrir Corte
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
