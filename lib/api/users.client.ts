import type { Employee } from "@/modules/users/types";

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
