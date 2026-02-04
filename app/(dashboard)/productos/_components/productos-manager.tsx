"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import ProductosFiltros from "./productos-filtros";
import ProductosTabla from "./productos-tabla";
import CrearProductoModal from "./crear-producto-modal";
import EditarProductoModal from "./editar-producto-modal";
import DetalleProductoModal from "./detalle-producto-modal";
import TraspasoModal from "./traspaso-modal";
import AjusteModal from "./ajuste-modal";
import EntradaModal from "./entrada-modal";

interface Product {
  id: number;
  name: string;
  salePrice: number;
  warehouseStock: number;
  gymStock: number;
  minStock: number;
  isActive: boolean;
}

interface ProductFilters {
  search: string;
  status: "todos" | "activos" | "inactivos" | "bajoStock";
  orderBy: "name" | "salePrice" | "gymStock" | "warehouseStock";
  order: "asc" | "desc";
}

const ITEMS_PER_PAGE = 10;

interface ProductosManagerProps {
  initialProducts: Product[];
}

export default function ProductosManager({
  initialProducts,
}: ProductosManagerProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals state
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [detailProductId, setDetailProductId] = useState<number | null>(null);
  const [transferProductId, setTransferProductId] = useState<number | null>(
    null,
  );
  const [adjustmentProductId, setAdjustmentProductId] = useState<number | null>(
    null,
  );
  const [entryProductId, setEntryProductId] = useState<number | null>(null);

  // Pagination & filters
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    status: "todos",
    orderBy: "name",
    order: "asc",
  });

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];

    // Search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(search));
    }

    // Status
    switch (filters.status) {
      case "activos":
        result = result.filter((p) => p.isActive);
        break;
      case "inactivos":
        result = result.filter((p) => !p.isActive);
        break;
      case "bajoStock":
        result = result.filter(
          (p) => p.gymStock < p.minStock || p.warehouseStock < p.minStock,
        );
        break;
    }

    // Sort
    result.sort((a, b) => {
      let valueA: string | number;
      let valueB: string | number;

      switch (filters.orderBy) {
        case "name":
          valueA = a.name;
          valueB = b.name;
          break;
        case "salePrice":
          valueA = Number(a.salePrice);
          valueB = Number(b.salePrice);
          break;
        case "gymStock":
          valueA = a.gymStock;
          valueB = b.gymStock;
          break;
        case "warehouseStock":
          valueA = a.warehouseStock;
          valueB = b.warehouseStock;
          break;
        default:
          valueA = a.name;
          valueB = b.name;
      }

      if (valueA < valueB) return filters.order === "asc" ? -1 : 1;
      if (valueA > valueB) return filters.order === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [initialProducts, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const handleFilter = useCallback((newFilters: ProductFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const handleSuccess = useCallback(
    (message: string) => {
      setSuccess(message);
      router.refresh();
      setTimeout(() => setSuccess(""), 3000);
    },
    [router],
  );

  const lowStockProducts = useMemo(
    () =>
      initialProducts.filter(
        (p) =>
          p.isActive &&
          (p.gymStock < p.minStock || p.warehouseStock < p.minStock),
      ),
    [initialProducts],
  );

  const isMembership = useCallback((product: Product) => {
    return (
      product.name.includes("EFECTIVO") ||
      product.name === "VISITA" ||
      product.name.includes("MENSUALIDAD") ||
      product.name.includes("SEMANA")
    );
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Messages */}
      {error && (
        <div className="rounded-lg bg-destructive/10 dark:bg-destructive/20 p-3 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3 text-sm text-green-600 dark:text-green-300 font-medium">
          {success}
        </div>
      )}

      {/* Low stock alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              {lowStockProducts.length} producto
              {lowStockProducts.length === 1 ? "" : "s"} con stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.slice(0, 5).map((product) => (
                <Badge
                  key={product.id}
                  variant="outline"
                  className="bg-background cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900"
                  onClick={() => setDetailProductId(product.id)}
                >
                  {product.name}
                </Badge>
              ))}
              {lowStockProducts.length > 5 && (
                <Badge variant="outline" className="bg-background">
                  +{lowStockProducts.length - 5} más
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <ProductosFiltros onFilter={handleFilter} />

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">
              Productos
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredProducts.length} resultados)
              </span>
            </CardTitle>
            <Button
              onClick={() => setShowCrearModal(true)}
              className="gap-2 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No hay productos que coincidan con los filtros
              </p>
            </div>
          ) : (
            <>
              <ProductosTabla
                products={paginatedProducts}
                onDetail={setDetailProductId}
                onEdit={setEditingProductId}
                onTransfer={setTransferProductId}
                onEntry={setEntryProductId}
                isMembership={isMembership}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t">
                  <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                    Mostrando {startIndex + 1}-
                    {Math.min(
                      startIndex + ITEMS_PER_PAGE,
                      filteredProducts.length,
                    )}{" "}
                    de {filteredProducts.length}
                  </p>
                  <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex-1 sm:flex-initial"
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={
                                currentPage === pageNum ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-9"
                            >
                              {pageNum}
                            </Button>
                          );
                        },
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="flex-1 sm:flex-initial"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showCrearModal && (
        <CrearProductoModal
          onClose={() => setShowCrearModal(false)}
          onSuccess={(msg) => {
            setShowCrearModal(false);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {editingProductId && (
        <EditarProductoModal
          productId={editingProductId}
          onClose={() => setEditingProductId(null)}
          onSuccess={(msg) => {
            setEditingProductId(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {detailProductId && (
        <DetalleProductoModal
          productId={detailProductId}
          onClose={() => setDetailProductId(null)}
          onEdit={(id) => {
            setDetailProductId(null);
            setEditingProductId(id);
          }}
          onTransfer={(id) => {
            setDetailProductId(null);
            setTransferProductId(id);
          }}
          onAdjustment={(id) => {
            setDetailProductId(null);
            setAdjustmentProductId(id);
          }}
          onEntry={(id) => {
            setDetailProductId(null);
            setEntryProductId(id);
          }}
        />
      )}

      {transferProductId && (
        <TraspasoModal
          productId={transferProductId}
          onClose={() => setTransferProductId(null)}
          onSuccess={(msg) => {
            setTransferProductId(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {adjustmentProductId && (
        <AjusteModal
          productId={adjustmentProductId}
          onClose={() => setAdjustmentProductId(null)}
          onSuccess={(msg) => {
            setAdjustmentProductId(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {entryProductId && (
        <EntradaModal
          productId={entryProductId}
          onClose={() => setEntryProductId(null)}
          onSuccess={(msg) => {
            setEntryProductId(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}
    </div>
  );
}
