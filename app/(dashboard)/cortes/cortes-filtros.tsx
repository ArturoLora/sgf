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

interface FiltrosCorte {
  busqueda: string;
  fechaInicio: string;
  fechaFin: string;
  cajero: string;
  estado: "todos" | "abiertos" | "cerrados";
  ordenarPor: "fecha_desc" | "fecha_asc" | "folio_desc" | "folio_asc";
}

interface CortesFiltrosProps {
  onFiltrar: (filtros: FiltrosCorte) => void;
  cajeros: Array<{ id: string; name: string }>;
  loading: boolean;
}

export default function CortesFiltros({
  onFiltrar,
  cajeros,
  loading,
}: CortesFiltrosProps) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosCorte>({
    busqueda: "",
    fechaInicio: "",
    fechaFin: "",
    cajero: "todos",
    estado: "todos",
    ordenarPor: "fecha_desc",
  });

  const handleChange = (key: keyof FiltrosCorte, value: any) => {
    const nuevosFiltros = { ...filtros, [key]: value };
    setFiltros(nuevosFiltros);
  };

  const aplicarFiltros = () => {
    onFiltrar(filtros);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      aplicarFiltros();
    }
  };

  const limpiarFiltros = () => {
    const filtrosLimpios: FiltrosCorte = {
      busqueda: "",
      fechaInicio: "",
      fechaFin: "",
      cajero: "todos",
      estado: "todos",
      ordenarPor: "fecha_desc",
    };
    setFiltros(filtrosLimpios);
    onFiltrar(filtrosLimpios);
  };

  const establecerRangoFecha = (tipo: "hoy" | "semana" | "mes") => {
    const hoy = new Date();
    const fin = hoy.toISOString().split("T")[0];
    let inicio = "";

    switch (tipo) {
      case "hoy":
        inicio = fin;
        break;
      case "semana":
        const semanaAtras = new Date(hoy);
        semanaAtras.setDate(semanaAtras.getDate() - 7);
        inicio = semanaAtras.toISOString().split("T")[0];
        break;
      case "mes":
        const mesAtras = new Date(hoy);
        mesAtras.setMonth(mesAtras.getMonth() - 1);
        inicio = mesAtras.toISOString().split("T")[0];
        break;
    }

    const nuevosFiltros = {
      ...filtros,
      fechaInicio: inicio,
      fechaFin: fin,
    };
    setFiltros(nuevosFiltros);
    onFiltrar(nuevosFiltros);
  };

  const hayFiltrosActivos =
    filtros.busqueda ||
    filtros.fechaInicio ||
    filtros.fechaFin ||
    filtros.cajero !== "todos" ||
    filtros.estado !== "todos";

  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Búsqueda y Acciones */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por folio..."
              value={filtros.busqueda}
              onChange={(e) => handleChange("busqueda", e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="gap-2 flex-1 sm:flex-initial"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
            <Button
              onClick={aplicarFiltros}
              disabled={loading}
              className="gap-2 flex-1 sm:flex-initial sm:min-w-[100px]"
            >
              {loading ? "Buscando..." : "Buscar"}
            </Button>
            {hayFiltrosActivos && (
              <Button
                variant="ghost"
                onClick={limpiarFiltros}
                className="gap-2 hidden sm:flex"
              >
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Filtros Rápidos de Fecha */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => establecerRangoFecha("hoy")}
            className="flex-1 sm:flex-initial"
          >
            <Calendar className="h-3 w-3 sm:mr-1" />
            <span className="text-xs sm:text-sm">Hoy</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => establecerRangoFecha("semana")}
            className="flex-1 sm:flex-initial"
          >
            <span className="text-xs sm:text-sm">7 días</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => establecerRangoFecha("mes")}
            className="flex-1 sm:flex-initial"
          >
            <span className="text-xs sm:text-sm">30 días</span>
          </Button>
          {hayFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limpiarFiltros}
              className="flex sm:hidden gap-1"
            >
              <X className="h-3 w-3" />
              <span className="text-xs">Limpiar</span>
            </Button>
          )}
        </div>

        {/* Filtros Avanzados */}
        {mostrarFiltros && (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-3 sm:pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-sm">Fecha Inicio</Label>
              <Input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => handleChange("fechaInicio", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Fecha Fin</Label>
              <Input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => handleChange("fechaFin", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Cajero</Label>
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
                  <SelectItem value="abiertos">Abiertos</SelectItem>
                  <SelectItem value="cerrados">Cerrados</SelectItem>
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
                  <SelectItem value="fecha_desc">
                    Fecha (más reciente)
                  </SelectItem>
                  <SelectItem value="fecha_asc">Fecha (más antiguo)</SelectItem>
                  <SelectItem value="folio_desc">Folio (Z-A)</SelectItem>
                  <SelectItem value="folio_asc">Folio (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
