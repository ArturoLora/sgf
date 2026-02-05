import { requireAuth } from "@/lib/require-role";
import { DashboardLayoutClient } from "./layout-client";
import { ThemeProvider } from "@/components/theme-provider";
import Script from "next/script";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <ThemeProvider>
      {/* Script inline para prevenir flash */}
      <Script
        id="theme-script"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              try {
                const stored = localStorage.getItem("theme");
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                const theme = stored || (prefersDark ? "dark" : "light");
                document.documentElement.classList.add(theme);
              } catch (e) {}
            })();
          `,
        }}
      />
      <DashboardLayoutClient user={session.user}>
        {children}
      </DashboardLayoutClient>
    </ThemeProvider>
  );
}
