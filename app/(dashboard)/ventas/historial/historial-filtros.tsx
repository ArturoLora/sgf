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

interface FiltrosVentas {
  busqueda: string;
  fechaInicio: string;
  fechaFin: string;
  cajero: string;
  producto: string;
  socio: string;
  formaPago: string;
  tipoProducto: "todos" | "membresias" | "productos";
  ordenarPor: "fecha" | "total" | "ticket";
  orden: "asc" | "desc";
  soloActivas: boolean;
}

interface HistorialFiltrosProps {
  onFiltrar: (filtros: FiltrosVentas) => void;
  cajeros: Array<{ id: string; name: string }>;
  productos: Array<{ id: number; nombre: string }>;
  socios: Array<{ id: number; numeroSocio: string; nombre: string | null }>;
  loading: boolean;
}

export default function HistorialFiltros({
  onFiltrar,
  cajeros,
  productos,
  socios,
  loading,
}: HistorialFiltrosProps) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosVentas>({
    busqueda: "",
    fechaInicio: "",
    fechaFin: "",
    cajero: "todos",
    producto: "todos",
    socio: "todos",
    formaPago: "todos",
    tipoProducto: "todos",
    ordenarPor: "fecha",
    orden: "desc",
    soloActivas: true,
  });

  const handleChange = (key: keyof FiltrosVentas, value: any) => {
    const nuevosFiltros = { ...filtros, [key]: value };
    setFiltros(nuevosFiltros);
  };

  const aplicarFiltros = () => {
    onFiltrar(filtros);
  };

  const limpiarFiltros = () => {
    const filtrosLimpios: FiltrosVentas = {
      busqueda: "",
      fechaInicio: "",
      fechaFin: "",
      cajero: "todos",
      producto: "todos",
      socio: "todos",
      formaPago: "todos",
      tipoProducto: "todos",
      ordenarPor: "fecha",
      orden: "desc",
      soloActivas: true,
    };
    setFiltros(filtrosLimpios);
    onFiltrar(filtrosLimpios);
  };

  const hayFiltrosActivos =
    filtros.busqueda ||
    filtros.fechaInicio ||
    filtros.fechaFin ||
    filtros.cajero !== "todos" ||
    filtros.producto !== "todos" ||
    filtros.socio !== "todos" ||
    filtros.formaPago !== "todos" ||
    !filtros.soloActivas;

  // Establecer fechas por defecto (último mes)
  const establecerRangoDefault = (tipo: "hoy" | "semana" | "mes") => {
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

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Búsqueda Rápida */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por ticket, producto, cliente, cajero..."
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
          <Button
            onClick={aplicarFiltros}
            disabled={loading}
            className="gap-2 min-w-[100px]"
          >
            {loading ? "Buscando..." : "Buscar"}
          </Button>
          {hayFiltrosActivos && (
            <Button variant="ghost" onClick={limpiarFiltros} className="gap-2">
              <X className="h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Rangos rápidos */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => establecerRangoDefault("hoy")}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => establecerRangoDefault("semana")}
          >
            Última semana
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => establecerRangoDefault("mes")}
          >
            Último mes
          </Button>
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
              <Label>Producto</Label>
              <Select
                value={filtros.producto}
                onValueChange={(value) => handleChange("producto", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {productos.map((producto) => (
                    <SelectItem
                      key={producto.id}
                      value={producto.id.toString()}
                    >
                      {producto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={filtros.socio}
                onValueChange={(value) => handleChange("socio", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {socios.map((socio) => (
                    <SelectItem key={socio.id} value={socio.id.toString()}>
                      {socio.nombre || socio.numeroSocio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Producto</Label>
              <Select
                value={filtros.tipoProducto}
                onValueChange={(value: any) =>
                  handleChange("tipoProducto", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="membresias">Membresías</SelectItem>
                  <SelectItem value="productos">Productos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pago</Label>
              <Select
                value={filtros.formaPago}
                onValueChange={(value) => handleChange("formaPago", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TARJETA_DEBITO">Tarjeta Débito</SelectItem>
                  <SelectItem value="TARJETA_CREDITO">
                    Tarjeta Crédito
                  </SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
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
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="ticket">Ticket</SelectItem>
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
                  <SelectItem value="desc">Más reciente</SelectItem>
                  <SelectItem value="asc">Más antiguo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtros.soloActivas}
                  onChange={(e) =>
                    handleChange("soloActivas", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">Solo ventas activas</span>
              </label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
