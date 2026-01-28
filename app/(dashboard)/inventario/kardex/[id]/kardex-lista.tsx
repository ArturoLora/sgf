"use client";

import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";

interface Movimiento {
  id: number;
  type: string;
  location: string;
  quantity: number;
  ticket?: string | null;
  total?: number | null;
  notes?: string | null;
  date: string;
  user: {
    name: string;
  };
  member?: {
    memberNumber: string;
    name: string | null;
  } | null;
}

interface KardexListaProps {
  movimientos: Movimiento[];
}

export default function KardexLista({ movimientos }: KardexListaProps) {
  const getTipoInfo = (tipo: string) => {
    switch (tipo) {
      case "SALE":
        return { variant: "destructive" as const, texto: "Venta" };
      case "WAREHOUSE_ENTRY":
        return { variant: "default" as const, texto: "Entrada Bodega" };
      case "GYM_ENTRY":
        return { variant: "default" as const, texto: "Entrada Gym" };
      case "TRANSFER_TO_GYM":
        return { variant: "outline" as const, texto: "Traspaso a Gym" };
      case "TRANSFER_TO_WAREHOUSE":
        return { variant: "outline" as const, texto: "Traspaso a Bodega" };
      case "ADJUSTMENT":
        return { variant: "secondary" as const, texto: "Ajuste" };
      default:
        return { variant: "outline" as const, texto: tipo };
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (movimientos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No hay movimientos registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {movimientos.map((mov) => {
        const tipoInfo = getTipoInfo(mov.type);

        return (
          <div
            key={mov.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg border hover:bg-gray-50"
          >
            {/* Info izquierda */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={tipoInfo.variant}>{tipoInfo.texto}</Badge>
                <span className="text-xs sm:text-sm text-gray-600">
                  {mov.location === "WAREHOUSE" ? "Bodega" : "Gym"}
                </span>
                {mov.ticket && (
                  <Badge variant="outline" className="text-xs">
                    #{mov.ticket}
                  </Badge>
                )}
              </div>

              <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span className="truncate">{formatFecha(mov.date)}</span>
                </div>
                <p className="truncate">
                  <span className="font-medium">Usuario:</span> {mov.user.name}
                </p>
                {mov.member && (
                  <p className="truncate">
                    <span className="font-medium">Cliente:</span>{" "}
                    {mov.member.name || mov.member.memberNumber}
                  </p>
                )}
                {mov.notes && (
                  <p className="text-gray-500 italic truncate">{mov.notes}</p>
                )}
              </div>
            </div>

            {/* Cantidad y total */}
            <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto">
              <div className="flex items-center gap-2">
                {mov.quantity > 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 shrink-0" />
                )}
                <span
                  className={`text-xl sm:text-2xl font-bold ${
                    mov.quantity > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {mov.quantity > 0 ? "+" : ""}
                  {mov.quantity}
                </span>
              </div>
              {mov.total && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-sm sm:text-base font-medium">
                    ${Number(mov.total).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
