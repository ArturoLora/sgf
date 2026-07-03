"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { FileUploadStep } from "./FileUploadStep";
import { PreviewStep } from "./PreviewStep";
import { InconsistencyStep } from "./InconsistencyStep";
import { DeletionPreviewStep } from "./DeletionPreviewStep";
import { BackupStep } from "./BackupStep";
import { FinalConfirmationStep } from "./FinalConfirmationStep";
import { ExecutionStep } from "./ExecutionStep";
import type { PreviewResponseType } from "@/types/api/migracion";

interface Props {
  onExit: () => void;
}

// Steps 1-3 reuse the exact same Sync-mode components (FileUploadStep,
// PreviewStep, InconsistencyStep) — no new parsing/preview/mapping logic
// (G6). No destructive step is reachable until this validation completes
// with canProceed=true, same gate as Sync mode (Story 1.3).
const STEPS = [
  "Carga y análisis",
  "Previsualización",
  "Mapeo de empleados",
  "Preview de borrado",
  "Respaldo",
  "Confirmación final",
  "Ejecución",
] as const;

export function ReconstructionManager({ onExit }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [previewResult, setPreviewResult] = useState<PreviewResponseType | null>(null);
  const [employeeMapping, setEmployeeMapping] = useState<Record<string, string>>({});
  const [restoreCommand, setRestoreCommand] = useState<string | null>(null);
  const [reimportProducts, setReimportProducts] = useState(false);

  function handleAnalysisComplete(uploadedFiles: File[]) {
    setFiles(uploadedFiles);
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

  function handleConfirm(chosenReimportProducts: boolean) {
    setReimportProducts(chosenReimportProducts);
    setStep(7);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* AC1: persistent warning banner across all Reconstruction steps */}
      <div className="rounded-lg border border-amber-400 bg-amber-50 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          Este modo eliminará todos los datos operativos. Los usuarios, autenticación y configuración
          serán preservados.
        </p>
      </div>

      <nav aria-label="Pasos de reconstrucción" className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {STEPS.map((label, i) => (
          <span key={label} className={step === i + 1 ? "font-medium text-foreground" : ""}>
            {i + 1}. {label}
          </span>
        ))}
      </nav>

      {step === 1 && <FileUploadStep onAnalysisComplete={handleAnalysisComplete} />}

      {step === 2 && <PreviewStep files={files} onPreviewComplete={handlePreviewComplete} />}

      {step === 3 && previewResult && (
        <InconsistencyStep previewResult={previewResult} onComplete={handleInconsistencyComplete} />
      )}

      {step === 4 && <DeletionPreviewStep onContinue={() => setStep(5)} />}

      {step === 5 && (
        <BackupStep
          onContinue={(command) => {
            setRestoreCommand(command);
            setStep(6);
          }}
        />
      )}

      {step === 6 && <FinalConfirmationStep onConfirm={handleConfirm} />}

      {step === 7 && (
        <ExecutionStep
          files={files}
          employeeMapping={employeeMapping}
          reimportProducts={reimportProducts}
          restoreCommand={restoreCommand}
          expectedMembers={previewResult?.members.length ?? 0}
          expectedShifts={previewResult?.shifts.length ?? 0}
          onExit={onExit}
        />
      )}
    </div>
  );
}
