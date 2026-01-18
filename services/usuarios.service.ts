import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== TIPOS ====================

export interface CreateUserInput {
  name: string;
  email: string;
  role?: Role;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
  activo?: boolean;
}

// ==================== VALIDACIONES ====================

function validateAdminRole(userRole: Role) {
  if (userRole !== "ADMIN") {
    throw new Error("No tienes permisos para realizar esta operación");
  }
}

// ==================== SERVICIOS ====================

export async function getAllUsers() {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      activo: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      activo: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  return user;
}

export async function createUser(
  data: CreateUserInput,
  currentUserRole: Role
) {
  validateAdminRole(currentUserRole);

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error("El correo electrónico ya está registrado");
  }

  const { password, ...userData } = data;

  const user = await prisma.user.create({
    data: {
      ...userData,
      role: data.role || "EMPLEADO",
      emailVerified: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      activo: true,
    },
  });

  return user;
}

export async function updateUser(
  userId: string,
  data: UpdateUserInput,
  currentUserRole: Role
) {
  validateAdminRole(currentUserRole);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  if (data.email && data.email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("El correo electrónico ya está registrado");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      activo: true,
      updatedAt: true,
    },
  });

  return updatedUser;
}

export async function toggleUserStatus(userId: string, currentUserRole: Role) {
  validateAdminRole(currentUserRole);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { activo: !user.activo },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      activo: true,
    },
  });

  return updatedUser;
}

export async function getActiveUsers() {
  return await prisma.user.findMany({
    where: { activo: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });
}
