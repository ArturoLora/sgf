// app/(dashboard)/corte-alert.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle } from "lucide-react";

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
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">
                Corte Activo: {corteActivo.folio}
              </p>
              <p className="text-sm text-green-700">
                Cajero: {corteActivo.cashier.name} | Apertura:{" "}
                {new Date(corteActivo.openingDate).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white">
            Tickets: {corteActivo.ticketCount}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="flex items-center gap-3 p-6">
        <AlertCircle className="h-6 w-6 text-yellow-600" />
        <p className="font-semibold text-yellow-900">
          No hay corte activo. Debe abrir uno para registrar ventas.
        </p>
      </CardContent>
    </Card>
  );
}
