"use client";

import { useState } from "react";
import { FileUploadStep } from "./FileUploadStep";
import { PreviewStep } from "./PreviewStep";
import { InconsistencyStep } from "./InconsistencyStep";
import { ImportSociosStep } from "./ImportSociosStep";
import { ImportCortesStep } from "./ImportCortesStep";
import { FinalReportStep } from "./FinalReportStep";
import { ReconstructionManager } from "./ReconstructionManager";
import type {
  AnalysisResultType,
  PreviewResponseType,
  SyncMembersResultType,
  SyncShiftsResponseType,
} from "@/types/api/migracion";

const STEPS = [
  "Carga y análisis",
  "Previsualización",
  "Validación",
  "Socios",
  "Cortes",
  "Resultado",
] as const;

export function MigracionManager() {
  const [mode, setMode] = useState<"sync" | "reconstruction" | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [, setAnalysisResults] = useState<AnalysisResultType[]>([]);
  const [analysisFiles, setAnalysisFiles] = useState<File[]>([]);
  const [previewResult, setPreviewResult] = useState<PreviewResponseType | null>(null);
  const [employeeMapping, setEmployeeMapping] = useState<Record<string, string>>({});
  const [syncResult, setSyncResult] = useState<SyncMembersResultType | null>(null);
  const [syncShiftsResult, setSyncShiftsResult] = useState<SyncShiftsResponseType | null>(null);

  function handleAnalysisComplete(files: File[], results: AnalysisResultType[]) {
    setAnalysisFiles(files);
    setAnalysisResults(results);
    setStep(2);
  }

  function handlePreviewComplete(result: PreviewResponseType) {
    setPreviewResult(result);
    setStep(3);
  }

  function handleInconsistencyComplete(mapping: Record<string, string>) {
    setEmployeeMapping(mapping);
    setStep(4);
  }

  function handleSyncComplete(result: SyncMembersResultType) {
    setSyncResult(result);
    setStep(5);
  }

  function handleSyncShiftsComplete(result: SyncShiftsResponseType) {
    setSyncShiftsResult(result);
    setStep(6);
  }

  function handleReset() {
    setStep(1);
    setAnalysisFiles([]);
    setAnalysisResults([]);
    setPreviewResult(null);
    setEmployeeMapping({});
    setSyncResult(null);
    setSyncShiftsResult(null);
  }

  if (mode === null) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importación de Datos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Elige el modo de operación. Ningún dato se modifica hasta que confirmes explícitamente en
            cada paso.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode("sync")}
            className="rounded-lg border border-border p-5 text-left hover:border-primary transition-colors"
          >
            <p className="font-semibold text-sm">Sincronización</p>
            <p className="text-xs text-muted-foreground mt-1">
              Agrega y actualiza registros desde archivos históricos sin eliminar datos existentes.
            </p>
          </button>
          <button
            onClick={() => setMode("reconstruction")}
            className="rounded-lg border border-amber-300 bg-amber-50/50 p-5 text-left hover:border-amber-500 transition-colors dark:border-amber-800/40 dark:bg-amber-900/10 dark:hover:border-amber-600"
          >
            <p className="font-semibold text-sm text-amber-900 dark:text-amber-400">Reconstrucción</p>
            <p className="text-xs text-amber-800 mt-1 dark:text-amber-300">
              Elimina los datos operativos y reconstruye desde cero. Requiere confirmación explícita.
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "reconstruction") {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reconstrucción de Datos</h1>
        </div>
        <ReconstructionManager onExit={() => setMode(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importación de Datos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Importa información histórica desde archivos Excel hacia SGF. Ningún dato se modifica
          hasta que confirmes explícitamente.
        </p>
      </div>

      {/* Step indicator */}
      <nav aria-label="Pasos de importación">
        <ol className="flex items-center gap-0">
          {STEPS.map((label, i) => {
            const stepNumber = (i + 1) as 1 | 2 | 3 | 4 | 5 | 6;
            const isActive = step === stepNumber;
            const isDone = step > stepNumber;
            return (
              <li key={label} className="flex items-center">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isDone
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {stepNumber}
                  </span>
                  <span
                    className={`text-sm hidden sm:inline ${
                      isActive ? "font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <span className="mx-3 h-px w-8 bg-border" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {step === 1 && (
        <FileUploadStep onAnalysisComplete={handleAnalysisComplete} />
      )}

      {step === 2 && (
        <PreviewStep
          files={analysisFiles}
          onPreviewComplete={handlePreviewComplete}
        />
      )}

      {step === 3 && previewResult && (
        <InconsistencyStep
          previewResult={previewResult}
          onComplete={handleInconsistencyComplete}
        />
      )}

      {step === 4 && previewResult && (
        <ImportSociosStep
          files={analysisFiles}
          totalMembers={previewResult.members.length}
          onComplete={handleSyncComplete}
        />
      )}

      {step === 5 && previewResult && (
        <ImportCortesStep
          files={analysisFiles}
          totalShifts={previewResult.shifts.length}
          employeeMapping={employeeMapping}
          onComplete={handleSyncShiftsComplete}
        />
      )}

      {step >= 6 && previewResult && (
        <FinalReportStep
          previewResult={previewResult}
          syncResult={syncResult}
          syncShiftsResult={syncShiftsResult}
          onFinish={handleReset}
        />
      )}
    </div>
  );
}
