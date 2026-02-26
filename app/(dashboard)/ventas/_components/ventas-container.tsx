"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import VentasForm from "./ventas-form";
import ProductoItem from "./producto-item";
import ResumenVenta from "./resumen-venta";
import FinalizarVentaModal from "./finalizar-venta-modal";
import {
  calculateSubtotal,
  calculateTotal,
} from "@/lib/domain/sales/calculators";
import { generateTicket } from "@/lib/domain/sales/ticket";
import { buildSalePayloadFromCart } from "@/lib/domain/sales/payloads";
import { createSale } from "@/lib/api/sales.client";
import type { MetodoPago } from "@/types/models/movimiento-inventario";

interface Producto {
  id: number;
  nombre: string;
  precioVenta: number;
  existenciaGym: number;
  activo: boolean;
}

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
}

interface VentasContainerProps {
  initialProductos: Producto[];
}

export default function VentasContainer({
  initialProductos,
}: VentasContainerProps) {
  const [hasActiveShift, setHasActiveShift] = useState<boolean | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);

  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [descuento, setDescuento] = useState(0);
  const [recargo, setRecargo] = useState(0);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [ventaCompletada, setVentaCompletada] = useState<{
    ticket: string;
    total: number;
  } | null>(null);

  useEffect(() => {
    const checkActiveShift = async () => {
      try {
        const res = await fetch("/api/shifts/active");
        if (!res.ok) {
          setHasActiveShift(false);
          return;
        }
        const data = await res.json();
        setHasActiveShift(!!data);
      } catch {
        setHasActiveShift(false);
      } finally {
        setLoadingShift(false);
      }
    };

    checkActiveShift();
  }, []);

  const agregarAlCarrito = (producto: Producto) => {
    if (!hasActiveShift) {
      alert(
        "No hay un corte abierto. Por favor, abre un corte para realizar ventas.",
      );
      return;
    }

    const existente = carrito.find((item) => item.producto.id === producto.id);

    if (existente) {
      setCarrito(
        carrito.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        ),
      );
    } else {
      setCarrito([
        ...carrito,
        {
          producto,
          cantidad: 1,
          precioUnitario: producto.precioVenta,
        },
      ]);
    }
  };

  const actualizarCantidad = (productoId: number, cantidad: number) => {
    if (cantidad === 0) {
      setCarrito(carrito.filter((item) => item.producto.id !== productoId));
    } else {
      setCarrito(
        carrito.map((item) =>
          item.producto.id === productoId ? { ...item, cantidad } : item,
        ),
      );
    }
  };

  const actualizarPrecio = (productoId: number, precio: number) => {
    setCarrito(
      carrito.map((item) =>
        item.producto.id === productoId
          ? { ...item, precioUnitario: precio }
          : item,
      ),
    );
  };

  const eliminarDelCarrito = (productoId: number) => {
    setCarrito(carrito.filter((item) => item.producto.id !== productoId));
  };

  const limpiarCarrito = () => {
    setCarrito([]);
    setClienteId(null);
    setDescuento(0);
    setRecargo(0);
    setVentaCompletada(null);
  };

  const handleFinalizarClick = () => {
    if (!hasActiveShift) {
      alert(
        "No hay un corte abierto. Por favor, abre un corte para realizar ventas.",
      );
      return;
    }
    setModalAbierto(true);
  };

  const handleConfirmarVenta = async (metodoPago: MetodoPago) => {
    setProcesando(true);

    try {
      const ticket = generateTicket();

      const payloads = buildSalePayloadFromCart(carrito, {
        clienteId,
        descuento,
        recargo,
        metodoPago,
        ticket,
      });

      for (const payload of payloads) {
        await createSale({
          ...payload,
          paymentMethod: payload.paymentMethod as MetodoPago,
        });
      }

      setVentaCompletada({
        ticket,
        total: calculateTotal(calculateSubtotal(carrito), descuento, recargo),
      });

      setTimeout(() => {
        limpiarCarrito();
        setModalAbierto(false);
      }, 2000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleCancelarModal = () => {
    if (!procesando) {
      setModalAbierto(false);
      setVentaCompletada(null);
    }
  };

  const subtotal = calculateSubtotal(carrito);
  const total = calculateTotal(subtotal, descuento, recargo);

  if (loadingShift) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Verificando estado del sistema...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Punto de Venta</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Registra ventas de productos y membresías
        </p>
      </div>

      {!hasActiveShift && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay un corte abierto. Debes abrir un corte antes de realizar
            ventas.{" "}
            <Button
              variant="link"
              className="h-auto p-0 text-destructive underline"
              onClick={() => (window.location.href = "/cortes")}
            >
              Ir a Cortes
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VentasForm
            productos={initialProductos}
            onAgregarProducto={agregarAlCarrito}
            clienteId={clienteId}
            onClienteChange={setClienteId}
            deshabilitado={!hasActiveShift}
          />
        </div>

        <div className="lg:col-span-1">
          <ResumenVenta
            subtotal={subtotal}
            descuento={descuento}
            recargo={recargo}
            total={total}
            onDescuentoChange={setDescuento}
            onRecargoChange={setRecargo}
            onFinalizar={handleFinalizarClick}
            deshabilitado={carrito.length === 0 || !hasActiveShift}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShoppingCart className="h-5 w-5" />
            Carrito ({carrito.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {carrito.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Agrega productos para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {carrito.map((item) => (
                <ProductoItem
                  key={item.producto.id}
                  item={item}
                  onCantidadChange={(cantidad) =>
                    actualizarCantidad(item.producto.id, cantidad)
                  }
                  onPrecioChange={(precio) =>
                    actualizarPrecio(item.producto.id, precio)
                  }
                  onEliminar={() => eliminarDelCarrito(item.producto.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {modalAbierto && hasActiveShift && (
        <FinalizarVentaModal
          carrito={carrito}
          subtotal={subtotal}
          descuento={descuento}
          recargo={recargo}
          total={total}
          procesando={procesando}
          ventaCompletada={ventaCompletada}
          onConfirmar={handleConfirmarVenta}
          onCancelar={handleCancelarModal}
        />
      )}
    </div>
  );
}
