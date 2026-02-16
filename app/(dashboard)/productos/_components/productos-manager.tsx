"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductoResponse } from "@/types/api/products";
import {
  applyFilters,
  paginate,
  computePageNumbers,
  computeLowStockProducts,
  DEFAULT_FILTERS,
  type ProductFilters,
} from "@/lib/domain/products";
import ProductosFiltros from "./productos-filtros";
import ProductosTabla from "./productos-tabla";
import CrearProductoModal from "./crear-producto-modal";
import EditarProductoModal from "./editar-producto-modal";
import DetalleProductoModal from "./detalle-producto-modal";
import TraspasoModal from "./traspaso-modal";
import AjusteModal from "./ajuste-modal";
import EntradaModal from "./entrada-modal";

const ITEMS_PER_PAGE = 10;

interface ProductosManagerProps {
  initialProducts: ProductoResponse[];
}

export default function ProductosManager({
  initialProducts,
}: ProductosManagerProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);

  const filteredProducts = useMemo(
    () => applyFilters(initialProducts, filters),
    [initialProducts, filters],
  );

  const pagination = useMemo(
    () => paginate(filteredProducts, currentPage, ITEMS_PER_PAGE),
    [filteredProducts, currentPage],
  );

  const pageNumbers = useMemo(
    () => computePageNumbers(currentPage, pagination.totalPages),
    [currentPage, pagination.totalPages],
  );

  const lowStockProducts = useMemo(
    () => computeLowStockProducts(initialProducts),
    [initialProducts],
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

  return (
    <div className="space-y-4 sm:space-y-6">
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

      <ProductosFiltros onFilter={handleFilter} />

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
                products={pagination.items}
                onDetail={setDetailProductId}
                onEdit={setEditingProductId}
                onTransfer={setTransferProductId}
                onEntry={setEntryProductId}
              />

              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t">
                  <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                    Mostrando {pagination.startIndex + 1}-{pagination.endIndex}{" "}
                    de {pagination.total}
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
                      {pageNumbers.map((pageNum) => (
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
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(pagination.totalPages, p + 1),
                        )
                      }
                      disabled={currentPage === pagination.totalPages}
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

      {editingProductId !== null && (
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

      {detailProductId !== null && (
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

      {transferProductId !== null && (
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

      {adjustmentProductId !== null && (
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

      {entryProductId !== null && (
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
