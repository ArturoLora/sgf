"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
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
import type {
  PreviewResponseType,
  ParseWarningType,
  DeletionCandidateType,
} from "@/types/api/migracion";

interface Props {
  previewResult: PreviewResponseType;
  // Reconstruction habilita la sección "Empleados no utilizados" — Sync
  // nunca la muestra ni elimina empleados (mode="sync" por default).
  mode?: "sync" | "reconstruction";
  onComplete: (mapping: Record<string, string>, usersToDelete: string[]) => void;
}

export function InconsistencyStep({ previewResult, mode = "sync", onComplete }: Props) {
  const [users, setUsers] = useState<UserRef[]>([]);
  const [report, setReport] = useState<InconsistencyReport | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Crear empleado histórico — estado por fila para idempotencia ante doble
  // click/retry (mismo patrón que ImportSociosStep/ImportCortesStep).
  const [creatingRows, setCreatingRows] = useState<Record<string, boolean>>({});
  const [createdRows, setCreatedRows] = useState<Record<string, boolean>>({});
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Candidatos de eliminación — solo Reconstruction.
  const [candidates, setCandidates] = useState<DeletionCandidateType[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState<string[]>([]);

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

  const currentBlocking = report
    ? report.employeeMappings.filter((e) => !mapping[e.historicalName]).length
    : 0;
  const canProceedNow = report ? currentBlocking === 0 : false;
  const mappingKey = JSON.stringify(mapping);

  // Reconstruction: recalcular candidatos cada vez que el mapping cambia. Un
  // User que pasa a ser destino del mapping deja de listarse — y si estaba
  // marcado para borrar, se remueve automáticamente de usersToDelete.
  useEffect(() => {
    if (mode !== "reconstruction" || !canProceedNow) {
      setCandidates([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setCandidatesLoading(true);
      try {
        const res = await fetch("/api/migracion/reconstruccion/candidatos-eliminacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeMapping: mapping }),
        });
        if (!res.ok) throw new Error("Error al calcular candidatos de eliminación");
        const data: DeletionCandidateType[] = await res.json();
        if (cancelled) return;
        setCandidates(data);
        const candidateIds = new Set(data.map((c) => c.id));
        setUsersToDelete((prev) => prev.filter((id) => candidateIds.has(id)));
      } catch {
        if (!cancelled) setCandidates([]);
      } finally {
        if (!cancelled) setCandidatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mappingKey ya es la serialización estable de `mapping`
  }, [mode, canProceedNow, mappingKey]);

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

  async function handleCreateEmployee(historicalName: string) {
    if (creatingRows[historicalName] || createdRows[historicalName]) return;
    setCreatingRows((prev) => ({ ...prev, [historicalName]: true }));
    setCreateErrors((prev) => {
      const next = { ...prev };
      delete next[historicalName];
      return next;
    });
    try {
      const res = await fetch("/api/migracion/reconstruccion/empleados-historicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historicalName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const newUser: UserRef = await res.json();
      setUsers((prev) => [...prev, newUser]);
      setMapping((prev) => ({ ...prev, [historicalName]: newUser.id }));
      setCreatedRows((prev) => ({ ...prev, [historicalName]: true }));
    } catch (e) {
      setCreateErrors((prev) => ({
        ...prev,
        [historicalName]: e instanceof Error ? e.message : "Error al crear empleado",
      }));
    } finally {
      setCreatingRows((prev) => ({ ...prev, [historicalName]: false }));
    }
  }

  function handleToggleUserToDelete(userId: string, checked: boolean) {
    setUsersToDelete((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)));
  }

  function handleContinue() {
    onComplete(mapping, mode === "reconstruction" ? usersToDelete : []);
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
              const wasCreated = Boolean(createdRows[entry.historicalName]);
              const isCreating = Boolean(creatingRows[entry.historicalName]);
              const createError = createErrors[entry.historicalName];

              return (
                <div
                  key={entry.historicalName}
                  className="flex flex-col gap-2 border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    {/* Historical name + badge */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-sm font-medium truncate">
                        {entry.historicalName}
                      </span>
                      {isMapped ? (
                        wasCreated ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 shrink-0">
                            Creado
                          </Badge>
                        ) : wasAutoMapped ? (
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
                          {!resolvedUser.isActive && " (inactivo)"}
                        </span>
                      )}
                    </div>

                    {/* User dropdown */}
                    <div className="w-full sm:w-56 shrink-0">
                      <Select
                        value={resolvedId ?? ""}
                        onValueChange={(val) =>
                          handleUserSelect(entry.historicalName, val === "__CLEAR__" ? "" : val)
                        }
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
                              {!u.isActive && " (Inactivo)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!isMapped && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isCreating}
                        onClick={() => handleCreateEmployee(entry.historicalName)}
                        className="shrink-0"
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Creando…
                          </>
                        ) : (
                          "Crear nuevo empleado"
                        )}
                      </Button>
                    )}
                  </div>
                  {createError && (
                    <p className="text-xs text-destructive">{createError}</p>
                  )}
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

      {/* ── Empleados no utilizados (solo Reconstruction) ────────────────── */}
      {mode === "reconstruction" && canProceedNow && (
        <section className="rounded-lg border border-border p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-sm">Empleados no utilizados en esta reconstrucción</h2>
          <p className="text-xs text-muted-foreground">
            Eliminar es opcional. Ningún empleado viene seleccionado por default.
          </p>

          {candidatesLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculando candidatos…
            </p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ningún empleado sobrante — todos están en uso por el mapeo actual.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {candidates.map((c) => (
                <label
                  key={c.id}
                  className="flex items-start gap-3 rounded border border-border p-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={usersToDelete.includes(c.id)}
                    onChange={(e) => handleToggleUserToDelete(c.id, e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      <Badge
                        className={
                          c.isActive
                            ? "bg-amber-100 text-amber-800 border-amber-200 shrink-0"
                            : "bg-muted text-muted-foreground border-border shrink-0"
                        }
                      >
                        {c.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {c.shiftsCount} turno{c.shiftsCount !== 1 ? "s" : ""}, {c.movementsCount}{" "}
                      movimiento{c.movementsCount !== 1 ? "s" : ""}, {c.withdrawalsCount} retiro
                      {c.withdrawalsCount !== 1 ? "s" : ""} registrados
                    </span>
                    {c.isActive && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Este empleado está activo — verifica antes de eliminar
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>
      )}

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
