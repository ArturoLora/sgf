"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SyncMembersResultType } from "@/types/api/migracion";

type ImportState = "idle" | "importing" | "done" | "error";

interface Props {
  files: File[];
  totalMembers: number;
  onComplete: (result: SyncMembersResultType) => void;
}

export function ImportSociosStep({ files, totalMembers, onComplete }: Props) {
  const [state, setState] = useState<ImportState>("idle");
  const [result, setResult] = useState<SyncMembersResultType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleImport() {
    setState("importing");
    setErrorMsg(null);

    const fd = new FormData();
    for (const f of files) fd.append("files", f);

    try {
      const res = await fetch("/api/migracion/sync-members", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data: SyncMembersResultType = await res.json();
      setResult(data);
      setState("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error de red");
      setState("error");
    }
  }

  if (state === "idle") {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-border p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="font-semibold text-sm">Importación de socios</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalMembers} socios listos para sincronizar. Esta operación es idempotente — puede
                ejecutarse múltiples veces sin duplicar registros.
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
            Los socios existentes serán actualizados. Los nuevos serán creados. No se eliminará
            ningún registro.
          </div>
        </div>
        <Button onClick={handleImport} className="self-end">
          Iniciar importación de socios
        </Button>
      </div>
    );
  }

  if (state === "importing") {
    return (
      <div className="rounded-lg border border-border p-6 flex items-center gap-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
        <p className="text-sm font-medium">Importando socios ({totalMembers} socios)...</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Error al importar</p>
            <p className="text-xs text-destructive/80 mt-1">{errorMsg}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setState("idle")} className="self-end">
          Reintentar
        </Button>
      </div>
    );
  }

  // done
  if (!result) return null;

  const hasErrors = result.failed > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Result summary */}
      <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <p className="font-semibold text-sm">Importación completada</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Socios nuevos" value={result.created} color="green" />
          <StatCard label="Socios actualizados" value={result.updated} color="blue" />
          <StatCard label="Fallidos" value={result.failed} color={hasErrors ? "red" : "muted"} />
        </div>

        {hasErrors && (
          <details className="group mt-1">
            <summary className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/5 list-none">
              <span className="flex-1">
                {result.failed} registro{result.failed !== 1 ? "s" : ""} con error
              </span>
              <span className="text-xs text-muted-foreground">ver detalle</span>
            </summary>
            <div className="mt-2 ml-2 flex flex-col gap-1">
              {result.errors.map((err, i) => (
                <div
                  key={i}
                  className="text-xs text-muted-foreground border-l-2 border-destructive/30 pl-3 py-1"
                >
                  <span className="font-mono font-medium text-foreground">{err.memberNumber}</span>
                  {" — "}
                  <span className="italic">{err.reason}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <Button onClick={() => onComplete(result)} className="self-end">
        Continuar
      </Button>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "blue" | "red" | "muted";
}) {
  const colorClass =
    color === "green"
      ? "text-green-700 bg-green-50 border-green-200"
      : color === "blue"
        ? "text-blue-700 bg-blue-50 border-blue-200"
        : color === "red"
          ? "text-red-700 bg-red-50 border-red-200"
          : "text-muted-foreground bg-muted/40 border-border";

  return (
    <div className={`rounded-lg border p-3 flex flex-col gap-1 ${colorClass}`}>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}
