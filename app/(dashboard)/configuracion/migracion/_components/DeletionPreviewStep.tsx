"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReconstructionPreviewType } from "@/types/api/migracion";

interface Props {
  onContinue: () => void;
}

export function DeletionPreviewStep({ onContinue }: Props) {
  const [preview, setPreview] = useState<ReconstructionPreviewType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/migracion/reconstruccion/preview");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const data: ReconstructionPreviewType = await res.json();
        if (!cancelled) setPreview(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error de red");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="rounded-lg border border-border p-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
        <p className="text-sm font-medium">Calculando lo que se eliminará y conservará...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <p className="font-semibold text-sm text-destructive">Se eliminarán</p>
        <p className="text-sm text-destructive/90 mt-1">
          {preview.membersToDelete} socios, {preview.shiftsToDelete} cortes, {preview.movementsToDelete}{" "}
          movimientos, {preview.withdrawalsToDelete} retiros de caja.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="font-semibold text-sm">Se conservarán</p>
        <p className="text-sm text-muted-foreground mt-1">
          {preview.usersToPreserve} usuarios (sin modificar), autenticación, sesiones, y configuración del
          sistema.
        </p>
      </div>
      <Button onClick={onContinue} className="self-end">
        Continuar
      </Button>
    </div>
  );
}
