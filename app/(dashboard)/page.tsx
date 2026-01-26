// app/(dashboard)/page.tsx
import { requireAuth } from "@/lib/require-role";
import DashboardContainer from "./dashboard.container";

export default async function DashboardPage() {
  await requireAuth();

  return <DashboardContainer />;
}
