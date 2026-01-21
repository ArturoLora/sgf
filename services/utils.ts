import { Decimal } from "@prisma/client/runtime/library";

export function serializeDecimal(value: any): any {
  // Convertir a JSON y volver a parsear elimina todos los métodos y propiedades no serializables
  return JSON.parse(
    JSON.stringify(value, (key, val) => {
      // Convertir Decimals a números
      if (val instanceof Decimal) {
        return Number(val.toString());
      }
      // Convertir Dates a ISO strings
      if (val instanceof Date) {
        return val.toISOString();
      }
      return val;
    }),
  );
}
