"use client";

import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  PreviewResponseType,
  SyncMembersResultType,
  SyncShiftsResponseType,
} from "@/types/api/migracion";

interface Props {
  previewResult: PreviewResponseType;
  syncResult: SyncMembersResultType | null;
  syncShiftsResult: SyncShiftsResponseType | null;
  onFinish: () => void;
}

export function FinalReportStep({ previewResult, syncResult, syncShiftsResult, onFinish }: Props) {
  const expectedMembers = previewResult.members.length;
  const expectedShifts = previewResult.shifts.length;
  const successfulShifts = syncShiftsResult
    ? syncShiftsResult.shiftsCreated + syncShiftsResult.shiftsUpdated
    : 0;

  const finalize = syncShiftsResult?.finalize ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <p className="font-semibold text-sm">Modo Sincronización — sin borrado de datos previos</p>
        </div>

        {syncResult && (
          <div className="text-sm">
            <p className="font-medium">Socios</p>
            <p className="text-muted-foreground text-xs">
              {syncResult.created} nuevos · {syncResult.updated} actualizados
              {syncResult.failed > 0 ? ` · ${syncResult.failed} fallidos` : ""} — {expectedMembers}{" "}
              esperados según el archivo
            </p>
          </div>
        )}

        {syncShiftsResult && (
          <div className="text-sm">
            <p className="font-medium">Cortes</p>
            <p className="text-muted-foreground text-xs">
              {syncShiftsResult.shiftsCreated} nuevos · {syncShiftsResult.shiftsUpdated} actualizados
              {syncShiftsResult.shiftsFailed > 0 ? ` · ${syncShiftsResult.shiftsFailed} fallidos` : ""} —{" "}
              {successfulShifts} de {expectedShifts} cortes de los archivos subidos
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Movimientos: {syncShiftsResult.salesMovements} ventas · {syncShiftsResult.adjustmentMovements}{" "}
              ajustes · {syncShiftsResult.entryMovements} entradas · {syncShiftsResult.withdrawalsCreated}{" "}
              retiros de caja
            </p>
          </div>
        )}

        {finalize && (
          <div className="text-sm">
            <p className="font-medium">Estado final del sistema</p>
            {finalize.gymStockSkipped ? (
              <p className="text-amber-700 text-xs flex items-start gap-1 mt-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {finalize.gymStockSkipReason}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                {finalize.gymStockUpdated} producto{finalize.gymStockUpdated !== 1 ? "s" : ""} con stock
                actualizado desde el corte más reciente importado
              </p>
            )}
            {finalize.maxTicketImported && (
              <p className="text-muted-foreground text-xs mt-1 flex items-start gap-1">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                El ticket más alto importado es {finalize.maxTicketImported}.
              </p>
            )}
          </div>
        )}

        {finalize && finalize.consistencyWarnings.length > 0 && (
          <details className="group mt-1">
            <summary className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 list-none">
              <span className="flex-1">
                {finalize.consistencyWarnings.length} advertencia
                {finalize.consistencyWarnings.length !== 1 ? "s" : ""} de consistencia
              </span>
              <span className="text-xs text-muted-foreground">ver detalle</span>
            </summary>
            <div className="mt-2 ml-2 flex flex-col gap-1">
              {finalize.consistencyWarnings.map((w, i) => (
                <div key={i} className="text-xs text-muted-foreground border-l-2 border-amber-300 pl-3 py-1">
                  {w}
                </div>
              ))}
            </div>
          </details>
        )}

        {syncShiftsResult && syncShiftsResult.warnings.length > 0 && (
          <details className="group mt-1">
            <summary className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 list-none">
              <span className="flex-1">
                {syncShiftsResult.warnings.length} advertencia
                {syncShiftsResult.warnings.length !== 1 ? "s" : ""} de importación
              </span>
              <span className="text-xs text-muted-foreground">ver detalle</span>
            </summary>
            <div className="mt-2 ml-2 flex flex-col gap-1">
              {syncShiftsResult.warnings.map((w, i) => (
                <div key={i} className="text-xs text-muted-foreground border-l-2 border-amber-300 pl-3 py-1">
                  <span className="font-mono font-medium text-foreground">{w.folio}</span>
                  {" — "}
                  <span className="italic">{w.message}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {syncShiftsResult && syncShiftsResult.errors.length > 0 && (
          <details className="group mt-1">
            <summary className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/5 list-none">
              <span className="flex-1">
                {syncShiftsResult.errors.length} corte{syncShiftsResult.errors.length !== 1 ? "s" : ""} con
                error
              </span>
              <span className="text-xs text-muted-foreground">ver detalle</span>
            </summary>
            <div className="mt-2 ml-2 flex flex-col gap-1">
              {syncShiftsResult.errors.map((err, i) => (
                <div key={i} className="text-xs text-muted-foreground border-l-2 border-destructive/30 pl-3 py-1">
                  <span className="font-mono font-medium text-foreground">{err.folio}</span>
                  {" — "}
                  <span className="italic">{err.reason}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <Button onClick={onFinish} className="self-end">
        Finalizar
      </Button>
    </div>
  );
}
