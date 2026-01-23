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

interface FiltrosInventario {
  busqueda: string;
  ubicacion: "todos" | "gym" | "bodega";
  estado: "todos" | "stock_ok" | "bajo_stock" | "sin_stock";
  ordenarPor: "nombre" | "stockGym" | "stockBodega" | "stockTotal" | "valor";
  orden: "asc" | "desc";
}

interface InventarioFiltrosProps {
  onFiltrar: (filtros: FiltrosInventario) => void;
}

export default function InventarioFiltros({
  onFiltrar,
}: InventarioFiltrosProps) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosInventario>({
    busqueda: "",
    ubicacion: "todos",
    estado: "todos",
    ordenarPor: "nombre",
    orden: "asc",
  });

  const handleChange = (key: keyof FiltrosInventario, value: any) => {
    const nuevosFiltros = { ...filtros, [key]: value };
    setFiltros(nuevosFiltros);
    onFiltrar(nuevosFiltros);
  };

  const limpiarFiltros = () => {
    const filtrosLimpios: FiltrosInventario = {
      busqueda: "",
      ubicacion: "todos",
      estado: "todos",
      ordenarPor: "nombre",
      orden: "asc",
    };
    setFiltros(filtrosLimpios);
    onFiltrar(filtrosLimpios);
  };

  const hayFiltrosActivos =
    filtros.busqueda ||
    filtros.ubicacion !== "todos" ||
    filtros.estado !== "todos";

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Búsqueda Rápida */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar producto..."
              value={filtros.busqueda}
              onChange={(e) => handleChange("busqueda", e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          {hayFiltrosActivos && (
            <Button variant="ghost" onClick={limpiarFiltros} className="gap-2">
              <X className="h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Filtros Avanzados */}
        {mostrarFiltros && (
          <div className="grid gap-4 md:grid-cols-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Ubicación</Label>
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
              <Label>Estado</Label>
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
              <Label>Ordenar Por</Label>
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
              <Label>Orden</Label>
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
