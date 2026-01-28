import { requireAuth } from "@/lib/require-role";
import SociosManager from "./socios-manager";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";

// Server component - data fetching inicial
async function getMembers() {
  const members = await prisma.member.findMany({
    orderBy: [{ isActive: "desc" }, { memberNumber: "asc" }],
  });

  return serializeDecimal(members);
}

export default async function SociosPage() {
  await requireAuth();

  const members = await getMembers();

  return <SociosManager initialMembers={members} />;
}
