"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Users, FileText, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PreviewResponseType, ParseWarningType } from "@/types/api/migracion";
import { partitionByByteBudget, consolidatePreviewBatches } from "@/modules/migration/domain/upload-batching";

interface PreviewStepProps {
  files: File[];
  onPreviewComplete: (result: PreviewResponseType) => void;
}

export function PreviewStep({ files, onPreviewComplete }: PreviewStepProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponseType | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [failedBatchIndex, setFailedBatchIndex] = useState<number | null>(null);
  const batchesRef = useRef<File[][]>([]);
  const partialResultsRef = useRef<PreviewResponseType[]>([]);

  // Batches son solo transporte — el lote completo sigue siendo un único
  // preview lógico. Secuencial (no Promise.all): preserva orden determinista
  // de consolidación, sin razón real para paralelizar.
  async function runBatches(allBatches: File[][], startIndex: number, priorResults: PreviewResponseType[]) {
    const collected = [...priorResults];
    for (let i = startIndex; i < allBatches.length; i++) {
      setBatchProgress({ current: i + 1, total: allBatches.length });
      try {
        const formData = new FormData();
        allBatches[i].forEach((f) => formData.append("files", f));

        const res = await fetch("/api/migracion/preview", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Error ${res.status}`);
        }

        const data: PreviewResponseType = await res.json();
        collected.push(data);
      } catch (err) {
        setFailedBatchIndex(i);
        partialResultsRef.current = collected;
        setError(
          `Error en lote ${i + 1} de ${allBatches.length}: ${err instanceof Error ? err.message : "Error inesperado"}`,
        );
        setLoading(false);
        return;
      }
    }

    setPreview(consolidatePreviewBatches(collected));
    setFailedBatchIndex(null);
    partialResultsRef.current = [];
    setBatchProgress(null);
    setLoading(false);
  }

  useEffect(() => {
    async function fetchPreview() {
      setLoading(true);
      setError(null);
      setFailedBatchIndex(null);
      partialResultsRef.current = [];

      const partition = partitionByByteBudget(files, (f) => f.size);
      const newBatches = partition.map((idxs) => idxs.map((i) => files[i]));
      batchesRef.current = newBatches;
      await runBatches(newBatches, 0, []);
    }

    if (files.length > 0) fetchPreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRetryBatch() {
    if (failedBatchIndex === null) return;
    setLoading(true);
    setError(null);
    await runBatches(batchesRef.current, failedBatchIndex, partialResultsRef.current);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Parseando y transformando registros históricos…</p>
        {batchProgress && batchProgress.total > 1 && (
          <p className="text-xs">
            Lote {batchProgress.current} de {batchProgress.total}
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-destructive">
        <AlertTriangle className="h-8 w-8" />
        <p className="text-sm font-medium">{error}</p>
        {failedBatchIndex !== null ? (
          <Button variant="outline" size="sm" onClick={handleRetryBatch}>
            Reintentar lote {failedBatchIndex + 1}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        )}
      </div>
    );
  }

  if (!preview) return null;

  const hasWarnings = preview.totalWarnings > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary banner */}
      <SummaryBanner preview={preview} />

      {/* Membership type distribution */}
      {Object.keys(preview.membershipTypeDistribution).length > 0 && (
        <DistributionTable distribution={preview.membershipTypeDistribution} />
      )}

      {/* Socios preview table */}
      {preview.members.length > 0 && (
        <MembersTable members={preview.members} />
      )}

      {/* Cortes preview */}
      {preview.shifts.length > 0 && (
        <ShiftsSection shifts={preview.shifts} />
      )}

      {/* Warnings */}
      {hasWarnings && (
        <WarningsList warnings={preview.warnings} />
      )}

      {/* Action */}
      <div className="flex gap-3">
        <Button
          onClick={() => onPreviewComplete(preview)}
          className="flex items-center gap-2"
        >
          Continuar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryBanner({ preview }: { preview: PreviewResponseType }) {
  const { members, shifts, totalWarnings } = preview;
  const totalVentas = shifts.reduce((s, c) => s + c.saleCount, 0);

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-semibold mb-3">Resumen de la previsualización</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Users className="h-4 w-4 text-blue-500" />} label="Socios" value={members.length} />
        <StatCard icon={<FileText className="h-4 w-4 text-emerald-500" />} label="Cortes" value={shifts.length} />
        <StatCard icon={<Package className="h-4 w-4 text-amber-500" />} label="Ventas totales" value={totalVentas} />
        <StatCard
          icon={<AlertTriangle className={`h-4 w-4 ${totalWarnings > 0 ? "text-amber-500" : "text-emerald-500"}`} />}
          label="Advertencias"
          value={totalWarnings}
          highlight={totalWarnings > 0}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10" : "border-border bg-background"}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <p className="text-xl font-bold">{value.toLocaleString("es-MX")}</p>
    </div>
  );
}

function DistributionTable({ distribution }: { distribution: Record<string, number> }) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Distribución de membresías</h3>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tipo</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Cantidad</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">%</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(([type, count]) => (
              <tr key={type} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{type}</td>
                <td className="px-3 py-2 text-right">{count}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {((count / total) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Member = PreviewResponseType["members"][number];

function MembersTable({ members }: { members: Member[] }) {
  const DISPLAY_MAX = 20;
  const shown = members.slice(0, DISPLAY_MAX);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">
        Socios{" "}
        <span className="text-muted-foreground font-normal">
          (mostrando {shown.length} de {members.length})
        </span>
      </h3>
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b bg-muted/40">
              {["#", "Nombre", "Membresía", "Inicio", "Vencimiento", "Activo"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((m) => (
              <tr key={m.memberNumber} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-3 py-1.5 font-mono text-xs">{m.memberNumber}</td>
                <td className="px-3 py-1.5">{m.name}</td>
                <td className="px-3 py-1.5">
                  {m.membershipType ? (
                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                      {m.membershipType}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">
                      {m.membershipDescription ? "sin mapeo" : "—"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">
                  {m.startDate ? new Date(m.startDate).toLocaleDateString("es-MX") : "—"}
                </td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">
                  {m.endDate ? new Date(m.endDate).toLocaleDateString("es-MX") : "—"}
                </td>
                <td className="px-3 py-1.5">
                  {m.isActive ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Inactivo</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type ShiftSummary = PreviewResponseType["shifts"][number];

function ShiftsSection({ shifts }: { shifts: ShiftSummary[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Cortes de caja</h3>
      <div className="flex flex-col gap-2">
        {shifts.map((s) => (
          <div key={s.folio} className="rounded-lg border p-4 flex items-start gap-3">
            <FileText className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{s.folio}</span>
                {s.openingDate && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.openingDate).toLocaleDateString("es-MX")}
                    {s.openingTime && ` ${s.openingTime}`}
                  </span>
                )}
              </div>
              <div className="mt-1 flex gap-4 text-xs text-muted-foreground flex-wrap">
                <span>{s.saleCount} ventas</span>
                {s.cancelledCount > 0 && <span>{s.cancelledCount} canceladas</span>}
                <span>{s.membershipSaleCount} membresías</span>
                <span>{s.inventoryCount} SKUs</span>
                {s.withdrawalCount > 0 && <span>{s.withdrawalCount} retiros</span>}
              </div>
              {s.legacyNotes && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{s.legacyNotes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WarningsList({ warnings }: { warnings: ParseWarningType[] }) {
  // Group by filename
  const byFile = warnings.reduce<Record<string, ParseWarningType[]>>((acc, w) => {
    const key = w.filename;
    if (!acc[key]) acc[key] = [];
    acc[key].push(w);
    return acc;
  }, {});

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        Advertencias de parseo ({warnings.length})
      </h3>
      <div className="flex flex-col gap-3">
        {Object.entries(byFile).map(([filename, fileWarnings]) => (
          <div key={filename} className="rounded-lg border border-amber-200 dark:border-amber-800/40 overflow-hidden">
            <div className="bg-amber-50 dark:bg-amber-900/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 border-b border-amber-200 dark:border-amber-800/40">
              {filename} — {fileWarnings.length} advertencia{fileWarnings.length !== 1 ? "s" : ""}
            </div>
            <ul className="divide-y divide-border">
              {fileWarnings.slice(0, 50).map((w, i) => (
                <li key={i} className="px-3 py-2 text-xs">
                  <span className="font-medium">{w.field}</span>
                  {w.row !== undefined && <span className="text-muted-foreground ml-1">(fila {w.row})</span>}
                  {": "}
                  <span className="font-mono text-amber-700 dark:text-amber-400">"{w.originalValue}"</span>
                  {" — "}{w.message}
                </li>
              ))}
              {fileWarnings.length > 50 && (
                <li className="px-3 py-2 text-xs text-muted-foreground italic">
                  … y {fileWarnings.length - 50} más
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
