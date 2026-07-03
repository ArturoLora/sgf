"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, X } from "lucide-react";
import { EmployeeFilters } from "./EmployeeFilters";
import { EmployeeTable } from "./EmployeeTable";
import { CrearEmpleadoModal } from "./CrearEmpleadoModal";
import { EditarEmpleadoModal } from "./EditarEmpleadoModal";
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

  const [modalCrear, setModalCrear] = useState(false);
  const [employeeEditar, setEmployeeEditar] = useState<Employee | null>(null);

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

  const handleEditar = useCallback((employee: Employee) => {
    setEmployeeEditar(employee);
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
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleActualizar}
            disabled={loading}
            className="gap-2 flex-1 sm:flex-initial"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            onClick={() => setModalCrear(true)}
            className="gap-2 flex-1 sm:flex-initial"
          >
            <Plus className="h-4 w-4" />
            Nuevo Empleado
          </Button>
        </div>
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
          <EmployeeTable
            employees={empleadosFiltrados}
            onEditar={handleEditar}
          />
        </CardContent>
      </Card>

      <CrearEmpleadoModal
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        onSuccess={handleActualizar}
      />

      <EditarEmpleadoModal
        employee={employeeEditar}
        onClose={() => setEmployeeEditar(null)}
        onSuccess={handleActualizar}
      />
    </div>
  );
}
