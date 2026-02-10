"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { HistorialFiltros } from "./historial-filtros";
import { HistorialLista } from "./historial-lista";
import { HistorialStats } from "./historial-stats";
import { fetchSalesHistory } from "@/lib/api/sales.client";
import { DEFAULT_HISTORY_FILTERS } from "@/lib/domain/sales/history-filters";
import type {
  HistorialVentasFilters,
  HistorialVentasResponse,
  CashierOption,
  ProductOption,
  MemberOption,
} from "@/types/api/sales";

interface HistorialVentasManagerProps {
  cashiers: CashierOption[];
  products: ProductOption[];
  members: MemberOption[];
}

const ITEMS_PER_PAGE = 10;

export function HistorialVentasManager({
  cashiers,
  products,
  members,
}: HistorialVentasManagerProps) {
  const [response, setResponse] = useState<HistorialVentasResponse>({
    tickets: [],
    total: 0,
    page: 1,
    perPage: ITEMS_PER_PAGE,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<HistorialVentasFilters>(
    DEFAULT_HISTORY_FILTERS,
  );

  const loadSales = useCallback(
    async (currentFilters: HistorialVentasFilters, page: number = 1) => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchSalesHistory(
          currentFilters,
          page,
          ITEMS_PER_PAGE,
        );
        setResponse(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadSales(filters, 1);
  }, [filters, loadSales]);

  const handleFilter = useCallback((newFilters: HistorialVentasFilters) => {
    setFilters(newFilters);
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      loadSales(filters, page);
    },
    [filters, loadSales],
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Historial de Ventas</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Consulta y análisis de ventas
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex justify-between items-start gap-2">
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <HistorialStats tickets={response.tickets} />

      <HistorialFiltros
        onFilter={handleFilter}
        cashiers={cashiers}
        products={products}
        members={members}
        loading={loading}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>Resultados</span>
            <span className="text-xs sm:text-sm font-normal text-muted-foreground">
              {response.total} ventas
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HistorialLista
            tickets={response.tickets}
            loading={loading}
            currentPage={response.page}
            totalPages={response.totalPages}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
