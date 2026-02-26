"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type {
  ProductoResponse,
  ProductoConMovimientosResponse,
} from "@/types/api/products";
import {
  applyFilters,
  computeLowStockProducts,
  DEFAULT_FILTERS,
  type ProductFilters,
} from "@/lib/domain/products";
import {
  paginar,
  calcularPaginasVisibles,
} from "@/lib/domain/shared/pagination";
import { fetchProductById } from "@/lib/api/products.client";
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

  // Hydrated product state for modals
  // fetchProductById returns ProductoConMovimientosResponse (superset of ProductoResponse)
  const [editingProduct, setEditingProduct] =
    useState<ProductoConMovimientosResponse | null>(null);
  const [detailProduct, setDetailProduct] =
    useState<ProductoConMovimientosResponse | null>(null);
  const [transferProduct, setTransferProduct] =
    useState<ProductoConMovimientosResponse | null>(null);
  const [adjustmentProduct, setAdjustmentProduct] =
    useState<ProductoConMovimientosResponse | null>(null);
  const [entryProduct, setEntryProduct] =
    useState<ProductoConMovimientosResponse | null>(null);

  // Loading states for hydration
  const [loadingProductId, setLoadingProductId] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);

  // applyFilters accepts ProductoResponse[] and filters by domain logic.
  // The result is cast to ProductoResponse[] because paginar<T> is generic
  // and the input array originates from initialProducts: ProductoResponse[].
  const filteredProducts = useMemo(
    () => applyFilters(initialProducts, filters) as ProductoResponse[],
    [initialProducts, filters],
  );

  const pagination = useMemo(
    () => paginar(filteredProducts, currentPage, ITEMS_PER_PAGE),
    [filteredProducts, currentPage],
  );

  const pageNumbers = useMemo(
    () => calcularPaginasVisibles(currentPage, pagination.totalPaginas),
    [currentPage, pagination.totalPaginas],
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

  // Orchestrated hydration: Manager fetches product, then opens modal with data
  const handleOpenDetail = useCallback(async (productId: number) => {
    setLoadingProductId(productId);
    try {
      const data = await fetchProductById(productId);
      setDetailProduct(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar producto";
      setError(message);
    } finally {
      setLoadingProductId(null);
    }
  }, []);

  const handleOpenEdit = useCallback(async (productId: number) => {
    setLoadingProductId(productId);
    try {
      const data = await fetchProductById(productId);
      setEditingProduct(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar producto";
      setError(message);
    } finally {
      setLoadingProductId(null);
    }
  }, []);

  const handleOpenTransfer = useCallback(async (productId: number) => {
    setLoadingProductId(productId);
    try {
      const data = await fetchProductById(productId);
      setTransferProduct(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar producto";
      setError(message);
    } finally {
      setLoadingProductId(null);
    }
  }, []);

  const handleOpenEntry = useCallback(async (productId: number) => {
    setLoadingProductId(productId);
    try {
      const data = await fetchProductById(productId);
      setEntryProduct(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar producto";
      setError(message);
    } finally {
      setLoadingProductId(null);
    }
  }, []);

  const handleOpenAdjustment = useCallback(async (productId: number) => {
    setLoadingProductId(productId);
    try {
      const data = await fetchProductById(productId);
      setAdjustmentProduct(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar producto";
      setError(message);
    } finally {
      setLoadingProductId(null);
    }
  }, []);

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
                  onClick={() => handleOpenDetail(product.id)}
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
                onDetail={handleOpenDetail}
                onEdit={handleOpenEdit}
                onTransfer={handleOpenTransfer}
                onEntry={handleOpenEntry}
                loadingProductId={loadingProductId}
              />

              {pagination.totalPaginas > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t">
                  <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                    Mostrando {pagination.inicio + 1}-{pagination.fin} de{" "}
                    {pagination.total}
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
                          Math.min(pagination.totalPaginas, p + 1),
                        )
                      }
                      disabled={currentPage === pagination.totalPaginas}
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

      {editingProduct !== null && (
        <EditarProductoModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={(msg) => {
            setEditingProduct(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {detailProduct !== null && (
        <DetalleProductoModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onEdit={(id) => {
            setDetailProduct(null);
            handleOpenEdit(id);
          }}
          onTransfer={(id) => {
            setDetailProduct(null);
            handleOpenTransfer(id);
          }}
          onAdjustment={(id) => {
            setDetailProduct(null);
            handleOpenAdjustment(id);
          }}
          onEntry={(id) => {
            setDetailProduct(null);
            handleOpenEntry(id);
          }}
        />
      )}

      {transferProduct !== null && (
        <TraspasoModal
          product={transferProduct}
          onClose={() => setTransferProduct(null)}
          onSuccess={(msg) => {
            setTransferProduct(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {adjustmentProduct !== null && (
        <AjusteModal
          product={adjustmentProduct}
          onClose={() => setAdjustmentProduct(null)}
          onSuccess={(msg) => {
            setAdjustmentProduct(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {entryProduct !== null && (
        <EntradaModal
          product={entryProduct}
          onClose={() => setEntryProduct(null)}
          onSuccess={(msg) => {
            setEntryProduct(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}
    </div>
  );
}
