"use client";

import { useState } from "react";
import { FileUploadStep } from "./FileUploadStep";
import { PreviewStep } from "./PreviewStep";
import type { AnalysisResultType, PreviewResponseType } from "@/types/api/migracion";

const STEPS = [
  "Carga y análisis",
  "Previsualización",
  "Validación",
  "Confirmación",
  "Resultado",
] as const;

export function MigracionManager() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResultType[]>([]);
  const [analysisFiles, setAnalysisFiles] = useState<File[]>([]);
  const [previewResult, setPreviewResult] = useState<PreviewResponseType | null>(null);

  function handleAnalysisComplete(files: File[], results: AnalysisResultType[]) {
    setAnalysisFiles(files);
    setAnalysisResults(results);
    setStep(2);
  }

  function handlePreviewComplete(result: PreviewResponseType) {
    setPreviewResult(result);
    setStep(3);
  }

  function handleReset() {
    setStep(1);
    setAnalysisFiles([]);
    setAnalysisResults([]);
    setPreviewResult(null);
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
            const stepNumber = (i + 1) as 1 | 2 | 3 | 4 | 5;
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

      {step >= 3 && (
        <div className="rounded-lg border border-border p-6 text-center text-muted-foreground text-sm">
          Paso {step} — disponible en próximas historias.
          {previewResult && (
            <p className="mt-1 text-xs">
              ({previewResult.members.length} socios · {previewResult.shifts.length} cortes en cola)
            </p>
          )}
          <br />
          <button
            className="mt-3 underline text-primary"
            onClick={handleReset}
          >
            Volver al inicio
          </button>
        </div>
      )}
    </div>
  );
}
