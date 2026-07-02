"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onExit: () => void;
}

// AC9: this story ends here — clicking "Eliminar y Reconstruir" does not
// execute any DELETE. Story 2.2 owns the actual reconstruction.
export function FinalConfirmationStep({ onExit }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [ready, setReady] = useState(false);

  if (ready) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          Confirmación registrada. La ejecución de la reconstrucción se implementará en la Story 2.2.
        </div>
        <Button variant="outline" onClick={onExit} className="self-end">
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="font-bold text-sm text-destructive">Confirmación final — acción irreversible</p>
        </div>
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
        onClick={() => setReady(true)}
        className="self-end"
      >
        Eliminar y Reconstruir
      </Button>
    </div>
  );
}
