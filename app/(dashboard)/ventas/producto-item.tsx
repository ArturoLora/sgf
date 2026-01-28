"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2 } from "lucide-react";

interface ItemCarrito {
  producto: {
    id: number;
    nombre: string;
    precioVenta: number;
    existenciaGym: number;
  };
  cantidad: number;
  precioUnitario: number;
}

interface ProductoItemProps {
  item: ItemCarrito;
  onCantidadChange: (cantidad: number) => void;
  onPrecioChange: (precio: number) => void;
  onEliminar: () => void;
}

export default function ProductoItem({
  item,
  onCantidadChange,
  onPrecioChange,
  onEliminar,
}: ProductoItemProps) {
  const subtotal = item.cantidad * item.precioUnitario;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border rounded-lg">
      {/* Info del producto */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm sm:text-base truncate">
          {item.producto.nombre}
        </p>
        <p className="text-xs text-gray-500">
          Stock: {item.producto.existenciaGym}
        </p>
      </div>

      {/* Controles - responsive */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Cantidad */}
        <div className="flex items-center gap-1 border rounded">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCantidadChange(Math.max(0, item.cantidad - 1))}
            className="h-8 w-8 p-0"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">
            {item.cantidad}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCantidadChange(item.cantidad + 1)}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Precio unitario */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">$</span>
          <Input
            type="number"
            step="0.01"
            value={item.precioUnitario}
            onChange={(e) => onPrecioChange(Number(e.target.value))}
            className="w-20 h-8 text-sm"
          />
        </div>

        {/* Subtotal */}
        <div className="text-right min-w-[80px]">
          <p className="text-sm font-bold">${subtotal.toFixed(2)}</p>
        </div>

        {/* Eliminar */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onEliminar}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
