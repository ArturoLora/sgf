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

interface FiltrosProductos {
  busqueda: string;
  estado: "todos" | "activos" | "inactivos" | "bajoStock";
  ordenarPor: "nombre" | "precioVenta" | "existenciaGym" | "existenciaBodega";
  orden: "asc" | "desc";
}

interface ProductosFiltrosProps {
  onFiltrar: (filtros: FiltrosProductos) => void;
}

export default function ProductosFiltros({ onFiltrar }: ProductosFiltrosProps) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosProductos>({
    busqueda: "",
    estado: "todos",
    ordenarPor: "nombre",
    orden: "asc",
  });

  const handleChange = (key: keyof FiltrosProductos, value: any) => {
    const nuevosFiltros = { ...filtros, [key]: value };
    setFiltros(nuevosFiltros);
    onFiltrar(nuevosFiltros);
  };

  const limpiarFiltros = () => {
    const filtrosLimpios: FiltrosProductos = {
      busqueda: "",
      estado: "todos",
      ordenarPor: "nombre",
      orden: "asc",
    };
    setFiltros(filtrosLimpios);
    onFiltrar(filtrosLimpios);
  };

  const hayFiltrosActivos = filtros.busqueda || filtros.estado !== "todos";

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
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

        {mostrarFiltros && (
          <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
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
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                  <SelectItem value="bajoStock">Stock Bajo</SelectItem>
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
                  <SelectItem value="precioVenta">Precio</SelectItem>
                  <SelectItem value="existenciaGym">Stock Gym</SelectItem>
                  <SelectItem value="existenciaBodega">Stock Bodega</SelectItem>
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
