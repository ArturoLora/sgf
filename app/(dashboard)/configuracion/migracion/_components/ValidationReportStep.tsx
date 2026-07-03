"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ReconstructionExecutionResultType,
  ReconstructionValidationType,
} from "@/types/api/migracion";

interface Props {
  result: ReconstructionExecutionResultType;
  expectedMembers: number;
  expectedShifts: number;
  onExit: () => void;
}

const BADGE_CONFIG = {
  green: { label: "Reconstrucción válida", icon: CheckCircle2, className: "bg-green-50 border-green-200 text-green-900" },
  amber: { label: "Reconstrucción con advertencias", icon: AlertTriangle, className: "bg-amber-50 border-amber-300 text-amber-900" },
  red: { label: "Reconstrucción con inconsistencias", icon: XCircle, className: "bg-red-50 border-red-300 text-red-900" },
} as const;

function buildReportText(
  result: ReconstructionExecutionResultType,
  validation: ReconstructionValidationType,
): string {
  const lines: string[] = [];
  lines.push("REPORTE DE RECONSTRUCCIÓN — SGF");
  lines.push(`Fecha: ${new Date().toLocaleString("es-MX")}`);
  lines.push(`Resultado: ${BADGE_CONFIG[validation.severity].label}`);
  lines.push("");
  lines.push("Conteos:");
  lines.push(`  Socios: ${validation.actualMembers} (esperados: ${validation.expectedMembers})`);
  lines.push(`  Cortes: ${validation.actualShifts} (esperados: ${validation.expectedShifts})`);
  lines.push(`  Movimientos: ${result.shiftsResult?.movementsCreated ?? 0}`);
  lines.push(`  Retiros: ${result.shiftsResult?.withdrawalsCreated ?? 0}`);
  if (result.productResult) {
    lines.push(`  Productos reimportados: ${result.productResult.productsRecreated} (taxRate preservado en ${result.productResult.taxRatesPreserved})`);
  }
  lines.push("");
  lines.push("Integridad referencial:");
  lines.push(`  Huérfanos detectados: ${validation.orphanCount}`);
  validation.orphanDetails.forEach((d) => lines.push(`    - ${d}`));
  lines.push("");
  if (result.finalizeResult?.consistencyWarnings.length) {
    lines.push("Advertencias financieras por turno:");
    result.finalizeResult.consistencyWarnings.forEach((w) => lines.push(`  - ${w}`));
    lines.push("");
  }
  if (result.shiftsResult?.warnings.length) {
    lines.push("Advertencias de campos legacy:");
    result.shiftsResult.warnings.forEach((w) => lines.push(`  - ${w.folio}: ${w.message}`));
    lines.push("");
  }
  if (result.finalizeWarning) {
    lines.push(`Advertencia de finalización: ${result.finalizeWarning}`);
  }
  return lines.join("\n");
}

export function ValidationReportStep({ result, expectedMembers, expectedShifts, onExit }: Props) {
  const [validation, setValidation] = useState<ReconstructionValidationType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/migracion/reconstruccion/validar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedMembers,
            expectedShifts,
            consistencyWarningCount: result.finalizeResult?.consistencyWarnings.length ?? 0,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const data: ReconstructionValidationType = await res.json();
        if (!cancelled) setValidation(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error de red");
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

  if (!validation) {
    return (
      <div className="rounded-lg border border-border p-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
        <p className="text-sm font-medium">Validando la reconstrucción...</p>
      </div>
    );
  }

  const badge = BADGE_CONFIG[validation.severity];
  const BadgeIcon = badge.icon;
  const financialWarnings = result.finalizeResult?.consistencyWarnings ?? [];
  const legacyWarnings = result.shiftsResult?.warnings ?? [];

  function handleExport() {
    // Safe: this function is only reachable after the `!validation` early
    // return above, but TS doesn't narrow state captured by a nested closure.
    const text = buildReportText(result, validation!);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-reconstruccion-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-lg border p-4 flex items-center gap-2 ${badge.className}`}>
        <BadgeIcon className="h-5 w-5 shrink-0" />
        <p className="font-semibold text-sm">{badge.label}</p>
      </div>

      <div className="rounded-lg border border-border p-4 flex flex-col gap-2 text-sm">
        <p className="font-medium">Conteos</p>
        <p className="text-xs text-muted-foreground">
          Socios: {validation.actualMembers} / {validation.expectedMembers} esperados
          {!validation.memberCountMatches && " — no coincide"} · Cortes: {validation.actualShifts} /{" "}
          {validation.expectedShifts} esperados{!validation.shiftCountMatches && " — no coincide"}
        </p>
        <p className="text-xs text-muted-foreground">
          {result.shiftsResult?.movementsCreated ?? 0} movimientos · {result.shiftsResult?.withdrawalsCreated ?? 0} retiros
          {result.productResult ? ` · ${result.productResult.productsRecreated} productos reimportados` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          Integridad referencial: {validation.orphanCount === 0 ? "0 huérfanos confirmados" : `${validation.orphanCount} huérfanos detectados`}
        </p>
        {validation.orphanDetails.map((d, i) => (
          <p key={i} className="text-xs text-red-800">{d}</p>
        ))}
      </div>

      {financialWarnings.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 list-none">
            <span className="flex-1">
              {financialWarnings.length} advertencia{financialWarnings.length !== 1 ? "s" : ""} financiera
              {financialWarnings.length !== 1 ? "s" : ""} por turno
            </span>
            <span className="text-xs text-muted-foreground">ver detalle</span>
          </summary>
          <div className="mt-2 ml-2 flex flex-col gap-1">
            {financialWarnings.map((w, i) => (
              <div key={i} className="text-xs text-muted-foreground border-l-2 border-amber-300 pl-3 py-1">{w}</div>
            ))}
          </div>
        </details>
      )}

      {legacyWarnings.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 list-none">
            <span className="flex-1">{legacyWarnings.length} advertencia(s) de campos legacy</span>
            <span className="text-xs text-muted-foreground">ver detalle</span>
          </summary>
          <div className="mt-2 ml-2 flex flex-col gap-1">
            {legacyWarnings.map((w, i) => (
              <div key={i} className="text-xs text-muted-foreground border-l-2 border-amber-300 pl-3 py-1">
                <span className="font-mono font-medium text-foreground">{w.folio}</span> — {w.message}
              </div>
            ))}
          </div>
        </details>
      )}

      {result.finalizeWarning && (
        <p className="text-xs text-amber-800 flex items-start gap-1">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {result.finalizeWarning}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleExport}>
          Exportar Reporte
        </Button>
        <Button onClick={onExit}>Volver al inicio</Button>
      </div>
    </div>
  );
}
