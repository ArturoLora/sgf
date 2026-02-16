import type {
  SocioResponse,
  SocioVencidoResponse,
  CrearSocioRequest,
  ActualizarSocioRequest,
  RenovarMembresiaRequest,
} from "@/types/api/members";

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

export async function fetchMembers(): Promise<ApiResponse<SocioResponse[]>> {
  const res = await fetch("/api/members");
  return handleResponse<SocioResponse[]>(res);
}

export async function fetchMemberById(
  id: number,
): Promise<ApiResponse<SocioResponse>> {
  const res = await fetch(`/api/members/${id}`);
  return handleResponse<SocioResponse>(res);
}

export async function createMember(
  payload: CrearSocioRequest,
): Promise<ApiResponse<SocioResponse>> {
  const res = await fetch("/api/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<SocioResponse>(res);
}

export async function updateMember(
  id: number,
  payload: ActualizarSocioRequest,
): Promise<ApiResponse<SocioResponse>> {
  const res = await fetch(`/api/members/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<SocioResponse>(res);
}

export async function toggleMemberStatus(
  id: number,
): Promise<ApiResponse<SocioResponse>> {
  const res = await fetch(`/api/members/${id}`, {
    method: "DELETE",
  });
  return handleResponse<SocioResponse>(res);
}

export async function renewMembership(
  payload: RenovarMembresiaRequest,
): Promise<ApiResponse<SocioResponse>> {
  const res = await fetch("/api/members/renew", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<SocioResponse>(res);
}

export async function fetchExpiredMembers(): Promise<
  ApiResponse<SocioVencidoResponse[]>
> {
  const res = await fetch("/api/members/expired");
  return handleResponse<SocioVencidoResponse[]>(res);
}
