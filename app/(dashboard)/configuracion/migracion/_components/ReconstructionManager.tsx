"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { DeletionPreviewStep } from "./DeletionPreviewStep";
import { BackupStep } from "./BackupStep";
import { FinalConfirmationStep } from "./FinalConfirmationStep";

interface Props {
  onExit: () => void;
}

const STEPS = ["Preview de borrado", "Respaldo", "Confirmación final"] as const;

export function ReconstructionManager({ onExit }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

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

      <nav aria-label="Pasos de reconstrucción" className="flex items-center gap-3 text-xs text-muted-foreground">
        {STEPS.map((label, i) => (
          <span key={label} className={step === i + 1 ? "font-medium text-foreground" : ""}>
            {i + 1}. {label}
          </span>
        ))}
      </nav>

      {step === 1 && <DeletionPreviewStep onContinue={() => setStep(2)} />}
      {step === 2 && <BackupStep onContinue={() => setStep(3)} />}
      {step === 3 && <FinalConfirmationStep onExit={onExit} />}
    </div>
  );
}
