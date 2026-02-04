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

export interface SociosFiltros {
  busqueda: string;
  estado: "todos" | "activos" | "inactivos";
  vigencia: "todos" | "vigentes" | "vencidos" | "sin_membresia";
  tipoMembresia: string;
  ordenarPor: "numero" | "nombre" | "fecha_registro" | "visitas";
  orden: "asc" | "desc";
}

interface SociosFiltrosProps {
  onFiltrar: (filtros: SociosFiltros) => void;
}

const TIPOS_MEMBRESIA = [
  { value: "VISIT", label: "Visita" },
  { value: "WEEK", label: "Semana" },
  { value: "MONTH_STUDENT", label: "Mes Estudiante" },
  { value: "MONTH_GENERAL", label: "Mes General" },
  { value: "QUARTER_STUDENT", label: "Trimestre Estudiante" },
  { value: "QUARTER_GENERAL", label: "Trimestre General" },
  { value: "ANNUAL_STUDENT", label: "Anual Estudiante" },
  { value: "ANNUAL_GENERAL", label: "Anual General" },
  { value: "PROMOTION", label: "Promoción" },
  { value: "REBIRTH", label: "Renacer" },
  { value: "NUTRITION_CONSULTATION", label: "Consulta Nutrición" },
];

export function SociosFiltrosComponent({ onFiltrar }: SociosFiltrosProps) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState<SociosFiltros>({
    busqueda: "",
    estado: "activos",
    vigencia: "todos",
    tipoMembresia: "todos",
    ordenarPor: "numero",
    orden: "asc",
  });

  const handleChange = (key: keyof SociosFiltros, value: string) => {
    const nuevosFiltros = { ...filtros, [key]: value };
    setFiltros(nuevosFiltros);
    onFiltrar(nuevosFiltros);
  };

  const limpiarFiltros = () => {
    const filtrosLimpios: SociosFiltros = {
      busqueda: "",
      estado: "activos",
      vigencia: "todos",
      tipoMembresia: "todos",
      ordenarPor: "numero",
      orden: "asc",
    };
    setFiltros(filtrosLimpios);
    onFiltrar(filtrosLimpios);
  };

  const hayFiltrosActivos =
    filtros.busqueda ||
    filtros.estado !== "activos" ||
    filtros.vigencia !== "todos" ||
    filtros.tipoMembresia !== "todos";

  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Búsqueda y acciones */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, número, teléfono o email..."
              value={filtros.busqueda}
              onChange={(e) => handleChange("busqueda", e.target.value)}
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

        {/* Filtros rápidos - mobile stacked */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filtros.estado === "activos" ? "default" : "outline"}
            size="sm"
            onClick={() => handleChange("estado", "activos")}
            className="flex-1 sm:flex-initial text-xs sm:text-sm"
          >
            Activos
          </Button>
          <Button
            variant={filtros.vigencia === "vigentes" ? "default" : "outline"}
            size="sm"
            onClick={() => handleChange("vigencia", "vigentes")}
            className="flex-1 sm:flex-initial text-xs sm:text-sm"
          >
            Vigentes
          </Button>
          <Button
            variant={filtros.vigencia === "vencidos" ? "default" : "outline"}
            size="sm"
            onClick={() => handleChange("vigencia", "vencidos")}
            className="flex-1 sm:flex-initial text-xs sm:text-sm"
          >
            Vencidos
          </Button>
          {hayFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limpiarFiltros}
              className="flex sm:hidden gap-1 text-xs"
            >
              <X className="h-3 w-3" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Filtros avanzados */}
        {mostrarFiltros && (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pt-3 sm:pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-sm">Estado</Label>
              <Select
                value={filtros.estado}
                onValueChange={(value: SociosFiltros["estado"]) =>
                  handleChange("estado", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Vigencia</Label>
              <Select
                value={filtros.vigencia}
                onValueChange={(value: SociosFiltros["vigencia"]) =>
                  handleChange("vigencia", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="vigentes">Vigentes</SelectItem>
                  <SelectItem value="vencidos">Vencidos</SelectItem>
                  <SelectItem value="sin_membresia">Sin Membresía</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Tipo de Membresía</Label>
              <Select
                value={filtros.tipoMembresia}
                onValueChange={(value) => handleChange("tipoMembresia", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {TIPOS_MEMBRESIA.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Ordenar Por</Label>
              <div className="flex gap-2">
                <Select
                  value={filtros.ordenarPor}
                  onValueChange={(value: SociosFiltros["ordenarPor"]) =>
                    handleChange("ordenarPor", value)
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numero">Número</SelectItem>
                    <SelectItem value="nombre">Nombre</SelectItem>
                    <SelectItem value="fecha_registro">Registro</SelectItem>
                    <SelectItem value="visitas">Visitas</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filtros.orden}
                  onValueChange={(value: SociosFiltros["orden"]) =>
                    handleChange("orden", value)
                  }
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">↑</SelectItem>
                    <SelectItem value="desc">↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
