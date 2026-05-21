import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ShiftsService } from "@/services";
import { CreateWithdrawalSchema } from "@/types/api/shifts";
import { ZodError } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const shiftId = parseInt(id, 10);
    if (isNaN(shiftId))
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const withdrawals = await ShiftsService.getWithdrawalsByShift(shiftId);
    return NextResponse.json(withdrawals);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al obtener retiros";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const shiftId = parseInt(id, 10);
    if (isNaN(shiftId))
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const input = CreateWithdrawalSchema.parse(await request.json());
    const withdrawal = await ShiftsService.createWithdrawal(
      shiftId,
      session.user.id,
      input.amount,
      input.concept,
    );
    return NextResponse.json(withdrawal, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: error.message }, { status: 400 });

    const message =
      error instanceof Error ? error.message : "Error al crear retiro";
    const status =
      message.includes("Solo se pueden") || message.includes("monto")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
