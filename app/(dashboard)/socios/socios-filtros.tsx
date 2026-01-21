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

interface FiltrosSocios {
  busqueda: string;
  tipoMembresia: string;
  estado: "todos" | "activos" | "vencidos" | "proximos";
  ordenarPor: "nombre" | "numero" | "fechaFin" | "visitas";
  orden: "asc" | "desc";
}

interface SociosFiltrosProps {
  onFiltrar: (filtros: FiltrosSocios) => void;
}

export default function SociosFiltros({ onFiltrar }: SociosFiltrosProps) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosSocios>({
    busqueda: "",
    tipoMembresia: "todos",
    estado: "todos",
    ordenarPor: "nombre",
    orden: "asc",
  });

  const handleChange = (key: keyof FiltrosSocios, value: any) => {
    const nuevosFiltros = { ...filtros, [key]: value };
    setFiltros(nuevosFiltros);
    onFiltrar(nuevosFiltros);
  };

  const limpiarFiltros = () => {
    const filtrosLimpios: FiltrosSocios = {
      busqueda: "",
      tipoMembresia: "todos",
      estado: "todos",
      ordenarPor: "nombre",
      orden: "asc",
    };
    setFiltros(filtrosLimpios);
    onFiltrar(filtrosLimpios);
  };

  const hayFiltrosActivos =
    filtros.busqueda ||
    filtros.tipoMembresia !== "todos" ||
    filtros.estado !== "todos";

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Búsqueda Rápida */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por número, nombre, teléfono, email..."
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
              <Label>Tipo de Membresía</Label>
              <Select
                value={filtros.tipoMembresia}
                onValueChange={(value) => handleChange("tipoMembresia", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="VISITA">Visita</SelectItem>
                  <SelectItem value="SEMANA">Semana</SelectItem>
                  <SelectItem value="MES_ESTUDIANTE">Mes Estudiante</SelectItem>
                  <SelectItem value="MES_GENERAL">Mes General</SelectItem>
                  <SelectItem value="TRIMESTRE_ESTUDIANTE">
                    Trimestre Estudiante
                  </SelectItem>
                  <SelectItem value="TRIMESTRE_GENERAL">
                    Trimestre General
                  </SelectItem>
                  <SelectItem value="ANUAL_ESTUDIANTE">
                    Anual Estudiante
                  </SelectItem>
                  <SelectItem value="ANUAL_GENERAL">Anual General</SelectItem>
                  <SelectItem value="PROMOCION">Promoción</SelectItem>
                  <SelectItem value="RENACER">Renacer</SelectItem>
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
                  <SelectItem value="vencidos">Vencidos</SelectItem>
                  <SelectItem value="proximos">Próximos a vencer</SelectItem>
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
                  <SelectItem value="numero">Número</SelectItem>
                  <SelectItem value="fechaFin">Fecha de Vencimiento</SelectItem>
                  <SelectItem value="visitas">Visitas</SelectItem>
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
