import { requireAuth } from "@/lib/require-role";
import { SociosManager } from "./_components/socios-manager";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";
import type { SocioResponse } from "@/types/api/members";

async function getMembers(): Promise<SocioResponse[]> {
  const members = await prisma.member.findMany({
    orderBy: [{ isActive: "desc" }, { memberNumber: "asc" }],
  });

  return serializeDecimal(members) as SocioResponse[];
}

export default async function SociosPage() {
  await requireAuth();

  const members = await getMembers();

  return <SociosManager initialMembers={members} />;
}
