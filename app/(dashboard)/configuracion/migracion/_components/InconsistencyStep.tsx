"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { classifyInconsistencies } from "@/modules/migration/domain/inconsistency-classifier";
import type { InconsistencyReport, UserRef } from "@/modules/migration/domain/domain.types";
import type { PreviewResponseType, ParseWarningType } from "@/types/api/migracion";

interface Props {
  previewResult: PreviewResponseType;
  onComplete: (mapping: Record<string, string>) => void;
}

export function InconsistencyStep({ previewResult, onComplete }: Props) {
  const [users, setUsers] = useState<UserRef[]>([]);
  const [report, setReport] = useState<InconsistencyReport | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { sellerNames, warnings } = previewResult;

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/migracion/users");
        if (!res.ok) throw new Error("Error al cargar usuarios");
        const fetchedUsers: UserRef[] = await res.json();
        setUsers(fetchedUsers);

        const initialReport = classifyInconsistencies(sellerNames, warnings, fetchedUsers);
        setReport(initialReport);

        // Initialize mapping with auto-mapped entries
        const initialMapping: Record<string, string> = {};
        for (const entry of initialReport.employeeMappings) {
          if (entry.isAutoMapped && entry.resolvedUserId) {
            initialMapping[entry.historicalName] = entry.resolvedUserId;
          }
        }
        setMapping(initialMapping);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [sellerNames, warnings]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
        Cargando usuarios y clasificando inconsistencias…
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="rounded-lg border border-destructive p-6 text-sm text-destructive">
        {error ?? "No se pudo clasificar las inconsistencias."}
      </div>
    );
  }

  const currentBlocking = report.employeeMappings.filter(
    (e) => !mapping[e.historicalName],
  ).length;

  const canProceedNow = currentBlocking === 0;

  function handleUserSelect(historicalName: string, userId: string) {
    setMapping((prev) => {
      if (!userId) {
        const next = { ...prev };
        delete next[historicalName];
        return next;
      }
      return { ...prev, [historicalName]: userId };
    });
  }

  function handleContinue() {
    onComplete(mapping);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Status header ─────────────────────────────────────────────── */}
      <StatusHeader
        blocking={currentBlocking}
        totalWarnings={report.totalWarnings}
        canProceed={canProceedNow}
      />

      {/* ── Employee mapping ──────────────────────────────────────────── */}
      <section className="rounded-lg border border-border p-4 flex flex-col gap-4">
        <h2 className="font-semibold text-sm">Cajeros / Vendedores detectados</h2>

        {report.employeeMappings.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Sin cajeros/vendedores detectados
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {report.employeeMappings.map((entry) => {
              const resolvedId = mapping[entry.historicalName];
              const resolvedUser = users.find((u) => u.id === resolvedId);
              const isMapped = Boolean(resolvedId);
              const wasAutoMapped = entry.isAutoMapped && isMapped;

              return (
                <div
                  key={entry.historicalName}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                >
                  {/* Historical name + badge */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-sm font-medium truncate">
                      {entry.historicalName}
                    </span>
                    {isMapped ? (
                      wasAutoMapped ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200 shrink-0">
                          Auto-mapeado
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 border-green-200 shrink-0">
                          Mapeado
                        </Badge>
                      )
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 shrink-0">
                        Requiere mapeo
                      </Badge>
                    )}
                    {resolvedUser && (
                      <span className="text-xs text-muted-foreground truncate">
                        → {resolvedUser.name}
                      </span>
                    )}
                  </div>

                  {/* User dropdown */}
                  <div className="w-full sm:w-56 shrink-0">
                    <Select
                      value={resolvedId ?? ""}
                      onValueChange={(val) => handleUserSelect(entry.historicalName, val === "__CLEAR__" ? "" : val)}
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Seleccionar usuario…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__CLEAR__" className="text-muted-foreground">
                          Sin asignar
                        </SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Parse warnings ───────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border p-4 flex flex-col gap-3">
        <h2 className="font-semibold text-sm">Advertencias de parseo</h2>

        {report.totalWarnings === 0 ? (
          <p className="text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Sin advertencias de parseo
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <WarningSection
              title="Advertencias de membresía"
              warnings={report.membershipWarnings}
              defaultOpen={report.membershipWarnings.length > 0}
            />
            <WarningSection
              title="Advertencias de forma de pago"
              warnings={report.paymentMethodWarnings}
              defaultOpen={report.paymentMethodWarnings.length > 0}
            />
            <WarningSection
              title="Advertencias de fechas"
              warnings={report.dateWarnings}
              defaultOpen={report.dateWarnings.length > 0}
            />
            {report.otherWarnings.length > 0 && (
              <WarningSection
                title="Otras advertencias"
                warnings={report.otherWarnings}
                defaultOpen={false}
              />
            )}
          </div>
        )}
      </section>

      {/* ── Blocking message + Continue ──────────────────────────────────── */}
      {!canProceedNow && (
        <p className="text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Existen {currentBlocking} cajero{currentBlocking !== 1 ? "s" : ""}/vendedor
          {currentBlocking !== 1 ? "es" : ""} sin mapear. La importación de cortes no puede
          continuar hasta resolver todos los mapeos.
        </p>
      )}

      <Button
        onClick={handleContinue}
        disabled={!canProceedNow}
        className="self-end"
      >
        Continuar
      </Button>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusHeader({
  blocking,
  totalWarnings,
  canProceed,
}: {
  blocking: number;
  totalWarnings: number;
  canProceed: boolean;
}) {
  if (!canProceed) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <p className="text-sm font-medium text-destructive">
          {blocking} acción{blocking !== 1 ? "es" : ""} requerida{blocking !== 1 ? "s" : ""} —
          resuelve los mapeos antes de continuar
        </p>
      </div>
    );
  }

  if (totalWarnings > 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="text-sm font-medium text-amber-800">
          ✓ Listo para continuar — {totalWarnings} advertencia{totalWarnings !== 1 ? "s" : ""}{" "}
          registrada{totalWarnings !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
      <p className="text-sm font-medium text-green-800">
        ✓ Sin inconsistencias — todos los registros están listos
      </p>
    </div>
  );
}

function WarningSection({
  title,
  warnings,
  defaultOpen,
}: {
  title: string;
  warnings: ParseWarningType[];
  defaultOpen: boolean;
}) {
  if (warnings.length === 0) return null;

  return (
    <details open={defaultOpen} className="group">
      <summary className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-muted/50 list-none">
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 shrink-0" />
        {title}
        <span className="ml-auto text-xs text-muted-foreground">
          {warnings.length} advertencia{warnings.length !== 1 ? "s" : ""}
        </span>
      </summary>
      <div className="mt-2 ml-6 flex flex-col gap-1">
        {warnings.map((w, i) => (
          <div key={i} className="text-xs text-muted-foreground border-l-2 border-border pl-3 py-1">
            <span className="font-medium text-foreground">{w.filename}</span>
            {w.row !== undefined && <span> · fila {w.row}</span>}
            {" · "}
            <span className="italic">{w.originalValue}</span>
            {" — "}
            {w.message}
          </div>
        ))}
      </div>
    </details>
  );
}
