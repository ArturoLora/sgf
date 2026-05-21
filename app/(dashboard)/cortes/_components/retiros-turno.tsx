"use client";

import { Button } from "@/components/ui/button";
import { Plus, ArrowDownLeft } from "lucide-react";
import type { WithdrawalResponse } from "@/types/api/shifts";

interface RetirosTurnoProps {
  retiros: WithdrawalResponse[];
  onRegistrar: () => void;
}

function formatHora(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function RetirosTurno({
  retiros,
  onRegistrar,
}: RetirosTurnoProps) {
  const total = retiros.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="border-t border-blue-200 dark:border-blue-800 mt-3 pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Retiros durante turno
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={onRegistrar}
          className="h-7 text-xs gap-1 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
        >
          <Plus className="h-3 w-3" />
          Registrar Retiro
        </Button>
      </div>

      {retiros.length === 0 ? (
        <p className="text-xs text-blue-600/60 dark:text-blue-400/60 py-1">
          No hay retiros registrados en este turno.
        </p>
      ) : (
        <div className="space-y-1">
          {retiros.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between text-sm py-1 border-b border-blue-100 dark:border-blue-900 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ArrowDownLeft className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-blue-800 dark:text-blue-200 truncate">
                  {r.concept}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-xs text-blue-600/70 dark:text-blue-400/70">
                  {formatHora(r.createdAt)}
                </span>
                <span className="font-medium text-amber-700 dark:text-amber-400 tabular-nums">
                  −${r.amount.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-sm font-semibold pt-1 border-t border-blue-200 dark:border-blue-800">
            <span className="text-blue-800 dark:text-blue-200">
              Total retirado
            </span>
            <span className="text-amber-700 dark:text-amber-400 tabular-nums">
              −${total.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
