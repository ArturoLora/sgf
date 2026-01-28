"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { dashboardRoutes } from "@/lib/navigation";
import { useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function MobileNavContent() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 pt-6">
      {dashboardRoutes.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-all active:scale-95",
              isActive
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-100",
            )}
          >
            <item.icon className="h-6 w-6 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:flex w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-gray-900">Nacho Gym</h1>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {dashboardRoutes.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b p-6">
            <SheetTitle className="text-xl font-bold">Nacho Gym</SheetTitle>
          </SheetHeader>
          <div className="px-4">
            <MobileNavContent />
          </div>
        </SheetContent>
      </Sheet>

      <DesktopSidebar />
    </>
  );
}
