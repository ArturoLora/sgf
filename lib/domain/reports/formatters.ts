export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatUnits(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

export function getStockStatus(
  current: number,
  min: number,
): "ok" | "low" | "out" {
  if (current === 0) return "out";
  if (current <= min) return "low";
  return "ok";
}
