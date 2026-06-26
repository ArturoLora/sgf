import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MigrationService } from "@/modules/migration/migration.service";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request inválido: se esperaba multipart/form-data" },
      { status: 400 }
    );
  }

  const files = formData.getAll("files") as File[];
  if (files.length === 0) {
    return NextResponse.json({ error: "No se recibieron archivos" }, { status: 400 });
  }

  const oversized = files.find((f) => f.size > MAX_FILE_SIZE);
  if (oversized) {
    return NextResponse.json(
      { error: `Archivo demasiado grande: ${oversized.name}. Máximo 10MB.` },
      { status: 400 }
    );
  }

  const fileBuffers = await Promise.all(
    files.map(async (file) => ({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
    }))
  );

  const results = await MigrationService.analyzeFiles(fileBuffers);
  return NextResponse.json(results);
}
