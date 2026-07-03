"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { EmployeeFilters } from "./EmployeeFilters";
import { EmployeeTable } from "./EmployeeTable";
import type { Employee } from "@/modules/users/types";
import {
  FILTROS_INICIALES,
  filtrarEmpleados,
  type EmployeeFilters as EmployeeFiltersState,
} from "@/modules/users/domain/employee-filters";
import { fetchEmployees } from "@/lib/api/users.client";

interface UsuariosManagerProps {
  initialEmployees: Employee[];
}

export function UsuariosManager({ initialEmployees }: UsuariosManagerProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState<EmployeeFiltersState>(
    FILTROS_INICIALES,
  );

  const empleadosFiltrados = useMemo(
    () => filtrarEmpleados(employees, filtros),
    [employees, filtros],
  );

  const handleActualizar = useCallback(async () => {
    setLoading(true);
    const result = await fetchEmployees();
    if (result.ok) {
      setEmployees(result.data);
      setError("");
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Usuarios</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Administración de empleados
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleActualizar}
          disabled={loading}
          className="gap-2 w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex justify-between items-start gap-2 dark:bg-red-950 dark:text-red-400">
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <EmployeeFilters filtros={filtros} onChange={setFiltros} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>Empleados</span>
            <span className="text-xs sm:text-sm font-normal text-muted-foreground">
              {empleadosFiltrados.length} resultados
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeTable employees={empleadosFiltrados} />
        </CardContent>
      </Card>
    </div>
  );
}
