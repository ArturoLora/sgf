// app/(dashboard)/cortes/cortes-filtros.tsx
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

interface FiltrosCortes {
  busqueda: string;
  fechaInicio: string;
  fechaFin: string;
  cajero: string;
  estado: "todos" | "activos" | "cerrados";
  ordenarPor: "fecha" | "total" | "diferencia" | "tickets";
  orden: "asc" | "desc";
}

interface CortesFiltrosProps {
  onFiltrar: (filtros: FiltrosCortes) => void;
  cajeros: Array<{ id: string; name: string }>;
}

export default function CortesFiltros({
  onFiltrar,
  cajeros,
}: CortesFiltrosProps) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosCortes>({
    busqueda: "",
    fechaInicio: "",
    fechaFin: "",
    cajero: "todos",
    estado: "todos",
    ordenarPor: "fecha",
    orden: "desc",
  });

  const handleChange = (key: keyof FiltrosCortes, value: string) => {
    const nuevosFiltros = { ...filtros, [key]: value };
    setFiltros(nuevosFiltros);
    onFiltrar(nuevosFiltros);
  };

  const limpiarFiltros = () => {
    const filtrosLimpios: FiltrosCortes = {
      busqueda: "",
      fechaInicio: "",
      fechaFin: "",
      cajero: "todos",
      estado: "todos",
      ordenarPor: "fecha",
      orden: "desc",
    };
    setFiltros(filtrosLimpios);
    onFiltrar(filtrosLimpios);
  };

  const hayFiltrosActivos =
    filtros.busqueda ||
    filtros.fechaInicio ||
    filtros.fechaFin ||
    filtros.cajero !== "todos" ||
    filtros.estado !== "todos";

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Búsqueda Rápida */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por folio, cajero, observaciones..."
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => handleChange("fechaInicio", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => handleChange("fechaFin", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Cajero</Label>
              <Select
                value={filtros.cajero}
                onValueChange={(value) => handleChange("cajero", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {cajeros.map((cajero) => (
                    <SelectItem key={cajero.id} value={cajero.id}>
                      {cajero.name}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="cerrados">Cerrados</SelectItem>
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
                  <SelectItem value="fecha">Fecha</SelectItem>
                  <SelectItem value="total">Total Ventas</SelectItem>
                  <SelectItem value="diferencia">Diferencia</SelectItem>
                  <SelectItem value="tickets">Tickets</SelectItem>
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
                  <SelectItem value="desc">Mayor a Menor</SelectItem>
                  <SelectItem value="asc">Menor a Mayor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
