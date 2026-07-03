import { requireAdmin } from "@/lib/require-role";
import { UsersService } from "@/modules/users/users.service";
import { UsuariosManager } from "./_components/UsuariosManager";

export const metadata = {
  title: "Usuarios — SGF",
};

export default async function UsuariosPage() {
  await requireAdmin();

  const initialEmployees = await UsersService.listEmployees();

  return <UsuariosManager initialEmployees={initialEmployees} />;
}
