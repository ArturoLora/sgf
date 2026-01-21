"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Trash2, Search, X, User } from "lucide-react";

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

interface VentasFormProps {
  corteActivo: any;
  productos: Producto[];
  socios: Socio[];
  onVentaSuccess?: () => void;
}

export default function VentasForm({
  corteActivo,
  productos,
  socios,
  onVentaSuccess,
}: VentasFormProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [busquedaSocio, setBusquedaSocio] = useState("");
  const [mostrarResultadosProducto, setMostrarResultadosProducto] =
    useState(false);
  const [mostrarResultadosSocio, setMostrarResultadosSocio] = useState(false);
  const [socioSeleccionado, setSocioSeleccionado] = useState<Socio | null>(
    null,
  );

  const [formaPago, setFormaPago] = useState("EFECTIVO");
  const [lineas, setLineas] = useState<LineaVenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ticketNumero, setTicketNumero] = useState("");

  useEffect(() => {
    generarTicket();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setMostrarResultadosProducto(false);
        setMostrarResultadosSocio(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generarTicket = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    setTicketNumero(`${timestamp}${random}`);
  };

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()),
  );

  const sociosFiltrados = socios.filter(
    (s) =>
      s.numeroSocio.toLowerCase().includes(busquedaSocio.toLowerCase()) ||
      s.nombre?.toLowerCase().includes(busquedaSocio.toLowerCase()),
  );

  const agregarProducto = (producto: Producto, cantidad: number = 1) => {
    if (producto.existenciaGym < cantidad) {
      setError(`Stock insuficiente. Disponible: ${producto.existenciaGym}`);
      return;
    }

    const existe = lineas.find((l) => l.productoId === producto.id);
    if (existe) {
      setLineas(
        lineas.map((l) =>
          l.productoId === producto.id
            ? {
                ...l,
                cantidad: l.cantidad + cantidad,
                subtotal: (l.cantidad + cantidad) * l.precio,
              }
            : l,
        ),
      );
    } else {
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
    }

    setBusquedaProducto("");
    setMostrarResultadosProducto(false);
    setError("");
  };

  const eliminarLinea = (index: number) => {
    setLineas(lineas.filter((_, i) => i !== index));
  };

  const actualizarCantidad = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;

    const linea = lineas[index];
    const producto = productos.find((p) => p.id === linea.productoId);

    if (producto && producto.existenciaGym < nuevaCantidad) {
      setError(`Stock insuficiente. Disponible: ${producto.existenciaGym}`);
      return;
    }

    setLineas(
      lineas.map((l, i) =>
        i === index
          ? {
              ...l,
              cantidad: nuevaCantidad,
              subtotal: nuevaCantidad * l.precio,
            }
          : l,
      ),
    );
    setError("");
  };

  const total = lineas.reduce((sum, linea) => sum + linea.subtotal, 0);

  const procesarVenta = async () => {
    if (!corteActivo) {
      setError("No hay corte activo.");
      return;
    }

    if (lineas.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }

    setLoading(true);
    setError("");

    try {
      for (const linea of lineas) {
        const payload = {
          productoId: linea.productoId,
          cantidad: linea.cantidad,
          userId: corteActivo.cajeroId,
          formaPago,
          ticket: ticketNumero,
          corteId: corteActivo.id,
          ...(socioSeleccionado && { socioId: socioSeleccionado.id }),
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

      setSuccess(`✓ Venta ${ticketNumero} - $${total.toFixed(2)}`);
      setLineas([]);
      setSocioSeleccionado(null);
      setBusquedaSocio("");
      setFormaPago("EFECTIVO");
      generarTicket();

      if (onVentaSuccess) {
        onVentaSuccess();
      } else {
        router.refresh();
      }

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 font-medium">
          {success}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Panel Principal */}
        <div className="lg:col-span-2 space-y-4">
          {/* Búsqueda de Producto */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative" ref={searchRef}>
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
                <Input
                  placeholder="Buscar producto..."
                  value={busquedaProducto}
                  onChange={(e) => {
                    setBusquedaProducto(e.target.value);
                    setMostrarResultadosProducto(true);
                  }}
                  onFocus={() => setMostrarResultadosProducto(true)}
                  className="pl-10 h-12 text-base relative z-10"
                  autoFocus
                />

                {mostrarResultadosProducto &&
                  busquedaProducto &&
                  productosFiltrados.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 max-h-80 overflow-y-auto rounded-lg border bg-white shadow-xl">
                      {productosFiltrados.map((p) => {
                        const sinStock = p.existenciaGym === 0;
                        return (
                          <button
                            key={p.id}
                            onClick={() => !sinStock && agregarProducto(p)}
                            disabled={sinStock}
                            className={`flex w-full items-center justify-between p-4 border-b last:border-b-0 transition-colors ${
                              sinStock
                                ? "bg-gray-50 cursor-not-allowed opacity-50"
                                : "hover:bg-gray-50 cursor-pointer"
                            }`}
                          >
                            <div className="text-left flex-1">
                              <p className="font-medium text-gray-900">
                                {p.nombre}
                              </p>
                              <p className="text-sm text-gray-500">
                                ${Number(p.precioVenta).toFixed(2)}
                              </p>
                            </div>
                            <Badge
                              variant={sinStock ? "destructive" : "default"}
                            >
                              Stock: {p.existenciaGym}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Carrito */}
          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Carrito ({lineas.length})</span>
                {lineas.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLineas([])}
                    className="text-red-600 hover:text-red-700"
                  >
                    Vaciar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lineas.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-400">El carrito está vacío</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lineas.map((linea, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-lg border p-3 bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {linea.producto}
                        </p>
                        <p className="text-xs text-gray-500">
                          ${linea.precio.toFixed(2)} c/u
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            actualizarCantidad(index, linea.cantidad - 1)
                          }
                          className="h-8 w-8 p-0"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {linea.cantidad}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            actualizarCantidad(index, linea.cantidad + 1)
                          }
                          className="h-8 w-8 p-0"
                        >
                          +
                        </Button>
                      </div>
                      <p className="font-semibold w-20 text-right">
                        ${linea.subtotal.toFixed(2)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarLinea(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel de Pago */}
        <div className="space-y-4">
          {/* Socio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Cliente{" "}
                <span className="text-xs text-gray-500 font-normal">
                  (opcional)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {socioSeleccionado ? (
                <div className="rounded-lg border bg-blue-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {socioSeleccionado.nombre}
                      </p>
                      <p className="text-sm text-gray-600">
                        {socioSeleccionado.numeroSocio}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSocioSeleccionado(null);
                        setBusquedaSocio("");
                      }}
                      className="h-8 px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Buscar socio..."
                    value={busquedaSocio}
                    onChange={(e) => {
                      setBusquedaSocio(e.target.value);
                      setMostrarResultadosSocio(true);
                    }}
                    onFocus={() => setMostrarResultadosSocio(true)}
                  />
                  {mostrarResultadosSocio &&
                    busquedaSocio &&
                    sociosFiltrados.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border bg-white shadow-lg">
                        {sociosFiltrados.slice(0, 5).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setSocioSeleccionado(s);
                              setBusquedaSocio("");
                              setMostrarResultadosSocio(false);
                            }}
                            className="flex w-full items-center justify-between p-3 hover:bg-gray-50 border-b last:border-0"
                          >
                            <div className="text-left">
                              <p className="font-medium text-sm">{s.nombre}</p>
                              <p className="text-xs text-gray-500">
                                {s.numeroSocio}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ticket</span>
                  <Badge variant="outline">#{ticketNumero}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Artículos</span>
                  <span className="font-medium">{lineas.length}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label className="text-sm">Forma de Pago</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "EFECTIVO", label: "Efectivo" },
                    { key: "TARJETA_DEBITO", label: "Débito" },
                    { key: "TARJETA_CREDITO", label: "Crédito" },
                    { key: "TRANSFERENCIA", label: "Transfer" },
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      variant={formaPago === key ? "default" : "outline"}
                      onClick={() => setFormaPago(key)}
                      size="sm"
                      className="h-9"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={procesarVenta}
                disabled={loading || lineas.length === 0}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {loading ? (
                  "Procesando..."
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Cobrar ${total.toFixed(2)}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
