"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface HeaderProps {
  user: {
    name: string;
    email: string;
    role?: string;
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Bienvenido, {user.name}</h2>
        {user.role && (
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            {user.role}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="gap-2"
      >
        <LogOut className="h-4 w-4" />
        Cerrar Sesión
      </Button>
    </header>
  );
}
