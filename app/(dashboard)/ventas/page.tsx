import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import VentasForm from "./ventas-form";
import { ProductosService, SociosService, CortesService } from "@/services";

/**
 * Página de Ventas - Server Component
 * Filtra productos de membresía para mostrar solo productos físicos
 */
export default async function VentasPage() {
  const [corteActivo, todosProductos, socios] = await Promise.all([
    CortesService.getCorteActivo(),
    ProductosService.getProductosActivos(),
    SociosService.getSociosActivos(),
  ]);

  // Filtrar productos de membresía
  const keywordsMembresias = [
    "EFECTIVO",
    "VISITA",
    "MENSUALIDAD",
    "SEMANA",
    "TRIMESTRE",
    "ANUAL",
    "PROMOCION",
    "RENACER",
  ];

  const productos = todosProductos.filter((p) => {
    return !keywordsMembresias.some((keyword) =>
      p.nombre.toUpperCase().includes(keyword),
    );
  });

  console.log("[Ventas Page] Datos cargados:", {
    corte: corteActivo ? `✅ ${corteActivo.folio}` : "❌ No hay corte",
    productos: `✅ ${productos.length} productos físicos`,
    socios: `✅ ${socios.length} socios`,
  });

  if (!corteActivo) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Punto de Venta</h1>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-900">
                No hay corte activo
              </p>
              <p className="text-sm text-yellow-700">
                Dirígete a la sección de Cortes para abrir uno.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Punto de Venta</h1>
          <p className="text-gray-500">
            Corte: {corteActivo.folio} | Tickets:{" "}
            {corteActivo.cantidadTickets || 0}
          </p>
        </div>
      </div>

      <VentasForm
        corteActivo={corteActivo}
        productos={productos}
        socios={socios}
      />
    </div>
  );
}
