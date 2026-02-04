"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { HistorialFiltros } from "./historial-filtros";
import { HistorialLista } from "./historial-lista";
import { HistorialStats } from "./historial-stats";
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
  const [filters, setFilters] = useState<HistorialVentasFilters>({
    search: "",
    startDate: "",
    endDate: "",
    cashier: "todos",
    product: "todos",
    member: "todos",
    paymentMethod: "todos",
    productType: "todos",
    orderBy: "date_desc",
    onlyActive: true,
  });

  const loadSales = useCallback(
    async (newFilters: HistorialVentasFilters, page: number = 1) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (newFilters.search) params.append("search", newFilters.search);
        if (newFilters.startDate)
          params.append("startDate", newFilters.startDate);
        if (newFilters.endDate) params.append("endDate", newFilters.endDate);
        if (newFilters.cashier && newFilters.cashier !== "todos") {
          params.append("cashier", newFilters.cashier);
        }
        if (newFilters.product && newFilters.product !== "todos") {
          params.append("product", newFilters.product);
        }
        if (newFilters.member && newFilters.member !== "todos") {
          params.append("member", newFilters.member);
        }
        if (newFilters.paymentMethod && newFilters.paymentMethod !== "todos") {
          params.append("paymentMethod", newFilters.paymentMethod);
        }
        if (newFilters.productType && newFilters.productType !== "todos") {
          params.append("productType", newFilters.productType);
        }

        if (newFilters.orderBy) {
          const [orderByField, order] = newFilters.orderBy.split("_");
          params.append("orderBy", orderByField);
          params.append("order", order);
        }

        params.append("onlyActive", (newFilters.onlyActive ?? true).toString());
        params.append("page", page.toString());
        params.append("perPage", ITEMS_PER_PAGE.toString());

        const res = await fetch(`/api/sales/history?${params}`);

        if (!res.ok) {
          throw new Error("Error al cargar ventas");
        }

        const data: HistorialVentasResponse = await res.json();

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
