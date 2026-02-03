"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { CreateSaleInputSchema } from "@/types/api/inventory";
import type { z } from "zod";

type CreateSaleInput = z.infer<typeof CreateSaleInputSchema>;

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

const paymentMethodSchema = CreateSaleInputSchema.pick({ paymentMethod: true });

type PaymentMethodForm = z.infer<typeof paymentMethodSchema>;

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
  const [procesando, setProcesando] = useState(false);
  const [ticketGenerado, setTicketGenerado] = useState<string | null>(null);

  const { handleSubmit, watch, setValue } = useForm<PaymentMethodForm>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      paymentMethod: "CASH",
    },
  });

  const metodoPago = watch("paymentMethod");

  const procesarVenta = async () => {
    setProcesando(true);

    try {
      const ticket = `VEN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      for (const item of carrito) {
        const payload: CreateSaleInput = {
          productId: item.producto.id,
          quantity: item.cantidad,
          memberId: clienteId ?? undefined,
          unitPrice: item.precioUnitario,
          discount: descuento / carrito.length,
          surcharge: recargo / carrito.length,
          paymentMethod: metodoPago,
          ticket,
        };

        const validatedPayload = CreateSaleInputSchema.parse(payload);

        const res = await fetch("/api/inventory/sale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validatedPayload),
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      }
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
            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-500" />
            <div className="text-center">
              <p className="text-lg font-semibold">Ticket: {ticketGenerado}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-500 mt-2">
                ${total.toFixed(2)}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items:</span>
                <span className="font-medium">{carrito.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-500">
                  <span>Descuento:</span>
                  <span>-${descuento.toFixed(2)}</span>
                </div>
              )}
              {recargo > 0 && (
                <div className="flex justify-between text-orange-600 dark:text-orange-500">
                  <span>Recargo:</span>
                  <span>+${recargo.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total:</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-500">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select
                value={metodoPago}
                onValueChange={(value) => setValue("paymentMethod", value)}
              >
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
            <Button onClick={handleSubmit(procesarVenta)} disabled={procesando}>
              {procesando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Venta
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
