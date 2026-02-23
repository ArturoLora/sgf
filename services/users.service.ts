import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

function validateAdminRole(userRole: Role): void {
  if (userRole !== "ADMIN") {
    throw new Error("No tienes permisos para realizar esta operación");
  }
}

export async function getAllUsers(): Promise<UserResponse[]> {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserById(userId: string): Promise<UserResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) throw new Error("Usuario no encontrado");
  return user;
}

export async function createUser(
  data: {
    name: string;
    email: string;
    role?: Role;
    password: string;
  },
  currentUserRole: Role,
): Promise<UserResponse> {
  validateAdminRole(currentUserRole);

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) throw new Error("El correo electrónico ya está registrado");

  const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const user = await prisma.user.create({
    data: {
      id: userId,
      name: data.name,
      email: data.email,
      role: data.role || "EMPLEADO",
      emailVerified: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  return user;
}

export async function updateUser(
  userId: string,
  data: {
    name?: string;
    email?: string;
    role?: Role;
    isActive?: boolean;
  },
  currentUserRole: Role,
): Promise<UserResponse> {
  validateAdminRole(currentUserRole);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuario no encontrado");

  if (data.email && data.email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser)
      throw new Error("El correo electrónico ya está registrado");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return updatedUser;
}

export async function toggleUserStatus(
  userId: string,
  currentUserRole: Role,
): Promise<UserResponse> {
  validateAdminRole(currentUserRole);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuario no encontrado");

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  return updatedUser;
}

export async function getActiveUsers(): Promise<UserResponse[]> {
  return await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });
}
