"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onConfirm: (reimportProducts: boolean) => void;
}

export function FinalConfirmationStep({ onConfirm }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [reimportProducts, setReimportProducts] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="font-bold text-sm text-destructive">Confirmación final — acción irreversible</p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={reimportProducts}
            onChange={(e) => setReimportProducts(e.target.checked)}
          />
          Reimportar catálogo de productos desde los archivos (opcional — si no se marca, el catálogo
          actual se conserva)
        </label>
        <label className="flex items-start gap-2 text-sm text-destructive">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Entiendo que esta acción eliminará los datos operativos de forma permanente
        </label>
      </div>
      <Button
        variant="destructive"
        disabled={!confirmed}
        onClick={() => onConfirm(reimportProducts)}
        className="self-end"
      >
        Eliminar y Reconstruir
      </Button>
    </div>
  );
}
