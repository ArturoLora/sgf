import { requireAdmin } from "@/lib/require-role";
import { MigracionManager } from "./_components/MigracionManager";

export const metadata = {
  title: "Importación de Datos — SGF",
};

export default async function MigracionPage() {
  await requireAdmin();
  return <MigracionManager />;
}
