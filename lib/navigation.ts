// lib/navigation.ts
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Archive,
  Calculator,
  History,
} from "lucide-react";

export interface NavRoute {
  label: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
}

export const dashboardRoutes: NavRoute[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Ventas", href: "/ventas", icon: ShoppingCart },
  {
    label: "Historial Ventas",
    href: "/historial-ventas",
    icon: History,
    adminOnly: true,
  },
  { label: "Socios", href: "/socios", icon: Users },
  { label: "Productos", href: "/productos", icon: Package },
  { label: "Inventario", href: "/inventario", icon: Archive },
  { label: "Cortes", href: "/cortes", icon: Calculator },
];
