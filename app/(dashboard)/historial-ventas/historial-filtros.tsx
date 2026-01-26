// app/(dashboard)/historial-ventas/historial-filtros.tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter } from "lucide-react";

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

interface HistorialFiltrosProps {
  onFilter: (filters: SalesFilters) => void;
  cashiers: Array<{ id: string; name: string }>;
  products: Array<{ id: number; name: string }>;
  members: Array<{ id: number; memberNumber: string; name: string | null }>;
  loading: boolean;
}

export default function HistorialFiltros({
  onFilter,
  cashiers,
  products,
  members,
  loading,
}: HistorialFiltrosProps) {
  const [showFilters, setShowFilters] = useState(false);
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

  const handleChange = (key: keyof SalesFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const applyFilters = () => {
    onFilter(filters);
  };

  const clearFilters = () => {
    const cleanFilters: SalesFilters = {
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
    };
    setFilters(cleanFilters);
    onFilter(cleanFilters);
  };

  const hasActiveFilters =
    filters.search ||
    filters.startDate ||
    filters.endDate ||
    filters.cashier !== "todos" ||
    filters.product !== "todos" ||
    filters.member !== "todos" ||
    filters.paymentMethod !== "todos" ||
    !filters.onlyActive;

  const setDefaultRange = (type: "today" | "week" | "month") => {
    const today = new Date();
    const end = today.toISOString().split("T")[0];
    let start = "";

    switch (type) {
      case "today":
        start = end;
        break;
      case "week":
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        start = weekAgo.toISOString().split("T")[0];
        break;
      case "month":
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        start = monthAgo.toISOString().split("T")[0];
        break;
    }

    const newFilters = {
      ...filters,
      startDate: start,
      endDate: end,
    };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por ticket, producto, cliente, cajero..."
              value={filters.search}
              onChange={(e) => handleChange("search", e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          <Button
            onClick={applyFilters}
            disabled={loading}
            className="gap-2 min-w-[100px]"
          >
            {loading ? "Buscando..." : "Buscar"}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDefaultRange("today")}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDefaultRange("week")}
          >
            Última semana
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDefaultRange("month")}
          >
            Último mes
          </Button>
        </div>

        {showFilters && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Cajero</Label>
              <Select
                value={filters.cashier}
                onValueChange={(value) => handleChange("cashier", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {cashiers.map((cashier) => (
                    <SelectItem key={cashier.id} value={cashier.id}>
                      {cashier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Producto</Label>
              <Select
                value={filters.product}
                onValueChange={(value) => handleChange("product", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={filters.member}
                onValueChange={(value) => handleChange("member", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name || member.memberNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Producto</Label>
              <Select
                value={filters.productType}
                onValueChange={(value: any) =>
                  handleChange("productType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="membresias">Membresías</SelectItem>
                  <SelectItem value="productos">Productos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pago</Label>
              <Select
                value={filters.paymentMethod}
                onValueChange={(value) => handleChange("paymentMethod", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="DEBIT_CARD">Tarjeta Débito</SelectItem>
                  <SelectItem value="CREDIT_CARD">Tarjeta Crédito</SelectItem>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ordenar Por</Label>
              <Select
                value={filters.orderBy}
                onValueChange={(value: any) => handleChange("orderBy", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="ticket">Ticket</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Orden</Label>
              <Select
                value={filters.order}
                onValueChange={(value: any) => handleChange("order", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Más reciente</SelectItem>
                  <SelectItem value="asc">Más antiguo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onlyActive}
                  onChange={(e) => handleChange("onlyActive", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">Solo ventas activas</span>
              </label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
