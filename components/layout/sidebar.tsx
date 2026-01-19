"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Archive,
  Calculator,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Ventas", href: "/ventas", icon: ShoppingCart },
  { name: "Socios", href: "/socios", icon: Users },
  { name: "Productos", href: "/productos", icon: Package },
  { name: "Inventario", href: "/inventario", icon: Archive },
  { name: "Cortes", href: "/cortes", icon: Calculator },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">Nacho Gym</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
