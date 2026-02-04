import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/require-role";
import { ProductsService } from "@/services";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, TrendingUp } from "lucide-react";
import Link from "next/link";
import { KardexLista } from "../_components/kardex-lista";
import type { KardexMovimientoResponse } from "@/types/api/inventory";

async function getProducto(id: number) {
  try {
    return await ProductsService.getProductById(id);
  } catch {
    return null;
  }
}

async function getMovimientos(id: number): Promise<KardexMovimientoResponse[]> {
  const movements = await prisma.inventoryMovement.findMany({
    where: { productId: id },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      member: {
        select: {
          memberNumber: true,
          name: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  return serializeDecimal(movements) as KardexMovimientoResponse[];
}

export default async function KardexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();

  const { id } = await params;
  const productId = parseInt(id);

  if (isNaN(productId)) {
    redirect("/inventario");
  }

  const [producto, movimientos] = await Promise.all([
    getProducto(productId),
    getMovimientos(productId),
  ]);

  if (!producto) {
    notFound();
  }

  const stockTotal = producto.warehouseStock + producto.gymStock;
  const valorTotal = Number(producto.salePrice) * stockTotal;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">
            Kardex - {producto.name}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Historial completo de movimientos
          </p>
        </div>
        <Link href="/inventario">
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Stock Gym
                </p>
                <p className="text-xl sm:text-2xl font-bold">
                  {producto.gymStock}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Stock Bodega
                </p>
                <p className="text-xl sm:text-2xl font-bold">
                  {producto.warehouseStock}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Stock Total
                </p>
                <p className="text-xl sm:text-2xl font-bold">{stockTotal}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Precio / Valor
              </p>
              <p className="text-xl sm:text-2xl font-bold truncate">
                ${Number(producto.salePrice).toFixed(2)}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 truncate">
                Total: ${valorTotal.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Historial de Movimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <KardexLista movimientos={movimientos} />
        </CardContent>
      </Card>
    </div>
  );
}
