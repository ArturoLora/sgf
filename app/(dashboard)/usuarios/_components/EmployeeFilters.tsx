"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import {
  type EmployeeFilters as EmployeeFiltersState,
  hayFiltrosActivos,
} from "@/modules/users/domain/employee-filters";

interface EmployeeFiltersProps {
  filtros: EmployeeFiltersState;
  onChange: (filtros: EmployeeFiltersState) => void;
}

export function EmployeeFilters({ filtros, onChange }: EmployeeFiltersProps) {
  const handleChange = <K extends keyof EmployeeFiltersState>(
    key: K,
    value: EmployeeFiltersState[K],
  ) => {
    onChange({ ...filtros, [key]: value });
  };

  const limpiarFiltros = () => {
    onChange({ busqueda: "", rol: "todos", estado: "todos" });
  };

  const activos = hayFiltrosActivos(filtros);

  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o correo..."
              value={filtros.busqueda}
              onChange={(e) => handleChange("busqueda", e.target.value)}
              className="pl-9"
            />
          </div>
          {activos && (
            <Button variant="ghost" onClick={limpiarFiltros} className="gap-2">
              <X className="h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Rol</label>
            <Select
              value={filtros.rol}
              onValueChange={(value: EmployeeFiltersState["rol"]) =>
                handleChange("rol", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
                <SelectItem value="EMPLEADO">Empleado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select
              value={filtros.estado}
              onValueChange={(value: EmployeeFiltersState["estado"]) =>
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
        </div>
      </CardContent>
    </Card>
  );
}
