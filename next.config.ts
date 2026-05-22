import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// ─── Turbopack + Prisma Engine Fix (dev only) ────────────────────────────────
// When Turbopack bundles the Prisma generated client, __dirname becomes the
// virtual path /ROOT/, so the engine binary can't be located.
// Fix: resolve the engine at the real FS path and set PRISMA_QUERY_ENGINE_LIBRARY.
// Only applied in development — production builds (Vercel) use the standard
// Prisma engine resolution via binaryTargets in schema.prisma.
if (process.env.NODE_ENV !== "production") {
  const GENERATED = path.join(process.cwd(), "app", "generated", "prisma");
  if (fs.existsSync(GENERATED)) {
    const engineFile = fs
      .readdirSync(GENERATED)
      .find((f) => f.startsWith("libquery_engine") && f.endsWith(".node"));
    if (engineFile) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(GENERATED, engineFile);
      console.log(`[next.config] Prisma engine → ${process.env.PRISMA_QUERY_ENGINE_LIBRARY}`);
    } else {
      console.warn("[next.config] Prisma engine not found in", GENERATED, "— run npm run prisma:generate");
    }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const nextConfig: NextConfig = {};

export default nextConfig;
