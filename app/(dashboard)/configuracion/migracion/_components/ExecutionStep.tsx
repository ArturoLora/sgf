"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ValidationReportStep } from "./ValidationReportStep";
import type { MemberPreviewType, ShiftDetailType, ReconstructionExecutionResultType } from "@/types/api/migracion";
import { partitionByByteBudget, estimateJsonBytes } from "@/modules/migration/domain/upload-batching";

interface Props {
  members: MemberPreviewType[];
  shifts: ShiftDetailType[];
  employeeMapping: Record<string, string>;
  usersToDelete: string[];
  reimportProducts: boolean;
  restoreCommand: string | null;
  expectedMembers: number;
  expectedShifts: number;
  onExit: () => void;
}

export function ExecutionStep({
  members,
  shifts,
  employeeMapping,
  usersToDelete,
  reimportProducts,
  restoreCommand,
  expectedMembers,
  expectedShifts,
  onExit,
}: Props) {
  const [result, setResult] = useState<ReconstructionExecutionResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Los sub-batches de `stage` son solo transporte de `shifts` — una sola
  // ejecución lógica de Reconstruction. `finalize` corre executeReconstruction
  // EXACTAMENTE UNA VEZ, con el conjunto global reconstruido server-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const importId = crypto.randomUUID();
        const partition = partitionByByteBudget(shifts, estimateJsonBytes);
        const batches = partition.map((idxs) => idxs.map((i) => shifts[i]));

        for (let i = 0; i < batches.length; i++) {
          if (cancelled) return;
          setBatchProgress({ current: i + 1, total: batches.length });
          const res = await fetch("/api/migracion/reconstruccion/ejecutar/stage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ importId, batchIndex: i, totalBatches: batches.length, shifts: batches[i] }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error ?? `HTTP ${res.status}`);
          }
        }

        if (cancelled) return;
        const res = await fetch("/api/migracion/reconstruccion/ejecutar/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ importId, members, employeeMapping, reimportProducts, usersToDelete }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const data: ReconstructionExecutionResultType = await res.json();
        if (!cancelled) setResult(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error de red");
      } finally {
        if (!cancelled) setBatchProgress(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-lg border border-border p-6 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
          <p className="text-sm font-medium">
            Eliminando datos... → Importando socios... → Importando cortes... → Finalizando...
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Este proceso puede tardar varios minutos según el volumen de archivos.
        </p>
        {batchProgress && batchProgress.total > 1 && (
          <p className="text-xs text-muted-foreground">
            Lote {batchProgress.current} de {batchProgress.total}
          </p>
        )}
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="font-bold text-sm text-destructive">
              Reconstrucción interrumpida — fase: {result.failedPhase}
            </p>
          </div>
          <p className="text-sm text-destructive/90">{result.failureMessage}</p>
          {restoreCommand && (
            <p className="text-xs font-mono text-destructive/80 bg-destructive/5 rounded p-2">
              {restoreCommand}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={onExit} className="self-end">
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <ValidationReportStep
      result={result}
      expectedMembers={expectedMembers}
      expectedShifts={expectedShifts}
      onExit={onExit}
    />
  );
}
