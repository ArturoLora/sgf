import { requireAuth } from "@/lib/require-role";
import { MiCuentaManager } from "./_components/MiCuentaManager";

export const metadata = {
  title: "Mi Cuenta — SGF",
};

// Story 3.5: requireAuth() (no requireAdmin()) — cualquier empleado
// autenticado y activo, ADMIN o EMPLEADO, puede cambiar su propia contraseña.
export default async function MiCuentaPage() {
  const session = await requireAuth();

  return <MiCuentaManager userName={session.user.name} />;
}
