"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";

interface HeaderProps {
  user: {
    name: string;
    email: string;
    role?: string;
  };
  onMenuClick: () => void;
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        {/* Hamburger button - only visible on mobile */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden h-10 w-10 p-0 shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* User info - responsive text sizing */}
        <h2 className="text-sm sm:text-lg font-semibold truncate">
          Bienvenido, {user.name}
        </h2>
        {user.role && (
          <span className="hidden sm:inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            {user.role}
          </span>
        )}
      </div>

      {/* Logout button - icon only on mobile, with text on desktop */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="gap-2 shrink-0"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Cerrar Sesión</span>
      </Button>
    </header>
  );
}
