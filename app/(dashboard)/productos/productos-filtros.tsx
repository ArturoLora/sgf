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

interface ProductFilters {
  search: string;
  status: "todos" | "activos" | "inactivos" | "bajoStock";
  orderBy: "name" | "salePrice" | "gymStock" | "warehouseStock";
  order: "asc" | "desc";
}

interface ProductosFiltrosProps {
  onFilter: (filters: ProductFilters) => void;
}

export default function ProductosFiltros({ onFilter }: ProductosFiltrosProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    status: "todos",
    orderBy: "name",
    order: "asc",
  });

  const handleChange = (key: keyof ProductFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const clearFilters = () => {
    const cleanFilters: ProductFilters = {
      search: "",
      status: "todos",
      orderBy: "name",
      order: "asc",
    };
    setFilters(cleanFilters);
    onFilter(cleanFilters);
  };

  const hasActiveFilters = filters.search || filters.status !== "todos";

  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Quick search */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar producto..."
              value={filters.search}
              onChange={(e) => handleChange("search", e.target.value)}
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
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Limpiar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-3 sm:pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-sm">Estado</Label>
              <Select
                value={filters.status}
                onValueChange={(value: any) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                  <SelectItem value="bajoStock">Stock Bajo</SelectItem>
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
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="salePrice">Precio</SelectItem>
                  <SelectItem value="gymStock">Stock Gym</SelectItem>
                  <SelectItem value="warehouseStock">Stock Bodega</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Orden</Label>
              <Select
                value={filters.order}
                onValueChange={(value: any) => handleChange("order", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascendente</SelectItem>
                  <SelectItem value="desc">Descendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
