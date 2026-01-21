import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SociosService } from "@/services";
import SociosManager from "./socios-manager";

export default async function SociosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [socios, sociosVencidos] = await Promise.all([
    SociosService.getAllSocios(),
    SociosService.getSociosVencidos(),
  ]);

  return (
    <SociosManager initialSocios={socios} sociosVencidos={sociosVencidos} />
  );
}
