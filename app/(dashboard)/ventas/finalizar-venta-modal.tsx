"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle } from "lucide-react";

interface ItemCarrito {
  producto: {
    id: number;
    nombre: string;
  };
  cantidad: number;
  precioUnitario: number;
}

interface FinalizarVentaModalProps {
  carrito: ItemCarrito[];
  clienteId: number | null;
  subtotal: number;
  descuento: number;
  recargo: number;
  total: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FinalizarVentaModal({
  carrito,
  clienteId,
  subtotal,
  descuento,
  recargo,
  total,
  onClose,
  onSuccess,
}: FinalizarVentaModalProps) {
  const [metodoPago, setMetodoPago] = useState<string>("CASH");
  const [procesando, setProcesando] = useState(false);
  const [ticketGenerado, setTicketGenerado] = useState<string | null>(null);

  const procesarVenta = async () => {
    setProcesando(true);

    try {
      const ticket = `VEN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Procesar cada item del carrito
      for (const item of carrito) {
        const payload = {
          productId: item.producto.id,
          quantity: item.cantidad,
          memberId: clienteId,
          unitPrice: item.precioUnitario,
          discount: descuento / carrito.length, // Distribuir descuento proporcionalmente
          surcharge: recargo / carrito.length, // Distribuir recargo proporcionalmente
          paymentMethod: metodoPago,
          ticket,
        };

        const res = await fetch("/api/inventory/sale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Error al procesar venta");
        }
      }

      setTicketGenerado(ticket);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      alert(error.message);
      setProcesando(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {ticketGenerado ? "¡Venta Completada!" : "Finalizar Venta"}
          </DialogTitle>
        </DialogHeader>

        {ticketGenerado ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="h-16 w-16 text-green-600" />
            <div className="text-center">
              <p className="text-lg font-semibold">Ticket: {ticketGenerado}</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                ${total.toFixed(2)}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Resumen */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium">{carrito.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Descuento:</span>
                  <span>-${descuento.toFixed(2)}</span>
                </div>
              )}
              {recargo > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Recargo:</span>
                  <span>+${recargo.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total:</span>
                <span className="text-xl font-bold text-green-600">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Método de pago */}
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="DEBIT_CARD">Tarjeta Débito</SelectItem>
                  <SelectItem value="CREDIT_CARD">Tarjeta Crédito</SelectItem>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {!ticketGenerado && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose} disabled={procesando}>
              Cancelar
            </Button>
            <Button onClick={procesarVenta} disabled={procesando}>
              {procesando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Venta
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
