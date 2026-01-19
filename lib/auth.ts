import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@/app/generated/prisma/client";
import { nextCookies } from "better-auth/next-js";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 3, // ✅ Permitir "123" (por defecto es 8)
  },

  plugins: [nextCookies()],

  secret: process.env.NEXTAUTH_SECRET,
  baseURL: process.env.NEXTAUTH_URL || "http://localhost:3000",
});
