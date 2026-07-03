import type { Employee } from "@/modules/users/types";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "@/types/api/users";

// ==================== RESPONSE WRAPPER ====================

interface ApiResult<T> {
  ok: true;
  data: T;
}

interface ApiError {
  ok: false;
  error: string;
}

type ApiResponse<T> = ApiResult<T> | ApiError;

async function handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String(body.error)
        : `Error ${res.status}`;
    return { ok: false, error: message };
  }
  const data: T = await res.json();
  return { ok: true, data };
}

// ==================== ENDPOINTS ====================

export async function fetchEmployees(): Promise<ApiResponse<Employee[]>> {
  const res = await fetch("/api/usuarios");
  return handleResponse<Employee[]>(res);
}

export async function createEmployee(
  payload: CreateEmployeeInput,
): Promise<ApiResponse<Employee>> {
  const res = await fetch("/api/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<Employee>(res);
}

export async function updateEmployee(
  id: string,
  payload: UpdateEmployeeInput,
): Promise<ApiResponse<Employee>> {
  const res = await fetch(`/api/usuarios/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<Employee>(res);
}

export interface SetEmployeeActiveResponse extends Employee {
  sessionsRevoked: boolean;
}

export async function setEmployeeActive(
  id: string,
  isActive: boolean,
): Promise<ApiResponse<SetEmployeeActiveResponse>> {
  const res = await fetch(`/api/usuarios/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  return handleResponse<SetEmployeeActiveResponse>(res);
}
