import { prisma } from "@/lib/db";
import { parseBooleanQuery } from "@/services/utils";
import type { UsersQueryInput } from "@/types/api/users";
import type { Employee, Role } from "./types";

export interface ListEmployeesParams {
  search?: string;
  role?: Role;
  isActive?: boolean;
}

export function parseUsersQuery(raw: UsersQueryInput): ListEmployeesParams {
  return {
    search: raw.search,
    role: raw.role,
    isActive: parseBooleanQuery(raw.isActive),
  };
}

export async function listEmployees(
  params?: ListEmployeesParams,
): Promise<Employee[]> {
  const where: {
    OR?: Array<{
      name?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
    }>;
    role?: Role;
    isActive?: boolean;
  } = {};

  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params?.role) where.role = params.role;
  if (params?.isActive !== undefined) where.isActive = params.isActive;

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      phone: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export const UsersService = {
  listEmployees,
  parseUsersQuery,
};
