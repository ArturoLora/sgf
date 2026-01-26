// app/(dashboard)/historial-ventas/historial-ventas-manager.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye, X, Receipt } from "lucide-react";
import HistorialFiltros from "./historial-filtros";
import DetalleVentaModal from "./detalle-venta-modal";

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
  orderBy: "date" | "total" | "ticket";
  order: "asc" | "desc";
  onlyActive: boolean;
}

interface Sale {
  id: number;
  ticket: string;
  date: string;
  total: number;
  paymentMethod: string;
  isCancelled: boolean;
  product: {
    name: string;
  };
  member: {
    memberNumber: string;
    name: string;
  } | null;
  user: {
    name: string;
  };
  quantity: number;
  notes: string | null;
}

const ITEMS_PER_PAGE = 10;

export default function HistorialVentasManager({
  cashiers,
  products,
  members,
}: HistorialVentasManagerProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [filters, setFilters] = useState<SalesFilters>({
    search: "",
    startDate: "",
    endDate: "",
    cashier: "todos",
    product: "todos",
    member: "todos",
    paymentMethod: "todos",
    productType: "todos",
    orderBy: "date",
    order: "desc",
    onlyActive: true,
  });

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          onlyActive: "true",
          orderBy: "date",
          order: "desc",
          page: "1",
          perPage: ITEMS_PER_PAGE.toString(),
        });

        const res = await fetch(`/api/sales/history?${params}`);

        if (!res.ok) {
          throw new Error("Error al cargar ventas");
        }

        const data = await res.json();
        setSales(data.sales);
        setTotalSales(data.total);
        setCurrentPage(1);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, []);

  const loadSales = async (newFilters: SalesFilters, page: number = 1) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

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
      if (newFilters.search) params.append("search", newFilters.search);
      params.append("onlyActive", newFilters.onlyActive.toString());
      params.append("orderBy", newFilters.orderBy);
      params.append("order", newFilters.order);
      params.append("page", page.toString());
      params.append("perPage", ITEMS_PER_PAGE.toString());

      const res = await fetch(`/api/sales/history?${params}`);

      if (!res.ok) {
        throw new Error("Error al cargar ventas");
      }

      const data = await res.json();
      setSales(data.sales);
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

  const salesByTicket = useMemo(() => {
    const groups: Record<string, Sale[]> = {};
    sales.forEach((sale) => {
      if (!groups[sale.ticket]) {
        groups[sale.ticket] = [];
      }
      groups[sale.ticket].push(sale);
    });
    return groups;
  }, [sales]);

  const stats = useMemo(() => {
    const totalValue = sales.reduce((sum, v) => sum + Number(v.total), 0);
    const uniqueTickets = new Set(sales.map((v) => v.ticket)).size;
    const cancelled = sales.filter((v) => v.isCancelled).length;

    return {
      totalValue,
      uniqueTickets,
      cancelled,
      totalItems: sales.length,
    };
  }, [sales]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Historial de Ventas</h1>
          <p className="text-gray-500">Consulta y análisis de ventas</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center justify-between">
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
            <p className="text-xs text-gray-500">Tickets únicos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-gray-500">Artículos vendidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {stats.cancelled}
            </div>
            <p className="text-xs text-gray-500">Ventas canceladas</p>
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
          <CardTitle className="flex items-center justify-between">
            <span>Resultados</span>
            <span className="text-sm font-normal text-gray-500">
              {totalSales} ventas totales
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando ventas...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No hay ventas que coincidan con los filtros
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {Object.entries(salesByTicket).map(([ticket, ticketSales]) => {
                  const totalTicket = ticketSales.reduce(
                    (sum, v) => sum + Number(v.total),
                    0,
                  );
                  const firstSale = ticketSales[0];
                  const isCancelled = firstSale.isCancelled;

                  return (
                    <div
                      key={ticket}
                      className={`rounded-lg border p-4 transition-colors ${
                        isCancelled
                          ? "border-red-200 bg-red-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-gray-400" />
                              <p className="font-semibold">#{ticket}</p>
                            </div>
                            <Badge variant="outline" className="gap-1">
                              {ticketSales.length}{" "}
                              {ticketSales.length === 1 ? "item" : "items"}
                            </Badge>
                            {isCancelled && (
                              <Badge variant="destructive">Cancelada</Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={
                                firstSale.paymentMethod === "CASH"
                                  ? "bg-green-50"
                                  : "bg-blue-50"
                              }
                            >
                              {firstSale.paymentMethod.replace("_", " ")}
                            </Badge>
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              Cajero: {firstSale.user.name} ·{" "}
                              {new Date(firstSale.date).toLocaleString()}
                            </p>
                            {firstSale.member && (
                              <p>
                                Cliente: {firstSale.member.name} (
                                {firstSale.member.memberNumber})
                              </p>
                            )}
                          </div>

                          <div className="mt-3 space-y-1">
                            {ticketSales.map((sale) => (
                              <div
                                key={sale.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-gray-700">
                                  {Math.abs(sale.quantity)}x {sale.product.name}
                                </span>
                                <span className="font-medium">
                                  ${Number(sale.total).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 ml-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Total</p>
                            <p
                              className={`text-lg font-bold ${
                                isCancelled ? "text-red-600" : ""
                              }`}
                            >
                              ${totalTicket.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            onClick={() => setSelectedTicket(ticket)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages} ({totalSales} ventas
                    totales)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadSales(filters, currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
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
                              onClick={() => loadSales(filters, pageNum)}
                              disabled={loading}
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
                      onClick={() => loadSales(filters, currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedTicket && (
        <DetalleVentaModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}
