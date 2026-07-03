"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Power, KeyRound, Mail } from "lucide-react";
import type { Employee } from "@/modules/users/types";

interface EmployeeTableProps {
  employees: Employee[];
  onEditar: (employee: Employee) => void;
}

function RoleBadge({ role }: { role: Employee["role"] }) {
  return role === "ADMIN" ? (
    <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
      Administrador
    </Badge>
  ) : (
    <Badge variant="outline">Empleado</Badge>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
      Activo
    </Badge>
  ) : (
    <Badge
      variant="destructive"
      className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
    >
      Inactivo
    </Badge>
  );
}

// Power/KeyRound quedan deshabilitados — anclajes visuales para Stories
// 3.4 (activar/desactivar) y 3.5 (reiniciar contraseña). Editar se habilita
// en Story 3.3 con lógica real; Power/KeyRound siguen sin cambios (AC8/3.2).
function EmployeeActions({
  employee,
  onEditar,
}: {
  employee: Employee;
  onEditar: (employee: Employee) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onEditar(employee)}
        title="Editar"
        className="h-8 w-8 p-0"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled
        title="Activar/Desactivar — disponible en una próxima historia"
        className="h-8 w-8 p-0"
      >
        <Power className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled
        title="Reiniciar contraseña — disponible en una próxima historia"
        className="h-8 w-8 p-0"
      >
        <KeyRound className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function EmployeeTable({ employees, onEditar }: EmployeeTableProps) {
  if (employees.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No se encontraron empleados
      </p>
    );
  }

  return (
    <>
      {/* Vista móvil - Cards */}
      <div className="space-y-3 sm:hidden">
        {employees.map((employee) => (
          <div
            key={employee.id}
            className={`border rounded-lg p-3 ${
              !employee.isActive ? "bg-muted opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <p className="font-medium truncate">{employee.name}</p>
              <StatusBadge isActive={employee.isActive} />
            </div>
            <div className="space-y-1 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{employee.email}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <RoleBadge role={employee.role} />
              <EmployeeActions employee={employee} onEditar={onEditar} />
            </div>
          </div>
        ))}
      </div>

      {/* Vista desktop - Tabla */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted">
              <th className="text-left p-3 font-semibold text-sm">Nombre</th>
              <th className="text-left p-3 font-semibold text-sm">Correo</th>
              <th className="text-center p-3 font-semibold text-sm">Rol</th>
              <th className="text-center p-3 font-semibold text-sm">Estado</th>
              <th className="text-center p-3 font-semibold text-sm">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr
                key={employee.id}
                className={`border-b hover:bg-muted/50 ${
                  !employee.isActive ? "opacity-60" : ""
                }`}
              >
                <td className="p-3">
                  <p className="font-medium">{employee.name}</p>
                </td>
                <td className="p-3">
                  <p className="text-sm text-muted-foreground">
                    {employee.email}
                  </p>
                </td>
                <td className="p-3 text-center">
                  <RoleBadge role={employee.role} />
                </td>
                <td className="p-3 text-center">
                  <StatusBadge isActive={employee.isActive} />
                </td>
                <td className="p-3">
                  <EmployeeActions employee={employee} onEditar={onEditar} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
