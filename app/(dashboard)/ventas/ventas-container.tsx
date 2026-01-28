// app/(dashboard)/ventas/ventas-container.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import VentasForm from "./ventas-form";
import ProductoItem from "./producto-item";
import ResumenVenta from "./resumen-venta";
import FinalizarVentaModal from "./finalizar-venta-modal";

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
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [descuento, setDescuento] = useState(0);
  const [recargo, setRecargo] = useState(0);
  const [modalAbierto, setModalAbierto] = useState(false);

  const agregarAlCarrito = (producto: Producto) => {
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
  };

  const subtotal = carrito.reduce(
    (sum, item) => sum + item.precioUnitario * item.cantidad,
    0,
  );

  const total = subtotal - descuento + recargo;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Punto de Venta</h1>
        <p className="text-sm sm:text-base text-gray-500">
          Registra ventas de productos y membresías
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Búsqueda y selección */}
        <div className="lg:col-span-2">
          <VentasForm
            productos={initialProductos}
            onAgregarProducto={agregarAlCarrito}
            clienteId={clienteId}
            onClienteChange={setClienteId}
          />
        </div>

        {/* Resumen lateral */}
        <div className="lg:col-span-1">
          <ResumenVenta
            subtotal={subtotal}
            descuento={descuento}
            recargo={recargo}
            total={total}
            onDescuentoChange={setDescuento}
            onRecargoChange={setRecargo}
            onFinalizar={() => setModalAbierto(true)}
            deshabilitado={carrito.length === 0}
          />
        </div>
      </div>

      {/* Carrito */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShoppingCart className="h-5 w-5" />
            Carrito ({carrito.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {carrito.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
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

      {/* Modal de finalización */}
      {modalAbierto && (
        <FinalizarVentaModal
          carrito={carrito}
          clienteId={clienteId}
          subtotal={subtotal}
          descuento={descuento}
          recargo={recargo}
          total={total}
          onClose={() => setModalAbierto(false)}
          onSuccess={limpiarCarrito}
        />
      )}
    </div>
  );
}
