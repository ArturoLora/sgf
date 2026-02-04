"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  HistorialVentasFiltersSchema,
  type HistorialVentasFilters,
  type CashierOption,
  type ProductOption,
  type MemberOption,
} from "@/types/api/sales";

interface HistorialFiltrosProps {
  onFilter: (filters: HistorialVentasFilters) => void;
  cashiers: CashierOption[];
  products: ProductOption[];
  members: MemberOption[];
  loading: boolean;
}

export function HistorialFiltros({
  onFilter,
  cashiers,
  products,
  members,
  loading,
}: HistorialFiltrosProps) {
  const [showFilters, setShowFilters] = useState(false);

  const { register, handleSubmit, setValue, getValues, reset } =
    useForm<HistorialVentasFilters>({
      resolver: zodResolver(HistorialVentasFiltersSchema),
      defaultValues: {
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
      },
    });

  const onSubmit = useCallback(
    (data: HistorialVentasFilters) => {
      onFilter(data);
    },
    [onFilter],
  );

  const handleClearFilters = useCallback(() => {
    reset();
    onFilter({
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
  }, [reset, onFilter]);

  const setDefaultRange = useCallback(
    (type: "today" | "week" | "month") => {
      const today = new Date();
      const end = today.toISOString().split("T")[0];
      let start = "";

      switch (type) {
        case "today":
          start = end;
          break;
        case "week": {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          start = weekAgo.toISOString().split("T")[0];
          break;
        }
        case "month": {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          start = monthAgo.toISOString().split("T")[0];
          break;
        }
      }

      setValue("startDate", start);
      setValue("endDate", end);
      handleSubmit(onSubmit)();
    },
    [setValue, handleSubmit, onSubmit],
  );

  const checkHasActiveFilters = useCallback(() => {
    const values = getValues();
    return (
      values.search ||
      values.startDate ||
      values.endDate ||
      (values.cashier && values.cashier !== "todos") ||
      (values.product && values.product !== "todos") ||
      (values.member && values.member !== "todos") ||
      (values.paymentMethod && values.paymentMethod !== "todos") ||
      !values.onlyActive
    );
  }, [getValues]);

  const hasActiveFilters = checkHasActiveFilters();

  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Search & Actions - responsive layout */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ventas..."
                {...register("search")}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="gap-2 flex-1 sm:flex-initial sm:min-w-25"
              >
                {loading ? "Buscando..." : "Buscar"}
              </Button>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClearFilters}
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
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDefaultRange("today")}
              className="flex-1 sm:flex-initial"
            >
              <Calendar className="h-3 w-3 sm:mr-1" />
              <span className="text-xs sm:text-sm">Hoy</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDefaultRange("week")}
              className="flex-1 sm:flex-initial"
            >
              <span className="text-xs sm:text-sm">7 días</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDefaultRange("month")}
              className="flex-1 sm:flex-initial"
            >
              <span className="text-xs sm:text-sm">30 días</span>
            </Button>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="flex sm:hidden gap-1"
              >
                <X className="h-3 w-3" />
                <span className="text-xs">Limpiar</span>
              </Button>
            )}
          </div>

          {/* Advanced Filters - responsive grid */}
          {showFilters && (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-3 sm:pt-4 border-t border-border">
              <div className="space-y-2">
                <Label className="text-sm">Fecha Inicio</Label>
                <Input type="date" {...register("startDate")} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Fecha Fin</Label>
                <Input type="date" {...register("endDate")} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Cajero</Label>
                <Select
                  value={getValues("cashier")}
                  onValueChange={(value) => setValue("cashier", value)}
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
                  value={getValues("product")}
                  onValueChange={(value) => setValue("product", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {products.map((product) => (
                      <SelectItem
                        key={product.id}
                        value={product.id.toString()}
                      >
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Cliente</Label>
                <Select
                  value={getValues("member")}
                  onValueChange={(value) => setValue("member", value)}
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
                  value={getValues("productType")}
                  onValueChange={(value) =>
                    setValue(
                      "productType",
                      value as "todos" | "membresias" | "productos",
                    )
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
                  value={getValues("paymentMethod")}
                  onValueChange={(value) => setValue("paymentMethod", value)}
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
                  value={getValues("orderBy")}
                  onValueChange={(value) =>
                    setValue(
                      "orderBy",
                      value as HistorialVentasFilters["orderBy"],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">
                      Fecha (más reciente)
                    </SelectItem>
                    <SelectItem value="date_asc">
                      Fecha (más antiguo)
                    </SelectItem>
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
                    {...register("onlyActive")}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">Solo ventas activas</span>
                </label>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
