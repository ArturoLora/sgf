/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ShoppingCart, Plus, Trash2 } from "lucide-react";

interface Producto {
  id: number;
  nombre: string;
  precioVenta: number;
  existenciaGym: number;
}

interface Socio {
  id: number;
  numeroSocio: string;
  nombre: string;
}

interface LineaVenta {
  productoId: number;
  producto: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

export default function VentasPage() {
  const [corteActivo, setCorteActivo] = useState<any>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(false);

  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [socioSeleccionado, setSocioSeleccionado] = useState("");
  const [formaPago, setFormaPago] = useState("EFECTIVO");
  const [lineas, setLineas] = useState<LineaVenta[]>([]);
  const [ticket, setTicket] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [corteRes, productosRes, sociosRes] = await Promise.all([
        fetch("/api/cortes/activo"),
        fetch("/api/productos"),
        fetch("/api/socios"),
      ]);

      if (corteRes.ok) {
        const corte = await corteRes.json();
        setCorteActivo(corte);
      }

      if (productosRes.ok) {
        const prods = await productosRes.json();
        setProductos(prods);
      }

      if (sociosRes.ok) {
        const socs = await sociosRes.json();
        setSocios(socs);
      }
    } catch (err) {
      setError("Error al cargar datos");
    }
  };

  const agregarLinea = () => {
    if (!productoSeleccionado) {
      setError("Selecciona un producto");
      return;
    }

    const producto = productos.find(
      (p) => p.id === Number(productoSeleccionado),
    );
    if (!producto) return;

    const esMembresia =
      producto.nombre.includes("EFECTIVO") || producto.nombre === "VISITA";

    if (!esMembresia && producto.existenciaGym < cantidad) {
      setError(`Stock insuficiente. Disponible: ${producto.existenciaGym}`);
      return;
    }

    setLineas([
      ...lineas,
      {
        productoId: producto.id,
        producto: producto.nombre,
        cantidad,
        precio: Number(producto.precioVenta),
        subtotal: Number(producto.precioVenta) * cantidad,
      },
    ]);

    setProductoSeleccionado("");
    setCantidad(1);
    setError("");
  };

  const eliminarLinea = (index: number) => {
    setLineas(lineas.filter((_, i) => i !== index));
  };

  const total = lineas.reduce((sum, linea) => sum + linea.subtotal, 0);

  const procesarVenta = async () => {
    if (!corteActivo) {
      setError("No hay corte activo. Debe abrir un corte primero.");
      return;
    }

    if (lineas.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }

    if (!ticket) {
      setError("Ingresa el número de ticket");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Procesar cada línea de venta
      for (const linea of lineas) {
        const payload = {
          productoId: linea.productoId,
          cantidad: linea.cantidad,
          userId: corteActivo.cajeroId,
          formaPago,
          ticket,
          corteId: corteActivo.id, // ✅ CRÍTICO: incluir corteId
          ...(socioSeleccionado && { socioId: Number(socioSeleccionado) }),
        };

        const res = await fetch("/api/inventario/venta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Error al procesar venta");
        }
      }

      setSuccess(
        `Venta registrada: Ticket ${ticket} - Total $${total.toFixed(2)}`,
      );
      setLineas([]);
      setTicket("");
      setSocioSeleccionado("");
      setFormaPago("EFECTIVO");

      // Recargar corte para actualizar stats
      cargarDatos();

      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!corteActivo) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Punto de Venta</h1>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-900">
                No hay corte activo
              </p>
              <p className="text-sm text-yellow-700">
                Dirígete a la sección de Cortes para abrir uno.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Punto de Venta</h1>
          <p className="text-gray-500">
            Corte: {corteActivo.folio} | Tickets:{" "}
            {corteActivo.cantidadTickets || 0}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-600">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulario de Venta */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Nueva Venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Producto</Label>
                <Select
                  value={productoSeleccionado}
                  onValueChange={setProductoSeleccionado}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productos.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nombre} - ${Number(p.precioVenta).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Socio (opcional)</Label>
                <Select
                  value={socioSeleccionado}
                  onValueChange={setSocioSeleccionado}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin socio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin socio</SelectItem>
                    {socios.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.numeroSocio} - {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Forma de Pago</Label>
                <Select value={formaPago} onValueChange={setFormaPago}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="TARJETA_DEBITO">
                      Tarjeta Débito
                    </SelectItem>
                    <SelectItem value="TARJETA_CREDITO">
                      Tarjeta Crédito
                    </SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={agregarLinea} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Agregar al Carrito
            </Button>

            {/* Líneas de Venta */}
            {lineas.length > 0 && (
              <div className="space-y-2">
                <Label>Carrito</Label>
                <div className="space-y-2">
                  {lineas.map((linea, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{linea.producto}</p>
                        <p className="text-sm text-gray-500">
                          {linea.cantidad} x ${linea.precio.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold">
                          ${linea.subtotal.toFixed(2)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => eliminarLinea(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Número de Ticket</Label>
              <Input
                placeholder="ej: 8000"
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
              />
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>Productos:</span>
                <span>{lineas.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Forma de pago:</span>
                <Badge variant="outline">{formaPago}</Badge>
              </div>
              {socioSeleccionado && (
                <div className="flex justify-between text-sm">
                  <span>Socio:</span>
                  <span className="text-xs">
                    {
                      socios.find((s) => s.id === Number(socioSeleccionado))
                        ?.numeroSocio
                    }
                  </span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={procesarVenta}
              disabled={loading || lineas.length === 0}
              className="w-full gap-2"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5" />
              {loading ? "Procesando..." : "Registrar Venta"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
