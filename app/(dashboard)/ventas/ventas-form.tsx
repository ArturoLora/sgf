"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Plus, User } from "lucide-react";

interface Producto {
  id: number;
  nombre: string;
  precioVenta: number;
  existenciaGym: number;
  activo: boolean;
}

interface VentasFormProps {
  productos: Producto[];
  onAgregarProducto: (producto: Producto) => void;
  clienteId: number | null;
  onClienteChange: (id: number | null) => void;
  deshabilitado?: boolean;
}

export default function VentasForm({
  productos,
  onAgregarProducto,
  clienteId,
  onClienteChange,
  deshabilitado,
}: VentasFormProps) {
  const [busqueda, setBusqueda] = useState("");
  const [numeroCliente, setNumeroCliente] = useState("");

  // Filtrar productos activos y con stock (excepto membresías)
  const productosDisponibles = useMemo(() => {
    const query = busqueda.toLowerCase();
    return productos
      .filter((p) => p.activo)
      .filter((p) => {
        const esMembresia =
          p.nombre.includes("EFECTIVO") ||
          p.nombre.includes("VISITA") ||
          p.nombre.includes("MENSUALIDAD") ||
          p.nombre.includes("SEMANA") ||
          p.nombre.includes("TRIMESTRE") ||
          p.nombre.includes("ANUAL");

        return esMembresia || p.existenciaGym > 0;
      })
      .filter((p) => p.nombre.toLowerCase().includes(query))
      .slice(0, 10);
  }, [productos, busqueda]);

  const buscarCliente = async () => {
    if (!numeroCliente.trim()) {
      onClienteChange(null);
      return;
    }

    try {
      const res = await fetch(
        `/api/members?search=${encodeURIComponent(numeroCliente)}`,
      );
      if (!res.ok) throw new Error("Cliente no encontrado");

      const miembros = await res.json();
      if (miembros.length > 0) {
        onClienteChange(miembros[0].id);
      } else {
        alert("Cliente no encontrado");
        onClienteChange(null);
      }
    } catch (error) {
      alert("Error al buscar cliente");
      onClienteChange(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Búsqueda de cliente */}
        <div className="space-y-2">
          <Label className="text-sm">Cliente (Opcional)</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                disabled={deshabilitado}
                placeholder="Número de cliente..."
                value={numeroCliente}
                onChange={(e) => setNumeroCliente(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") buscarCliente();
                }}
                className="pl-9"
              />
            </div>
            <Button
              onClick={buscarCliente}
              variant="outline"
              disabled={deshabilitado}
            >
              Buscar
            </Button>
            {clienteId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setNumeroCliente("");
                  onClienteChange(null);
                }}
              >
                Limpiar
              </Button>
            )}
          </div>
          {clienteId && (
            <p className="text-xs text-green-600">✓ Cliente seleccionado</p>
          )}
        </div>

        {/* Búsqueda de producto */}
        <div className="space-y-2">
          <Label className="text-sm">Buscar Producto</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              disabled={deshabilitado}
              placeholder="Escribe para buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Lista de productos */}
        {busqueda && (
          <div className="max-h-64 sm:max-h-80 overflow-y-auto space-y-2 border rounded-lg p-2">
            {productosDisponibles.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">
                No se encontraron productos
              </p>
            ) : (
              productosDisponibles.map((producto) => (
                <div
                  key={producto.id}
                  className="flex items-center justify-between p-2 sm:p-3 rounded border hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">
                      {producto.nombre}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      ${Number(producto.precioVenta).toFixed(2)}
                      {producto.existenciaGym > 0 && (
                        <span className="ml-2">
                          Stock: {producto.existenciaGym}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    disabled={deshabilitado}
                    size="sm"
                    onClick={() => {
                      onAgregarProducto(producto);
                      setBusqueda("");
                    }}
                    className="gap-1 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Agregar</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
