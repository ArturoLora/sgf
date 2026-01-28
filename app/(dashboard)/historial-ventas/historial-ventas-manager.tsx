"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import HistorialFiltros from "./historial-filtros";
import HistorialLista from "./historial-lista";
import HistorialStats from "./historial-stats";

interface Cashier {
  id: string;
  name: string;
}

interface Product {
  id: number;
  name: string;
}

interface Member {
  id: number;
  memberNumber: string;
  name: string | null;
}

interface HistorialVentasManagerProps {
  cashiers: Cashier[];
  products: Product[];
  members: Member[];
}

interface SalesFilters {
  search: string;
  startDate: string;
  endDate: string;
  cashier: string;
  product: string;
  member: string;
  paymentMethod: string;
  productType: "todos" | "membresias" | "productos";
  orderBy:
    | "date_desc"
    | "date_asc"
    | "total_desc"
    | "total_asc"
    | "ticket_desc"
    | "ticket_asc";
  onlyActive: boolean;
}

const ITEMS_PER_PAGE = 10;

export default function HistorialVentasManager({
  cashiers,
  products,
  members,
}: HistorialVentasManagerProps) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState<SalesFilters>({
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

  useEffect(() => {
    loadSales(filters, 1);
  }, []);

  const loadSales = async (newFilters: SalesFilters, page: number = 1) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (newFilters.search) params.append("search", newFilters.search);
      if (newFilters.startDate)
        params.append("startDate", newFilters.startDate);
      if (newFilters.endDate) params.append("endDate", newFilters.endDate);
      if (newFilters.cashier !== "todos")
        params.append("cashier", newFilters.cashier);
      if (newFilters.product !== "todos")
        params.append("product", newFilters.product);
      if (newFilters.member !== "todos")
        params.append("member", newFilters.member);
      if (newFilters.paymentMethod !== "todos")
        params.append("paymentMethod", newFilters.paymentMethod);
      if (newFilters.productType !== "todos")
        params.append("productType", newFilters.productType);

      const [orderByField, order] = newFilters.orderBy.split("_");
      params.append("orderBy", orderByField);
      params.append("order", order);

      params.append("onlyActive", newFilters.onlyActive.toString());
      params.append("page", page.toString());
      params.append("perPage", ITEMS_PER_PAGE.toString());

      const res = await fetch(`/api/sales/history?${params}`);

      if (!res.ok) throw new Error("Error al cargar ventas");

      const data = await res.json();

      setTickets(data.tickets);
      setTotalSales(data.total);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters: SalesFilters) => {
    setFilters(newFilters);
    loadSales(newFilters, 1);
  };

  const handlePageChange = (page: number) => {
    loadSales(filters, page);
  };

  const totalPages = Math.ceil(totalSales / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Historial de Ventas</h1>
        <p className="text-sm sm:text-base text-gray-500">
          Consulta y análisis de ventas
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex justify-between items-start gap-2">
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <HistorialStats tickets={tickets} />

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
            <span className="text-xs sm:text-sm font-normal text-gray-500">
              {totalSales} ventas
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HistorialLista
            tickets={tickets}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
