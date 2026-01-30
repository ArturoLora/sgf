import { Decimal } from "@prisma/client/runtime/library";
export function serializeDecimal(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => {
      if (val instanceof Decimal) {
        return Number(val.toString());
      }
      if (val instanceof Date) {
        return val.toISOString();
      }
      return val;
    }),
  );
}
