"use client";

import { useEffect, useState } from "react";
import type { ReporteStockActual } from "@/types/api/reports";
import { getCurrentStockReport } from "@/lib/api/reports.client";
import { ReportesStockStats } from "./reportes-stock-stats";
import { ReportesLowStock } from "./reportes-low-stock";
import { ReportesStockTabla } from "./reportes-stock-tabla";
import { ReportesSkeleton } from "./reportes-skeleton";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: ReporteStockActual };

export function ReportesManager() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    getCurrentStockReport()
      .then((data) => {
        if (!cancelled) setState({ status: "ok", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Error desconocido";
          setState({ status: "error", message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") return <ReportesSkeleton />;

  if (state.status === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/20">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          {state.message}
        </p>
      </div>
    );
  }

  const { data } = state;

  return (
    <div className="space-y-8">
      <ReportesStockStats report={data} />
      <ReportesLowStock report={data} />
      <ReportesStockTabla report={data} />
    </div>
  );
}
