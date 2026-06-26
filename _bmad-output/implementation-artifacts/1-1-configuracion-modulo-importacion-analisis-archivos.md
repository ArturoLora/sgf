# Story 1.1: Configuración del Módulo de Importación y Análisis de Archivos

Status: ready-for-dev

## Story

As an administrador de SGF,
I want to upload one or more xlsx files from the Import Data section and immediately see an automated analysis of their content,
so that I know exactly what historical data the system detected — with zero risk of any database modification — before committing to any import.

## Acceptance Criteria

1. **Given** I am logged in as ADMIN and navigate to Configuración → Importación de Datos, **When** the page loads, **Then** the wizard renders at Step 1 with a file upload area and a non-ADMIN user is redirected to `/` before the page renders.

2. **Given** I upload a file containing a sheet named "SOCIOS" with the expected column headers (Codigo Socio, Socio, Telefonos, Correo Electronico, etc.), **When** the analysis completes, **Then** the system identifies the file type as "Archivo de Socios" and displays the count of data rows found.

3. **Given** I upload a file containing sheets "Cierre", "Ventas", "Inventario", "Canceladas", "Retiros", **When** the analysis completes, **Then** the system identifies it as "Archivo de Corte" and displays the folio (value from column B row 2 in Cierre sheet) and the opening date.

4. **Given** I upload a file that does not match any expected structure, **When** the analysis runs, **Then** the system rejects it with the message "Archivo no reconocido: no contiene las hojas esperadas (SOCIOS o Cierre/Ventas/Inventario)" and the wizard does not advance.

5. **Given** I upload multiple xlsx files simultaneously, **When** the analysis completes, **Then** each file is analyzed independently and displayed as a card showing detected type, record count, and status.

6. **Given** one or more valid files are uploaded and analyzed, **When** the analysis step completes, **Then** zero records have been written to or deleted from the database, and the summary shows: N socios detectados, M archivos de corte, K cortes, P SKUs en inventario, Q cajeros/vendedores inferidos.

## Tasks / Subtasks

- [ ] Task 1: Definir el Modelo Canónico y el contrato de adapters (AC: 2, 3, 4, 6)
  - [ ] 1.1 Crear `modules/migration/domain/canonical.types.ts` con las interfaces: `CanonicalMember`, `CanonicalShift`, `CanonicalSale`, `CanonicalInventoryRow`, `CanonicalWithdrawal`, `CanonicalFile` (unión discriminada de socios vs cortes)
  - [ ] 1.2 Crear `modules/migration/adapters/types.ts` con la interfaz `FileAdapter<T extends CanonicalFile>` y el tipo `AnalysisResult` (fileType, recordCount, detectedFolio?, detectedDate?, skuCount?, inferredUsers?, validationStatus, errorMessage?)
  - [ ] 1.3 Verificar (conceptualmente) que la adición de un hipotético `CsvAdapter` no requeriría modificar ningún archivo fuera de `modules/migration/adapters/` — documentar este check en comentario de `adapters/types.ts`

- [ ] Task 2: Instalar exceljs y crear adapters xlsx (AC: 2, 3, 4)
  - [ ] 2.1 Agregar `exceljs` a `package.json` como dependencia de producción; ejecutar `npm install`
  - [ ] 2.2 Crear `modules/migration/adapters/xlsx-socios.adapter.ts`: lee el buffer en memoria con exceljs, detecta hoja "SOCIOS", valida columnas esperadas, retorna `AnalysisResult` con `fileType: "socios"` y count de filas de datos. Sin parseo de contenido de celdas — solo detección estructural.
  - [ ] 2.3 Crear `modules/migration/adapters/xlsx-cortes.adapter.ts`: detecta hojas "Cierre", "Ventas", "Inventario", "Canceladas", "Retiros"; extrae folio de Cierre!B2 y fecha de apertura; cuenta filas en Ventas; cuenta SKUs únicos en Inventario; infiere cajeros/vendedores únicos del string en columna Forma Pago (solo cuenta — sin parsear el string). Retorna `AnalysisResult` con `fileType: "cortes"`.
  - [ ] 2.4 Crear `modules/migration/validators/file-structure.validator.ts`: función pura `validateFileStructure(workbook: ExcelJS.Workbook): ValidationResult` — valida que las hojas requeridas existen y contienen las columnas mínimas esperadas. Esta función es llamada por ambos adapters.

- [ ] Task 3: Servicio de análisis (AC: 4, 6)
  - [ ] 3.1 Crear `modules/migration/migration.service.ts` — función `analyzeFile(buffer: Buffer, filename: string): Promise<AnalysisResult>` que detecta el tipo de archivo intentando aplicar cada adapter en orden y retornando el primer match exitoso; si ninguno coincide, retorna `validationStatus: "unknown"` con el mensaje de error apropiado.
  - [ ] 3.2 Función `analyzeFiles(files: Array<{buffer: Buffer, filename: string}>): Promise<AnalysisResult[]>` que procesa múltiples archivos independientemente en paralelo (`Promise.all`). Esta función NO realiza ninguna escritura en la DB.
  - [ ] 3.3 Verificar que `migration.service.ts` no importa nada relacionado con xlsx/exceljs directamente — delega 100% a los adapters. El servicio solo conoce `AnalysisResult` y `FileAdapter`.

- [ ] Task 4: Tipos API y ruta de validación (AC: 1, 2, 3, 4, 6)
  - [ ] 4.1 Crear `types/api/migracion.ts` con: `AnalysisResultSchema` (Zod), `AnalysisResponseSchema` (array), y los tipos TypeScript inferidos
  - [ ] 4.2 Crear `app/api/migracion/validate/route.ts`: POST endpoint con auth check (`auth.api.getSession`); parsea `multipart/form-data` extrayendo archivos; convierte cada archivo a Buffer en memoria; llama a `MigrationService.analyzeFiles()`; retorna `AnalysisResult[]`. Zero writes a DB.
  - [ ] 4.3 El route NO accede a Prisma directamente — solo delega al servicio. Si el usuario no está autenticado retorna 401.

- [ ] Task 5: Navegación y página administrativa (AC: 1, 5, 6)
  - [ ] 5.1 Agregar entrada a `lib/navigation.ts` en `dashboardRoutes`: `{ label: "Configuración", href: "/configuracion", icon: Settings, adminOnly: true }`. Importar `Settings` de lucide-react.
  - [ ] 5.2 Crear `app/(dashboard)/configuracion/migracion/page.tsx` — server component: llama a `requireAdmin()` (de `@/lib/require-role`) al inicio; sin fetching de datos iniciales (la migración trabaja con uploads); renderiza `<MigracionManager />`.
  - [ ] 5.3 Crear `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx` — `"use client"` component: gestiona `step: 1 | 2 | 3 | 4 | 5` como estado interno; en el step 1 renderiza `<FileUploadStep />`; props: ninguna (standalone wizard).
  - [ ] 5.4 Crear `app/(dashboard)/configuracion/migracion/_components/FileUploadStep.tsx` — componente presentacional que recibe `onAnalysisComplete: (results: AnalysisResult[]) => void` como prop; implementa: área de drag-and-drop para archivos xlsx (usando atributos HTML nativos, sin librería externa); botón de selección de archivos; al confirmar, llama a `POST /api/migracion/validate` con FormData; muestra estado de carga; al recibir respuesta, renderiza una tarjeta por archivo con: tipo detectado (ícono socio vs ícono corte), conteo de registros, status (válido / desconocido), mensaje de error si aplica.

- [ ] Task 6: Verificación arquitectónica de extensibilidad (AC: implícito en AD-1)
  - [ ] 6.1 Revisar que `modules/migration/adapters/types.ts` define una interfaz `FileAdapter` suficientemente genérica para que un futuro `XmlCortesAdapter` o `CsvSociosAdapter` sea implementable sin modificar `migration.service.ts` ni `MigracionManager.tsx`.
  - [ ] 6.2 Asegurarse de que `migration.service.ts` descubra adapters mediante un registro (`ADAPTERS: FileAdapter[]`) — no mediante `if/switch` hardcodeados — para que agregar un adapter sea solo agregar al array.

## Dev Notes

### Decisión Arquitectónica Obligatoria — AD-1 (Canonical Model Pattern)

**Esta es la restricción más importante de toda la historia.** Todo el módulo de migración se construye sobre este principio:

```
Formato externo (xlsx / xml / csv)
  → Format Adapter (solo transforma: formato → CanonicalFile)
  → CanonicalFile / CanonicalMember / CanonicalShift (modelo neutro)
  → Migration Service (lógica de negocio: solo conoce el modelo canónico)
  → Prisma (escrituras en historias futuras)
```

- `modules/migration/adapters/` = **solo transformación de formato**. Ningún adapter contiene lógica de negocio. Si un adapter está haciendo algo más que leer celdas y construir el canonical model, está mal.
- `modules/migration/migration.service.ts` = **nunca importa ExcelJS ni ninguna librería de formato externo**. Si lo hace, la arquitectura está rota.
- Los parsers de dominio (membership-parser, payment-parser, date-converter) van en `modules/migration/domain/` y se crearán en Story 1.2. Esta historia solo implementa detección estructural — **no hay parseo de contenido de celdas**.

### Patrones del codebase que DEBES seguir

**Auth guard en page.tsx:**
```typescript
// app/(dashboard)/configuracion/migracion/page.tsx
import { requireAdmin } from "@/lib/require-role";  // ← requireAdmin, NO requireAuth

export default async function MigracionPage() {
  await requireAdmin();  // ← redirige a "/" si no es ADMIN
  return <MigracionManager />;
}
```

**Patrón de ruta API (copiar exactamente de app/api/members/route.ts):**
```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
if (!session) {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
```

**Importar Prisma (para historias futuras — esta historia NO toca Prisma):**
```typescript
import { prisma } from "@/lib/db";  // ← SIEMPRE esto, nunca @prisma/client directamente
```

**Manager como "use client" con todo el estado:**
```typescript
"use client";
export function MigracionManager() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  // ... el Manager pasa callbacks hacia abajo, nunca data fetching en componentes hijos
}
```

### Estructura de carpetas a crear

```
modules/migration/
  domain/
    canonical.types.ts          # Interfaces CanonicalMember, CanonicalShift, etc.
  adapters/
    types.ts                    # FileAdapter<T> interface + AnalysisResult type
    xlsx-socios.adapter.ts      # ExcelJS adapter para socios.xlsx
    xlsx-cortes.adapter.ts      # ExcelJS adapter para archivos de corte
  validators/
    file-structure.validator.ts # validateFileStructure() — función pura
  migration.service.ts          # analyzeFile(), analyzeFiles()

app/api/migracion/
  validate/
    route.ts                    # POST — análisis estructural, sin DB writes

app/(dashboard)/configuracion/
  migracion/
    page.tsx                    # Server component con requireAdmin()
    _components/
      MigracionManager.tsx      # Wizard shell "use client"
      FileUploadStep.tsx        # Step 1 — upload + análisis display

lib/navigation.ts               # MODIFICAR — agregar entrada Configuración
types/api/migracion.ts          # CREAR — Zod schemas para el response de validate
```

### Datos del sistema histórico (para guiar los adapters)

**socios.xlsx — hoja "SOCIOS" — columnas esperadas:**
```
Codigo Socio | Socio | Telefonos | Correo Electronico | Codigo Postal |
Fecha Nacimiento | Membresia | Fecha Inicio | Fecha Vencimiento |
Total Visitas | Visitas Ultimo Mes | Visitas Ultima Semana | Ultima Visita |
Dias Falta | Ultimo Pago
```
652 registros en la muestra. El header está en la fila 1, datos desde fila 2.

**cortes.xlsx — hojas requeridas:**
- "Cierre": folio en B2 (ej. "FN-248"), fecha en celda con etiqueta "Fecha Apertura"
- "Ventas": columnas `# Ticket | Fecha Venta | Num. Socio | Socio | Descripcion | Forma Pago | Precio | Dcto. | Cargo`
- "Inventario": columnas `Producto | Exi Anterior | Ajuste | Exi Inicial | Entradas | Salidas | Exi Actual` — 56 filas (SKUs)
- "Canceladas": misma estructura que Ventas
- "Retiros": columnas `Folio | Fecha Retiro | Concepto | Efectivo`

**Forma Pago en cortes** tiene formato "MÉTODO (NOMBRE)" ej. `"EFECTIVO (CARLOS)"` — la detección de usuarios inferidos puede hacerse con regex simple: extraer lo que está entre paréntesis en la columna Forma Pago. Solo contar únicos en Step 1 — no parsear.

### exceljs — notas de implementación

- Instalar: `npm install exceljs`
- Tiene tipos TypeScript incorporados (`@types/exceljs` no se necesita)
- Leer desde buffer (no desde disco):
```typescript
import ExcelJS from "exceljs";

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);
const sheet = workbook.getWorksheet("SOCIOS");
// sheet?.rowCount — total filas incluyendo header
// sheet?.actualRowCount — filas con datos
```
- Para obtener el valor de una celda: `sheet.getCell("B2").value?.toString()`
- Para contar filas con datos: iterar `sheet.eachRow()` excluyendo fila 1 (header)

### Manejo de FormData en Next.js App Router (ruta API)

```typescript
// app/api/migracion/validate/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("files") as File[];  // ← "files" es el nombre del campo
  
  const fileBuffers = await Promise.all(
    files.map(async (file) => ({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
    }))
  );
  
  const results = await MigrationService.analyzeFiles(fileBuffers);
  return NextResponse.json(results);
}
```

### Navegación — nota importante

`lib/navigation.ts` tiene el campo `adminOnly?: boolean` en la interfaz `NavRoute` pero el `Sidebar.tsx` NO filtra por este campo — muestra todos los items a todos los usuarios. La protección real está en `requireAdmin()` dentro de `page.tsx`. Para esta historia, esto es suficiente: el link de Configuración será visible para todos pero la página redirigirá a no-admins. Filtrar el nav por rol es una mejora de UX para una historia futura.

### Project Structure Notes

- El módulo `modules/migration/` sigue el mismo patrón que `modules/members/`, `modules/products/`, etc.
- `migration.service.ts` NO debe importar desde `services/` (legacy) ni de otros módulos — es autónomo.
- `canonical.types.ts` es el único archivo del que dependen todos los demás — no tiene dependencias externas.
- Los adapters importan ExcelJS (librería externa) pero ningún adapter importa de otro adapter ni del servicio.
- Story 1.2 agregará los parsers de dominio (membership-parser, payment-parser, date-converter) como funciones puras en `modules/migration/domain/`. Esta historia NO los incluye.

### Alcance estricto de esta historia

**Incluido:**
- Detección de tipo de archivo (socios vs cortes vs desconocido)
- Validación estructural (hojas y columnas presentes)
- Conteo de registros y extracción de metadatos básicos (folio, fecha, conteos)
- Inferencia superficial de usuarios (solo contar nombres únicos entre paréntesis en Forma Pago)
- Ruta API `/api/migracion/validate`
- UI: wizard paso 1 (upload + resultados de análisis)
- Entrada en navegación de Configuración

**Excluido explícitamente (historias futuras):**
- Parseo de fechas seriales Excel → DateTime (Story 1.2)
- Parseo de "EFECTIVO ANUALIDAD ESTUDIANTE" → MembershipType (Story 1.2)
- Parseo de "EFECTIVO (CARLOS)" → {paymentMethod, user} (Story 1.2)
- Detección de inconsistencias/mapeo de empleados (Story 1.3)
- Escritura de datos en la base de datos (Stories 1.4, 1.5)
- Paso de reconstrucción/borrado (Epic 2)

### Estrategia de pruebas

El proyecto actualmente tiene 0% cobertura de tests (confirmado en investigación post-piloto). Para esta historia:

1. **Smoke test manual**: Subir `docs/socios.xlsx` → verificar que detecta "Archivo de Socios" con 652 registros. Subir `docs/cortes.xlsx` → verificar que detecta "Archivo de Corte" con folio "FN-248". Subir un xlsx inválido → verificar mensaje de error correcto.

2. **Testabilidad por diseño**: `validateFileStructure()` en `file-structure.validator.ts` es una función pura (sin I/O) — puede ser testeada con `npx tsx` si se quisiera. Los adapters son instancias que reciben buffer → devuelven AnalysisResult, sin efectos secundarios. `migration.service.ts` recibe buffers → devuelve resultados — testeable en aislamiento.

3. **Verificación arquitectónica**: Tras completar la historia, revisar que `migration.service.ts` no contiene ningún `import` de `exceljs`. Si lo tiene, la arquitectura está rota — solo los adapters importan ExcelJS.

### Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Archivos xlsx grandes en memoria | Media | exceljs soporta streaming, pero para análisis completo necesitamos load(). Limitar tamaño máximo de upload a 10MB en el route (los archivos de `docs/` son <100KB). |
| Next.js App Router FormData multipart | Baja | El patrón `formData.getAll("files") as File[]` funciona en Next.js 16. Ver sección "Manejo de FormData" arriba. |
| Sidebar muestra Configuración a no-admins | Baja | Aceptado para esta historia. La página redirige con `requireAdmin()`. Mejora UX en historia futura. |
| Folio en Cierre!B2 no garantizado en todas las muestras | Baja | Las 2 muestras disponibles tienen folio en B2. Agregar fallback: buscar celda con "FN-" en la primera columna si B2 falla. |

### References

- Epics file: `_bmad-output/planning-artifacts/epics.md#epic-1-sincronizacion-e-importacion-de-datos`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#stack-baseline`
- Auth pattern: `lib/require-role.ts` + `app/(dashboard)/socios/page.tsx`
- API route pattern: `app/api/members/route.ts`
- Module pattern: `modules/members/members.service.ts`, `modules/products/products.service.ts`
- Manager pattern: `app/(dashboard)/socios/_components/socios-manager.tsx`
- Navigation: `lib/navigation.ts` + `components/layout/Sidebar.tsx`
- Historical data structure: `_bmad-output/implementation-artifacts/investigations/sgf-auditoria-migracion-investigation.md#11-entidades-reales-en-los-excel`
- Canonical model decision: `_bmad-output/planning-artifacts/epics.md#ad-1--separacion-estricta`

## Dev Agent Record

### Agent Model Used

_pending_

### Debug Log References

### Completion Notes List

### File List
