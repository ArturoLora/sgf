"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BackupResultType } from "@/types/api/migracion";

type Phase = "checking" | "available" | "generating" | "success" | "failed" | "unavailable";

interface Props {
  onContinue: (restoreCommand: string | null) => void;
}

export function BackupStep({ onContinue }: Props) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [backupResult, setBackupResult] = useState<BackupResultType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/migracion/reconstruccion/backup-status");
        const data = await res.json();
        if (cancelled) return;
        setPhase(data.available ? "available" : "unavailable");
      } catch {
        if (!cancelled) setPhase("unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerateBackup() {
    setPhase("generating");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/migracion/reconstruccion/backup", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data: BackupResultType = await res.json();
      setBackupResult(data);
      setPhase("success");
    } catch (e) {
      // AC6: a failed execution falls back to the same acknowledgment path
      // as "pg_dump unavailable" — never claim success it didn't achieve.
      setErrorMsg(e instanceof Error ? e.message : "No se pudo generar el respaldo");
      setPhase("failed");
    }
  }

  const canContinue = phase === "success" || ((phase === "unavailable" || phase === "failed") && acknowledged);

  if (phase === "checking") {
    return (
      <div className="rounded-lg border border-border p-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
        <p className="text-sm font-medium">Verificando disponibilidad de respaldo automático...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {phase === "available" && (
        <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
          <p className="text-sm">
            El entorno tiene respaldo automático disponible. Genera el respaldo antes de continuar.
          </p>
          <Button onClick={handleGenerateBackup} className="self-start">
            Generar Respaldo Ahora
          </Button>
        </div>
      )}

      {phase === "generating" && (
        <div className="rounded-lg border border-border p-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
          <p className="text-sm font-medium">Generando respaldo...</p>
        </div>
      )}

      {phase === "success" && backupResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <p className="font-semibold text-sm text-green-800">Respaldo generado</p>
          </div>
          <p className="text-xs text-green-900 mt-1">Archivo: {backupResult.filePath}</p>
          <p className="text-xs text-green-900">
            Tamaño: {(backupResult.fileSizeBytes / 1024).toFixed(1)} KB
          </p>
          <p className="text-xs text-green-900 font-mono mt-1">{backupResult.restoreCommand}</p>
        </div>
      )}

      {(phase === "unavailable" || phase === "failed") && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              {phase === "failed" && errorMsg && (
                <p className="text-xs text-amber-800 mb-1">El respaldo automático falló: {errorMsg}</p>
              )}
              <p className="text-sm text-amber-900">
                No es posible generar un respaldo automático en este entorno. Entiendo que soy responsable
                de recuperar los datos si la reconstrucción falla.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            Confirmo que entiendo el riesgo
          </label>
        </div>
      )}

      <Button
        onClick={() => onContinue(backupResult?.restoreCommand ?? null)}
        disabled={!canContinue}
        className="self-end"
      >
        Continuar
      </Button>
    </div>
  );
}
