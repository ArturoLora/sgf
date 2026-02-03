"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DollarSign, ShoppingBag } from "lucide-react";

const ajustesSchema = z.object({
  descuento: z.number().min(0, "El descuento no puede ser negativo"),
  recargo: z.number().min(0, "El recargo no puede ser negativo"),
});

type AjustesForm = z.infer<typeof ajustesSchema>;

interface ResumenVentaProps {
  subtotal: number;
  descuento: number;
  recargo: number;
  total: number;
  onDescuentoChange: (valor: number) => void;
  onRecargoChange: (valor: number) => void;
  onFinalizar: () => void;
  deshabilitado: boolean;
}

export default function ResumenVenta({
  subtotal,
  descuento,
  recargo,
  total,
  onDescuentoChange,
  onRecargoChange,
  onFinalizar,
  deshabilitado,
}: ResumenVentaProps) {
  const { register } = useForm<AjustesForm>({
    resolver: zodResolver(ajustesSchema),
    defaultValues: {
      descuento,
      recargo,
    },
  });

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <DollarSign className="h-5 w-5" />
          Resumen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center pb-3 border-b">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-lg font-semibold">${subtotal.toFixed(2)}</span>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Descuento</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={descuento}
            {...register("descuento", {
              valueAsNumber: true,
              onChange: (e) => onDescuentoChange(Number(e.target.value)),
            })}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Recargo</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={recargo}
            {...register("recargo", {
              valueAsNumber: true,
              onChange: (e) => onRecargoChange(Number(e.target.value)),
            })}
            placeholder="0.00"
          />
        </div>

        <div className="flex justify-between items-center pt-3 border-t">
          <span className="text-base font-semibold">Total</span>
          <span className="text-2xl font-bold text-green-600 dark:text-green-500">
            ${total.toFixed(2)}
          </span>
        </div>

        <Button
          onClick={onFinalizar}
          disabled={deshabilitado}
          className="w-full gap-2"
          size="lg"
        >
          <ShoppingBag className="h-5 w-5" />
          Finalizar Venta
        </Button>
      </CardContent>
    </Card>
  );
}
