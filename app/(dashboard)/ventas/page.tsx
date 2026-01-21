import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import VentasForm from "./ventas-form";
import { ProductosService, SociosService, CortesService } from "@/services";

/**
 * Página de Ventas - Server Component
 * Los datos ya vienen serializados automáticamente desde los services
 */
export default async function VentasPage() {
  // Cargar datos en paralelo - ya vienen serializados automáticamente
  const [corteActivo, productos, socios] = await Promise.all([
    CortesService.getCorteActivo(),
    ProductosService.getProductosActivos(),
    SociosService.getSociosActivos(),
  ]);

  console.log("[Ventas Page] Datos cargados:", {
    corte: corteActivo ? `✅ ${corteActivo.folio}` : "❌ No hay corte",
    productos: `✅ ${productos.length} productos`,
    socios: `✅ ${socios.length} socios`,
  });

  // Si no hay corte activo, mostrar advertencia
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

  // Renderizar formulario de ventas con datos ya serializados
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
