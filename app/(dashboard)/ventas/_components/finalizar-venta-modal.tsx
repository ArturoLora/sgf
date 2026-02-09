"use client";

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
import type { MetodoPago } from "@/types/models/movimiento-inventario";

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
  subtotal: number;
  descuento: number;
  recargo: number;
  total: number;
  procesando: boolean;
  ventaCompletada: {
    ticket: string;
    total: number;
  } | null;
  onConfirmar: (metodoPago: MetodoPago) => void;
  onCancelar: () => void;
}

const paymentMethodSchema = CreateSaleInputSchema.pick({ paymentMethod: true });

type PaymentMethodForm = z.infer<typeof paymentMethodSchema>;

export default function FinalizarVentaModal({
  carrito,
  subtotal,
  descuento,
  recargo,
  total,
  procesando,
  ventaCompletada,
  onConfirmar,
  onCancelar,
}: FinalizarVentaModalProps) {
  const { handleSubmit, watch, setValue } = useForm<PaymentMethodForm>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      paymentMethod: "CASH",
    },
  });

  const metodoPago = watch("paymentMethod");

  const handleFormSubmit = () => {
    onConfirmar(metodoPago as MetodoPago);
  };

  return (
    <Dialog open onOpenChange={onCancelar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {ventaCompletada ? "¡Venta Completada!" : "Finalizar Venta"}
          </DialogTitle>
        </DialogHeader>

        {ventaCompletada ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-500" />
            <div className="text-center">
              <p className="text-lg font-semibold">
                Ticket: {ventaCompletada.ticket}
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-500 mt-2">
                ${ventaCompletada.total.toFixed(2)}
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

        {!ventaCompletada && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={onCancelar}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit(handleFormSubmit)}
              disabled={procesando}
            >
              {procesando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Venta
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
