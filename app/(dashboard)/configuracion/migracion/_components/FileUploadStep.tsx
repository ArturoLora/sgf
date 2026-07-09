"use client";

import { useState, useRef, useCallback } from "react";
import { Users, FileText, AlertCircle, CheckCircle2, Upload, Loader2, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResultType } from "@/types/api/migracion";
import { partitionByByteBudget, concatAnalysisResults } from "@/modules/migration/domain/upload-batching";

interface FileUploadStepProps {
  onAnalysisComplete: (files: File[], results: AnalysisResultType[]) => void;
}

export function FileUploadStep({ onAnalysisComplete }: FileUploadStepProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [results, setResults] = useState<AnalysisResultType[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [batches, setBatches] = useState<File[][]>([]);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [failedBatchIndex, setFailedBatchIndex] = useState<number | null>(null);
  const [partialResults, setPartialResults] = useState<AnalysisResultType[][]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const xlsxFiles = Array.from(incoming).filter((f) =>
      f.name.endsWith(".xlsx")
    );
    if (xlsxFiles.length === 0) {
      setError("Solo se aceptan archivos .xlsx");
      return;
    }
    setError(null);
    setResults(null);
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const fresh = xlsxFiles.filter((f) => !existing.has(f.name));
      return [...prev, ...fresh];
    });
  }

  function removeFile(name: string) {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
    setResults(null);
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  // Batches son solo transporte — el lote completo sigue siendo un único
  // análisis lógico. Secuencial (no Promise.all): ninguna razón real para
  // paralelizar, y preserva orden determinista de consolidación.
  async function runBatches(allBatches: File[][], startIndex: number, priorResults: AnalysisResultType[][]) {
    const collected = [...priorResults];
    for (let i = startIndex; i < allBatches.length; i++) {
      setBatchProgress({ current: i + 1, total: allBatches.length });
      try {
        const formData = new FormData();
        allBatches[i].forEach((f) => formData.append("files", f));

        const res = await fetch("/api/migracion/validate", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Error ${res.status}`);
        }

        const data: AnalysisResultType[] = await res.json();
        collected.push(data);
      } catch (err) {
        setFailedBatchIndex(i);
        setPartialResults(collected);
        setError(
          `Error en lote ${i + 1} de ${allBatches.length}: ${err instanceof Error ? err.message : "Error inesperado"}`,
        );
        setLoading(false);
        return;
      }
    }

    setResults(concatAnalysisResults(collected));
    setFailedBatchIndex(null);
    setPartialResults([]);
    setBatchProgress(null);
    setLoading(false);
  }

  async function handleAnalyze() {
    if (selectedFiles.length === 0) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setFailedBatchIndex(null);
    setPartialResults([]);

    const partition = partitionByByteBudget(selectedFiles, (f) => f.size);
    const newBatches = partition.map((idxs) => idxs.map((i) => selectedFiles[i]));
    setBatches(newBatches);
    await runBatches(newBatches, 0, []);
  }

  async function handleRetryBatch() {
    if (failedBatchIndex === null) return;
    setLoading(true);
    setError(null);
    await runBatches(batches, failedBatchIndex, partialResults);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Arrastra archivos aquí o haz clic para seleccionar</p>
          <p className="text-xs text-muted-foreground mt-1">
            Solo archivos .xlsx — máximo 10 MB por archivo
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <ul className="flex flex-col gap-2">
          {selectedFiles.map((f) => (
            <li
              key={f.name}
              className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <span className="truncate max-w-xs">{f.name}</span>
              <button
                type="button"
                aria-label={`Quitar ${f.name}`}
                onClick={() => removeFile(f.name)}
                className="ml-3 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {loading && batchProgress && batchProgress.total > 1 && (
        <p className="text-xs text-muted-foreground">
          Lote {batchProgress.current} de {batchProgress.total}
        </p>
      )}

      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleAnalyze}
          disabled={selectedFiles.length === 0 || loading}
          className="self-start"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando…
            </>
          ) : (
            "Analizar archivos"
          )}
        </Button>

        {failedBatchIndex !== null && !loading && (
          <Button onClick={handleRetryBatch} variant="outline" className="self-start">
            Reintentar lote {failedBatchIndex + 1}
          </Button>
        )}
      </div>

      {/* Analysis results */}
      {results && results.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Resultados del análisis</h3>
          {results.map((r) => (
            <AnalysisCard key={r.filename} result={r} />
          ))}
          <SummaryBanner results={results} />
          {results.some((r) => r.validationStatus === "valid") && (
            <Button
              onClick={() => onAnalysisComplete(selectedFiles, results)}
              className="self-start flex items-center gap-2"
            >
              Continuar a previsualización
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ result }: { result: AnalysisResultType }) {
  const isValid = result.validationStatus === "valid";
  const isError = result.validationStatus === "error" || result.validationStatus === "unknown";

  return (
    <div
      className={`rounded-lg border p-4 ${
        isError ? "border-destructive/40 bg-destructive/5" : "border-border bg-background"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {result.fileType === "socios" ? (
            <Users className="h-5 w-5 text-blue-500" />
          ) : result.fileType === "cortes" ? (
            <FileText className="h-5 w-5 text-emerald-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{result.filename}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                isValid
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {isValid ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {isValid ? "Válido" : "No reconocido"}
            </span>
          </div>

          {result.fileType === "socios" && isValid && (
            <p className="mt-1 text-sm text-muted-foreground">
              Archivo de Socios — <strong>{result.recordCount}</strong> registros detectados
            </p>
          )}

          {result.fileType === "cortes" && isValid && (
            <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
              <p>
                Archivo de Corte
                {result.detectedFolio && (
                  <> — Folio <strong>{result.detectedFolio}</strong></>
                )}
                {result.detectedDate && (
                  <> · Apertura: <strong>{result.detectedDate}</strong></>
                )}
              </p>
              <p>
                <strong>{result.recordCount}</strong> ventas
                {result.skuCount !== undefined && (
                  <> · <strong>{result.skuCount}</strong> SKUs en inventario</>
                )}
                {result.inferredUserCount !== undefined && result.inferredUserCount > 0 && (
                  <> · <strong>{result.inferredUserCount}</strong> cajeros/vendedores inferidos</>
                )}
              </p>
            </div>
          )}

          {isError && (
            <p className="mt-1 text-sm text-destructive">
              {result.errorMessage ??
                "Archivo no reconocido: no contiene las hojas esperadas (SOCIOS o Cierre/Ventas/Inventario)"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryBanner({ results }: { results: AnalysisResultType[] }) {
  const sociosFile = results.find((r) => r.fileType === "socios" && r.validationStatus === "valid");
  const cortesFiles = results.filter((r) => r.fileType === "cortes" && r.validationStatus === "valid");
  const totalSocios = sociosFile?.recordCount ?? 0;
  const totalCortes = cortesFiles.length;
  const totalVentas = cortesFiles.reduce((sum, r) => sum + r.recordCount, 0);
  const totalSkus = cortesFiles.reduce((sum, r) => sum + (r.skuCount ?? 0), 0);
  const totalUsers = cortesFiles.reduce((sum, r) => sum + (r.inferredUserCount ?? 0), 0);
  const hasValid = results.some((r) => r.validationStatus === "valid");

  if (!hasValid) return null;

  return (
    <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm">
      <p className="font-medium mb-1">Resumen del análisis</p>
      <ul className="text-muted-foreground space-y-0.5">
        {totalSocios > 0 && <li>{totalSocios} socios detectados</li>}
        {totalCortes > 0 && <li>{totalCortes} archivo{totalCortes !== 1 ? "s" : ""} de corte</li>}
        {totalVentas > 0 && <li>{totalVentas} ventas en total</li>}
        {totalSkus > 0 && <li>{totalSkus} SKUs en inventario</li>}
        {totalUsers > 0 && <li>{totalUsers} cajeros/vendedores inferidos</li>}
      </ul>
    </div>
  );
}
