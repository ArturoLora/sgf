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
    <header className="flex h-14 sm:h-16 items-center justify-between border-b bg-white px-3 sm:px-6">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 p-0 shrink-0"
          aria-label="Menú"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
            {user.name}
          </h2>
          {user.role && (
            <span className="hidden sm:inline-flex mt-0.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {user.role}
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="gap-2 shrink-0 h-9"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Salir</span>
      </Button>
    </header>
  );
}
