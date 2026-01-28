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

export interface FiltrosInventario {
  busqueda: string;
  ubicacion: "todos" | "gym" | "bodega";
  estado: "todos" | "stock_ok" | "bajo_stock" | "sin_stock";
  ordenarPor: "nombre" | "stockGym" | "stockBodega" | "stockTotal" | "valor";
  orden: "asc" | "desc";
}

interface InventarioFiltrosProps {
  filtros: FiltrosInventario;
  onCambiarFiltros: (filtros: FiltrosInventario) => void;
}

export default function InventarioFiltros({
  filtros,
  onCambiarFiltros,
}: InventarioFiltrosProps) {
  const [mostrarAvanzados, setMostrarAvanzados] = useState(false);

  const handleChange = (key: keyof FiltrosInventario, value: any) => {
    onCambiarFiltros({ ...filtros, [key]: value });
  };

  const limpiarFiltros = () => {
    onCambiarFiltros({
      busqueda: "",
      ubicacion: "todos",
      estado: "todos",
      ordenarPor: "nombre",
      orden: "asc",
    });
  };

  const hayFiltrosActivos =
    filtros.busqueda ||
    filtros.ubicacion !== "todos" ||
    filtros.estado !== "todos";

  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Búsqueda y botones principales */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar producto..."
              value={filtros.busqueda}
              onChange={(e) => handleChange("busqueda", e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setMostrarAvanzados(!mostrarAvanzados)}
              className="gap-2 flex-1 sm:flex-initial"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
            {hayFiltrosActivos && (
              <Button
                variant="ghost"
                onClick={limpiarFiltros}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Limpiar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filtros avanzados */}
        {mostrarAvanzados && (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pt-3 sm:pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-sm">Ubicación</Label>
              <Select
                value={filtros.ubicacion}
                onValueChange={(value: any) => handleChange("ubicacion", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="gym">Gym</SelectItem>
                  <SelectItem value="bodega">Bodega</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Estado</Label>
              <Select
                value={filtros.estado}
                onValueChange={(value: any) => handleChange("estado", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="stock_ok">Stock OK</SelectItem>
                  <SelectItem value="bajo_stock">Stock Bajo</SelectItem>
                  <SelectItem value="sin_stock">Sin Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Ordenar Por</Label>
              <Select
                value={filtros.ordenarPor}
                onValueChange={(value: any) =>
                  handleChange("ordenarPor", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nombre">Nombre</SelectItem>
                  <SelectItem value="stockGym">Stock Gym</SelectItem>
                  <SelectItem value="stockBodega">Stock Bodega</SelectItem>
                  <SelectItem value="stockTotal">Stock Total</SelectItem>
                  <SelectItem value="valor">Valor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Orden</Label>
              <Select
                value={filtros.orden}
                onValueChange={(value: any) => handleChange("orden", value)}
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
