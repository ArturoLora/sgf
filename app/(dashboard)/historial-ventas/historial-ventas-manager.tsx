// app/(dashboard)/historial-ventas/historial-ventas-manager.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Receipt, Calendar } from "lucide-react";
import HistorialFiltros from "./historial-filtros";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Parse orderBy to separate field and direction
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

  const totalPages = Math.ceil(totalSales / ITEMS_PER_PAGE);

  const stats = useMemo(() => {
    const totalValue = tickets.reduce((s, t) => s + Number(t.total), 0);
    const cancelled = tickets.filter((t) => t.isCancelled).length;
    const totalItems = tickets.reduce((s, t) => s + t.items.length, 0);

    return {
      totalValue,
      uniqueTickets: tickets.length,
      cancelled,
      totalItems,
    };
  }, [tickets]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Historial de Ventas</h1>
        <p className="text-gray-500">Consulta y análisis de ventas</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              ${stats.totalValue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Total en ventas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.uniqueTickets}</div>
            <p className="text-xs text-gray-500">Tickets</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-gray-500">Items</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {stats.cancelled}
            </div>
            <p className="text-xs text-gray-500">Canceladas</p>
          </CardContent>
        </Card>
      </div>

      <HistorialFiltros
        onFilter={handleFilter}
        cashiers={cashiers}
        products={products}
        members={members}
        loading={loading}
      />

      <Card>
        <CardHeader>
          <CardTitle>Resultados ({totalSales})</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-8">Cargando...</p>
          ) : tickets.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Sin resultados</p>
          ) : (
            <>
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.ticket}
                    className={`border rounded-lg p-4 ${
                      ticket.isCancelled ? "bg-red-50 border-red-200" : ""
                    }`}
                  >
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <div className="flex gap-2 items-center mb-2">
                          <Receipt className="h-4 w-4" />
                          <strong>#{ticket.ticket}</strong>
                          <Badge variant="secondary">
                            {ticket.items.length} items
                          </Badge>
                          {ticket.isCancelled && (
                            <Badge variant="destructive">Cancelada</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(ticket.date)}</span>
                        </div>

                        <p className="text-sm text-gray-600">
                          Cajero:{" "}
                          <span className="font-medium">{ticket.cashier}</span>
                        </p>

                        {ticket.paymentMethod && (
                          <p className="text-sm text-gray-600">
                            Pago:{" "}
                            <span className="font-medium">
                              {ticket.paymentMethod.replace(/_/g, " ")}
                            </span>
                          </p>
                        )}

                        {ticket.member && (
                          <p className="text-sm text-gray-600">
                            Cliente:{" "}
                            <span className="font-medium">
                              {ticket.member.name}
                            </span>{" "}
                            ({ticket.member.memberNumber})
                          </p>
                        )}

                        <div className="mt-3 space-y-1 bg-gray-50 rounded p-2">
                          {ticket.items.map((i: any) => (
                            <div
                              key={i.id}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-gray-700">
                                {Math.abs(i.quantity)}x {i.product.name}
                              </span>
                              <span className="font-medium">
                                ${Number(i.total).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <p className="font-bold text-2xl">
                          ${Number(ticket.total).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1 || loading}
                    onClick={() => loadSales(filters, currentPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>

                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages || loading}
                    onClick={() => loadSales(filters, currentPage + 1)}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
