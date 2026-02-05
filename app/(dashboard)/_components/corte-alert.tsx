import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface CorteAlertProps {
  corteActivo: {
    folio: string;
    cashier: { name: string };
    openingDate: string;
    ticketCount: number;
  } | null;
}

export default function CorteAlert({ corteActivo }: CorteAlertProps) {
  if (corteActivo) {
    const openingTime = new Date(corteActivo.openingDate).toLocaleTimeString(
      "es-MX",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-green-900 dark:text-green-100 text-sm">
                Corte {corteActivo.folio}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                {corteActivo.cashier.name} · {openingTime}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-white dark:bg-green-900/50 text-green-700 dark:text-green-200 border-green-300 dark:border-green-700 shrink-0 text-xs"
          >
            {corteActivo.ticketCount} tickets
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
        <div>
          <p className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm">
            Sin corte activo
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
            Debe abrir un corte para registrar ventas
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
