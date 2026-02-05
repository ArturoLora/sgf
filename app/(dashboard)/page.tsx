import { requireAuth } from "@/lib/require-role";
import DashboardContainer from "./_components/dashboard.container";

export default async function DashboardPage() {
  await requireAuth();

  return <DashboardContainer />;
}
