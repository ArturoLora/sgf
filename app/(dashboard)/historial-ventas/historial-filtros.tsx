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
import { Search, X, Filter, Calendar } from "lucide-react";

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
    orderBy: "date_desc",
    onlyActive: true,
  });

  const handleChange = (key: keyof SalesFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const applyFilters = () => {
    onFilter(filters);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applyFilters();
    }
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
      orderBy: "date_desc",
      onlyActive: true,
    };
    setFilters(cleanFilters);
    onFilter(cleanFilters);
  };

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

  const hasActiveFilters =
    filters.search ||
    filters.startDate ||
    filters.endDate ||
    filters.cashier !== "todos" ||
    filters.product !== "todos" ||
    filters.member !== "todos" ||
    filters.paymentMethod !== "todos" ||
    !filters.onlyActive;

  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Search & Actions - responsive layout */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar ventas..."
              value={filters.search}
              onChange={(e) => handleChange("search", e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 flex-1 sm:flex-initial"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
            <Button
              onClick={applyFilters}
              disabled={loading}
              className="gap-2 flex-1 sm:flex-initial sm:min-w-[100px]"
            >
              {loading ? "Buscando..." : "Buscar"}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="gap-2 hidden sm:flex"
              >
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Quick date filters - stack on mobile */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDefaultRange("today")}
            className="flex-1 sm:flex-initial"
          >
            <Calendar className="h-3 w-3 sm:mr-1" />
            <span className="text-xs sm:text-sm">Hoy</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDefaultRange("week")}
            className="flex-1 sm:flex-initial"
          >
            <span className="text-xs sm:text-sm">7 días</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDefaultRange("month")}
            className="flex-1 sm:flex-initial"
          >
            <span className="text-xs sm:text-sm">30 días</span>
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="flex sm:hidden gap-1"
            >
              <X className="h-3 w-3" />
              <span className="text-xs">Limpiar</span>
            </Button>
          )}
        </div>

        {/* Advanced Filters - responsive grid */}
        {showFilters && (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-3 sm:pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-sm">Fecha Inicio</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Fecha Fin</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Cajero</Label>
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
              <Label className="text-sm">Producto</Label>
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
              <Label className="text-sm">Cliente</Label>
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
              <Label className="text-sm">Tipo de Producto</Label>
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
              <Label className="text-sm">Forma de Pago</Label>
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
              <Label className="text-sm">Ordenar Por</Label>
              <Select
                value={filters.orderBy}
                onValueChange={(value: any) => handleChange("orderBy", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">
                    Fecha (más reciente)
                  </SelectItem>
                  <SelectItem value="date_asc">Fecha (más antiguo)</SelectItem>
                  <SelectItem value="total_desc">
                    Total (mayor a menor)
                  </SelectItem>
                  <SelectItem value="total_asc">
                    Total (menor a mayor)
                  </SelectItem>
                  <SelectItem value="ticket_desc">Ticket (Z-A)</SelectItem>
                  <SelectItem value="ticket_asc">Ticket (A-Z)</SelectItem>
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
