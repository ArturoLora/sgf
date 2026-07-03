import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  plugins: [
    // defaultRole/adminRoles/roles alineados al enum Role de Prisma (ADMIN/EMPLEADO) —
    // el rol en sí sigue gestionado vía Prisma directo (Story 3.1, hallazgo H2/H3).
    // `roles` es obligatorio: el mapa de permisos interno del plugin (hasPermission)
    // usa las claves de `options.roles`, NO las de `adminRoles` — sin esto, endpoints
    // como setUserPassword/revokeUserSessions rechazan con FORBIDDEN a cualquier
    // sesión con role="ADMIN" porque el default interno solo reconoce "admin"/"user"
    // en minúsculas (verificado empíricamente, ver Dev Agent Record de Story 3.1).
    admin({
      defaultRole: "EMPLEADO",
      adminRoles: ["ADMIN"],
      roles: {
        ADMIN: adminAc,
        EMPLEADO: userAc,
      },
    }),
    nextCookies(),
  ],

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
