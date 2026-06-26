# Story 1.2: Parsers de Dominio y Previsualización Completa

Status: review

## Story

As an administrador de SGF,
I want to see a complete preview of how every historical record will be interpreted and transformed before it is written to the database,
so that I can verify the correctness of the mapping — including edge cases and unrecognized values — before approving the migration.

## Acceptance Criteria

### Parsers de membresía

1. **Given** `membresia` contains `"EFECTIVO MENSUALIDAD ESTUDIANTE ENE 2026"`,
   **When** parsed,
   **Then** `paymentMethod = CASH`, `membershipType = MONTH_STUDENT`, `month = 1`, `year = 2026`.

2. **Given** `membresia` contains `"TARJETA ANUALIDAD GENERAL DIC 2025"`,
   **When** parsed,
   **Then** `paymentMethod = DEBIT_CARD`, `membershipType = ANNUAL_GENERAL`, `month = 12`, `year = 2025`.

3. **Given** `membresia` contains `"MENSUALIDAD LEO MAR 2024"` (trainer-specific monthly),
   **When** parsed,
   **Then** `membershipType = MONTH_GENERAL`, `trainerName = "LEO"`.

4. **Given** `membresia` contains `"SEMANA LEO ENE 2024"`,
   **When** parsed,
   **Then** `membershipType = WEEK`, `trainerName = "LEO"`.

5. **Given** `membresia` contains `"PRMOCION FACEBOOK ESTUDIANTE ABR 2024"` (typo — missing 'O'),
   **When** parsed,
   **Then** `membershipType = PROMOTION` (typo is tolerated).

6. **Given** `membresia` contains `"PROMOCION FACEBOOK GENERAL MAY 2024"` or `"PROMOCIÓN MAY 2024"` (with accent),
   **When** parsed,
   **Then** `membershipType = PROMOTION`.

7. **Given** `membresia` contains `"RE NACER OCT 2025"`,
   **When** parsed,
   **Then** `membershipType = REBIRTH`.

8. **Given** `membresia` contains `"PACIENTES NACHO AGO 2024"` or `"PACIENTES CONSULTA NACHO ENE 2026"` or `"TARJETA PACIENTES NACHO MAR 2025"`,
   **When** parsed,
   **Then** `membershipType = NUTRITION_CONSULTATION`.

9. **Given** `membresia` contains `"PPE ENE 2024"`, `"PPG FEB 2024"`, or `"PPL MAR 2024"`,
   **When** parsed,
   **Then** `membershipType = MONTH_STUDENT` (PPE), `MONTH_GENERAL` (PPG), `MONTH_GENERAL` (PPL) respectively.

10. **Given** `membresia` contains `"ESPECIAL NOV 2025"`,
    **When** parsed,
    **Then** `membershipType = null` and a `ParseWarning` is emitted with `field: "membresia"`, `originalValue: "ESPECIAL NOV 2025"`.

11. **Given** `membresia` contains any unrecognized string,
    **When** parsed,
    **Then** `membershipType = null` and a `ParseWarning` is emitted.

12. **Given** `membresia` is `null` or empty,
    **When** parsed,
    **Then** `membershipType = null`, no warning emitted.

### Parsers de forma de pago

13. **Given** `formaPago = "EFECTIVO"`,
    **When** parsed,
    **Then** `paymentMethod = CASH`, `sellerName = null`.

14. **Given** `formaPago = "EFECTIVO (CARLOS)"`,
    **When** parsed,
    **Then** `paymentMethod = CASH`, `sellerName = "CARLOS"`.

15. **Given** `formaPago = "EFECTIVO (ALICIA ACEVEDO)"`,
    **When** parsed,
    **Then** `paymentMethod = CASH`, `sellerName = "ALICIA ACEVEDO"`.

16. **Given** `formaPago = "TARJETA DEBITO"`,
    **When** parsed,
    **Then** `paymentMethod = DEBIT_CARD`, `sellerName = null`.

17. **Given** `formaPago = "TARJETA CREDITO"`,
    **When** parsed,
    **Then** `paymentMethod = CREDIT_CARD`, `sellerName = null`.

18. **Given** `formaPago = "TRANSFERENCIA"`,
    **When** parsed,
    **Then** `paymentMethod = TRANSFER`, `sellerName = null`.

19. **Given** `formaPago` is null or empty,
    **When** parsed,
    **Then** `paymentMethod = null`, `sellerName = null`.

### Parsers de fechas

20. **Given** `fechaVenta = "07-ene-2026 15:48"` (Spanish date string from Ventas sheet),
    **When** parsed,
    **Then** result is a valid `Date` for January 7, 2026 at 15:48.

21. **Given** `fechaApertura = "miércoles 07-ene-2026"` (Cierre sheet — day-of-week prefix),
    **When** parsed,
    **Then** result is a valid `Date` for January 7, 2026 (time from `horaInicio`).

22. **Given** `fechaInicio` or `fechaVencimiento` in socios is already a JavaScript `Date` object (as provided by exceljs for date-formatted cells),
    **When** parsed,
    **Then** it is passed through to ISO string without conversion.

23. **Given** `fechaInicio` is a numeric Excel serial (e.g. `45678` — defensive case for older files),
    **When** parsed,
    **Then** it is correctly converted to a calendar date using the Excel 1900 epoch (1899-12-30 base, accounting for the 1900 leap-year bug).

24. **Given** `horaInicio` or `horaFin` in Cierre is a `Date` object with base date 1899-12-30 (exceljs time-only representation),
    **When** parsed,
    **Then** only the `HH:mm` time component is extracted.

### Normalización de campos opcionales

25. **Given** `telefono` is `"Na"`, `"na"`, `"N"`, `"n"`, `"0"`, `""`, or any variant that signals absence,
    **When** normalized,
    **Then** result is `null`.

26. **Given** `correo` does not contain `"@"` (e.g. `"na"`, `"am"`, `"naa"`, `"n"`, `""`),
    **When** normalized,
    **Then** result is `null`.

27. **Given** `correo` is a valid email containing `"@"`,
    **When** normalized,
    **Then** it is preserved as-is (lowercased).

### Transformación de inventario

28. **Given** an `InventarioRow` with `existenciaActual = 15`,
    **When** transformed,
    **Then** `gymStock = 15`, `warehouseStock = 0`.

### Campos legacy de Cierre

29. **Given** Cierre row 16 `"Ventas Anticipo"` has value `> 0`, or row 17 `"Comision a Pagar"` has value `> 0`, or row 21 `"Total Ventas Web"` has value `> 0`,
    **When** transformed,
    **Then** these are captured in `legacyNotes` as a formatted string (e.g. `"Anticipo: $500 | Comisión: $100"`) to be stored in `Shift.notes`.

30. **Given** all three legacy Cierre fields are zero or absent,
    **When** transformed,
    **Then** `legacyNotes` is `null`.

### Previsualización y API

31. **Given** valid files have been analyzed in Step 1,
    **When** the admin clicks "Generar Previsualización",
    **Then** files are sent to `POST /api/migracion/preview` and the UI shows a loading state.

32. **Given** `POST /api/migracion/preview` is called with valid xlsx files,
    **When** it completes,
    **Then** it returns parsed `DomainMember[]`, `DomainShift[]`, warnings count, and a breakdown of `membershipType` distribution — with **zero DB writes**.

33. **Given** the preview response is received,
    **When** rendered,
    **Then** Step 2 shows: a summary banner (N socios, M cortes, K warnings), a socios table showing parsed fields (membershipType, fechaInicio, fechaVencimiento), and a cortes section showing shift folio + sale count + warning count per corte.

34. **Given** there are parse warnings,
    **When** rendered,
    **Then** warnings are listed with `field`, `originalValue`, and `message` — grouped by file.

## Tasks / Subtasks

- [x] Task 1: Definir tipos de dominio (AC: todos)
  - [x] 1.1 Crear `modules/migration/domain/domain.types.ts` con interfaces `DomainMember`, `DomainSale`, `DomainInventoryRow`, `DomainWithdrawal`, `DomainShift`, `ParseWarning`, `ParseResult<T>` — ver Dev Notes para definiciones exactas
  - [x] 1.2 Verificar que `domain.types.ts` no importa nada de Prisma, exceljs, ni HTTP

- [x] Task 2: Parser de membresía (AC: 1–12)
  - [x] 2.1 Crear `modules/migration/domain/parsers/membership-parser.ts` con función pura `parseMembership(raw: string | null): MembershipParseResult`
  - [x] 2.2 Implementar strip de prefijo de pago (EFECTIVO → CASH, TARJETA → DEBIT_CARD)
  - [x] 2.3 Implementar tabla de mapeo exhaustiva para todos los patrones reales — ver Dev Notes
  - [x] 2.4 Implementar normalización Unicode: quitar acentos antes de comparar (PROMOCIÓN → PROMOCION)

- [x] Task 3: Parser de forma de pago (AC: 13–19)
  - [x] 3.1 Crear `modules/migration/domain/parsers/payment-parser.ts` con función pura `parseFormaPago(raw: string | null): FormaPagoParseResult`
  - [x] 3.2 Extraer `sellerName` del patrón `"MÉTODO (NOMBRE)"` usando regex `\(([^)]+)\)`
  - [x] 3.3 Mapear métodos: EFECTIVO → CASH, TARJETA DEBITO → DEBIT_CARD, TARJETA CREDITO → CREDIT_CARD, TRANSFERENCIA → TRANSFER

- [x] Task 4: Parser de fechas (AC: 20–24)
  - [x] 4.1 Crear `modules/migration/domain/parsers/date-parser.ts` con funciones puras
  - [x] 4.2 Implementar `parseSpanishDateString(raw: string): Date | null` — formato `"dd-mmm-yyyy HH:mm"` y `"día dd-mmm-yyyy"` (con prefijo día-semana)
  - [x] 4.3 Implementar `parseExcelTimeSerial(d: Date): string` — extrae `"HH:mm"` de fecha con epoch 1899-12-30
  - [x] 4.4 Implementar `parseExcelDateSerial(serial: number): Date` — conversión defensiva para fechas numéricas
  - [x] 4.5 Implementar `normalizeDate(value: unknown): Date | null` — acepta `Date` (pass-through), `number` (serial), `string` (española)

- [x] Task 5: Normalizador de campos opcionales (AC: 25–27)
  - [x] 5.1 Crear `modules/migration/domain/parsers/null-normalizer.ts` con `normalizePhone(raw: string | null): string | null` y `normalizeEmail(raw: string | null): string | null`
  - [x] 5.2 Phone null-like: cualquier string que, en minúsculas y sin espacios, sea `""`, `"na"`, `"n"`, `"n/a"`, `"0"`, `"000"`, `"ninguno"`, o que empiece con `"sin"` → `null`
  - [x] 5.3 Email null-like: cualquier string sin `"@"` → `null`; con `"@"` → lowercase

- [x] Task 6: Transformador de socios (AC: 1–12, 22–27)
  - [x] 6.1 Crear `modules/migration/domain/transformers/member-transformer.ts` con `transformMembers(members: CanonicalMember[]): ParseResult<DomainMember>`
  - [x] 6.2 Llamar a todos los parsers por campo; acumular `ParseWarning[]` con `row`, `field`, `originalValue`, `message`
  - [x] 6.3 Preservar `membershipDescription` como el string original crudo (útil para auditoría)

- [x] Task 7: Transformador de cortes (AC: 13–24, 28–30)
  - [x] 7.1 Crear `modules/migration/domain/transformers/shift-transformer.ts` con `transformShift(shift: CanonicalShift): ParseResult<DomainShift>`
  - [x] 7.2 Transformar cada `CanonicalSale` → `DomainSale` usando `parseFormaPago` y `parseSpanishDateString`
  - [x] 7.3 Transformar cada `CanonicalInventoryRow` → `DomainInventoryRow` con `gymStock = existenciaActual`, `warehouseStock = 0`
  - [x] 7.4 Extraer campos legacy de Cierre (Ventas Anticipo, Comision a Pagar, Total Ventas Web) — ver Dev Notes para cómo llegan en el modelo canónico

- [x] Task 8: Extender el modelo canónico para campos legacy de Cierre (AC: 29–30)
  - [x] 8.1 Agregar a `CanonicalShift` en `canonical.types.ts`: `ventasAnticipo?: number; comisionAPagar?: number; totalVentasWeb?: number`
  - [x] 8.2 Extender `xlsx-cortes.adapter.ts` para leer rows 16, 17, 21 del Cierre y poblar estos campos
  - [x] 8.3 Verificar que el adapter ya usa `findCierreValue()` — reutilizar para los nuevos campos

- [x] Task 9: Servicio de previsualización (AC: 31–32)
  - [x] 9.1 Agregar `previewFile(buffer: Buffer, filename: string): Promise<PreviewResult>` a `migration.service.ts`
  - [x] 9.2 Agregar `previewFiles(files): Promise<PreviewFilesResult>` — procesa socios y cortes en paralelo
  - [x] 9.3 `PreviewFilesResult` contiene: `members: DomainMember[]`, `shifts: DomainShift[]`, `warnings: ParseWarning[]`, `membershipTypeDistribution: Record<string, number>`
  - [x] 9.4 El servicio NO importa exceljs — delega al adapter para obtener el CanonicalFile, luego llama a los transformadores

- [x] Task 10: Ruta API `POST /api/migracion/preview` (AC: 31–32)
  - [x] 10.1 Crear `app/api/migracion/preview/route.ts` — mismo patrón que `/validate`: auth check, multipart/form-data, Buffer conversion, llamada a `MigrationService.previewFiles()`, retorno JSON
  - [x] 10.2 Zero writes a Prisma
  - [x] 10.3 Crear `types/api/migracion.ts` extensión: `PreviewResponseSchema` y tipo inferido (reutilizar archivo existente, solo agregar schemas)

- [x] Task 11: Extender adapters para retornar CanonicalFile completo (AC: 31–32)
  - [x] 11.1 Agregar `tryParse(buffer: Buffer, filename: string): Promise<CanonicalFile | null>` a la interfaz `FileAdapter` en `adapters/types.ts`
  - [x] 11.2 Implementar `tryParse` en `xlsx-socios.adapter.ts`: lee todas las filas de la hoja SOCIOS, construye `CanonicalMember[]`, retorna `CanonicalMembersFile`
  - [x] 11.3 Implementar `tryParse` en `xlsx-cortes.adapter.ts`: lee Ventas, Inventario, Retiros completos; construye `CanonicalShift`; retorna `CanonicalShiftFile`
  - [x] 11.4 `tryAnalyze` existente no cambia — sigue siendo solo para análisis estructural (Story 1.1 no se rompe)

- [x] Task 12: UI — PreviewStep y actualización de MigracionManager (AC: 33–34)
  - [x] 12.1 Crear `app/(dashboard)/configuracion/migracion/_components/PreviewStep.tsx`
  - [x] 12.2 `PreviewStep` recibe `files: File[]` y `onPreviewComplete: (result: PreviewFilesResult) => void` como props
  - [x] 12.3 Al montar, envía archivos a `/api/migracion/preview`, muestra skeleton de carga
  - [x] 12.4 Tras respuesta: render de `SummaryBanner` (N socios, M cortes, K warnings), tabla de socios con `membershipType` y fechas, sección de cortes con folio y conteo de ventas, lista de warnings agrupados por archivo
  - [x] 12.5 Actualizar `MigracionManager.tsx`: almacenar `analysisFiles: File[]` en state tras Step 1; avanzar a `step = 2` con botón "Continuar"; en Step 2 renderizar `<PreviewStep files={analysisFiles} />`

## Dev Notes

### Tipos de dominio a crear en `domain.types.ts`

```typescript
// modules/migration/domain/domain.types.ts
// NO imports from Prisma, exceljs, HTTP, or environment.

import type { MembershipType, PaymentMethod } from "@/app/generated/prisma";

export interface DomainMember {
  memberNumber: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  membershipType: MembershipType | null;
  membershipDescription: string | null; // raw original string — preserved for audit
  totalVisits: number;
  lastVisit: Date | null;
  isActive: boolean;
}

export interface DomainSale {
  ticket: string;
  saleDate: Date | null;
  memberNumber: string | null;
  memberName: string | null;
  description: string;
  paymentMethod: PaymentMethod | null;
  sellerName: string | null;
  price: number;
  discount: number;
  surcharge: number;
  isCancelled: boolean;
  isMembership: boolean; // true if description matches a membership pattern
}

export interface DomainInventoryRow {
  productName: string;
  gymStock: number;        // = existenciaActual from xlsx
  warehouseStock: number;  // always 0 during import
}

export interface DomainWithdrawal {
  withdrawalDate: Date | null;
  concept: string;
  amount: number;
}

export interface DomainShift {
  folio: string;
  openingDate: Date | null;
  openingTime: string | null;  // "HH:mm" extracted from Cierre horaInicio
  closingTime: string | null;  // "HH:mm" extracted from Cierre horaFin
  sales: DomainSale[];
  inventory: DomainInventoryRow[];
  withdrawals: DomainWithdrawal[];
  legacyNotes: string | null;  // formatted string for Shift.notes
}

export interface ParseWarning {
  filename: string;
  row?: number;
  field: string;
  originalValue: string;
  message: string;
}

export interface ParseResult<T> {
  data: T;
  warnings: ParseWarning[];
}

export interface PreviewFilesResult {
  members: DomainMember[];
  shifts: DomainShift[];
  warnings: ParseWarning[];
  membershipTypeDistribution: Partial<Record<string, number>>;
}
```

### Tabla exhaustiva de mapeo de membresías (datos reales de 652 socios, 172 strings únicos)

Algoritmo del parser:
1. Trim + uppercase + normalize unicode (quitar acentos)
2. Strip prefijo de pago: si empieza con `"EFECTIVO "` → `paymentMethod = CASH`; si empieza con `"TARJETA "` → `paymentMethod = DEBIT_CARD`. Strip el prefijo del string para continuar.
3. Match contra tabla de patrones:

| Patrón (después de strip) | `membershipType` | Notas |
|--------------------------|-----------------|-------|
| `MENSUALIDAD ESTUDIANTE ...` | `MONTH_STUDENT` | |
| `MENSUALIDAD GENERAL ...` | `MONTH_GENERAL` | |
| `MENSUALIDAD LEO ...` | `MONTH_GENERAL` | `trainerName = "LEO"` |
| `MENSUALIDAD ...` (sin categoría) | `MONTH_GENERAL` | |
| `ANUALIDAD ESTUDIANTE ...` | `ANNUAL_STUDENT` | |
| `ANUALIDAD GENERAL ...` | `ANNUAL_GENERAL` | |
| `ANUALIDAD ...` (sin categoría) | `ANNUAL_GENERAL` | |
| `SEMANA LEO ...` | `WEEK` | `trainerName = "LEO"` |
| `SEMANA ...` | `WEEK` | |
| `VISITA` | `VISIT` | |
| `PACIENTES CONSULTA NACHO ...` | `NUTRITION_CONSULTATION` | |
| `PACIENTES NACHO ...` | `NUTRITION_CONSULTATION` | |
| `RE NACER ...` | `REBIRTH` | |
| `PRMOCION ...` (typo) | `PROMOTION` | normalizado antes de comparar |
| `PROMOCION ...` | `PROMOTION` | |
| `PROMOCION FACEBOOK ESTUDIANTE ...` | `PROMOTION` | |
| `PROMOCION FACEBOOK GENERAL ...` | `PROMOTION` | |
| `ESPECIAL ...` | `null` | warning emitido |
| `PPE ...` | `MONTH_STUDENT` | Precio Preferencial Estudiante |
| `PPG ...` | `MONTH_GENERAL` | Precio Preferencial General |
| `PPL ...` | `MONTH_GENERAL` | Precio Preferencial Leo |
| `LEO ...` (standalone) | `MONTH_GENERAL` | ocurrencias antiguas 2023 |
| cualquier otro | `null` | warning emitido |

**Implementación recomendada** — ordenar los checks de más específico a menos:
```typescript
// Normalize helper
function normalize(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip diacritics
}

// Then use startsWith() checks in order of specificity
```

**Extracción de mes y año** (para `DomainMember.startDate` si fechaInicio es null):
Los strings de membresía terminan en `"MES AÑO"` donde MES es abreviatura española de 3 letras.
Esto es opcional para Story 1.2 — no se requiere para los AC pero puede implementarse si es directo.

### Parser de Forma de Pago

```typescript
// modules/migration/domain/parsers/payment-parser.ts

export interface FormaPagoParseResult {
  paymentMethod: PaymentMethod | null;
  sellerName: string | null;
}

// Regex: "MÉTODO (NOMBRE OPCIONAL)" or "MÉTODO EXTRA (NOMBRE)"
// Examples: "EFECTIVO", "EFECTIVO (CARLOS)", "EFECTIVO (ALICIA ACEVEDO)"
const SELLER_REGEX = /\(([^)]+)\)/;

const METHOD_MAP: Record<string, PaymentMethod> = {
  "EFECTIVO": "CASH",
  "TARJETA DEBITO": "DEBIT_CARD",
  "TARJETA DÉBITO": "DEBIT_CARD",
  "TARJETA CREDITO": "CREDIT_CARD",
  "TARJETA CRÉDITO": "CREDIT_CARD",
  "TRANSFERENCIA": "TRANSFER",
};
```

**Nota crítica**: en los archivos de corte reales (enero 2026) solo aparece `"EFECTIVO"` y `"EFECTIVO (NOMBRE)"` en la columna Forma Pago de Ventas. TARJETA/TRANSFERENCIA aparecen únicamente en el resumen del Cierre (no en ventas individuales de los archivos analizados). El parser debe soportar todos los métodos igualmente para otros cortes históricos.

### Parser de Fechas

**Formato de Ventas** (string): `"07-ene-2026 15:48"`
```typescript
const SPANISH_MONTHS: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

// Regex: "dd-mmm-yyyy HH:mm" (con o sin prefijo "día ")
// Strip prefijo día-semana: /^[a-záéíóúüñ]+ /i antes de parsear
function parseSpanishDateString(raw: string): Date | null {
  const cleaned = raw.replace(/^[a-záéíóúüñ]+ /i, "").trim(); // strip "miércoles "
  const match = cleaned.match(/^(\d{1,2})-([a-z]{3})-(\d{4})(?: (\d{2}):(\d{2}))?$/i);
  if (!match) return null;
  const [, day, monthStr, year, hour = "0", minute = "0"] = match;
  const month = SPANISH_MONTHS[monthStr.toLowerCase()];
  if (month === undefined) return null;
  return new Date(+year, month, +day, +hour, +minute);
}
```

**Fechas de socios** (ya son Date objects de exceljs): pasar directo.

**Horas de Cierre** (Date con epoch 1899-12-30):
```typescript
function parseExcelTimeSerial(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
```

**Seriales numéricos de Excel** (defensivo — older files):
```typescript
// Excel epoch: 1899-12-30. Buggy 1900 leap day adds 1 to dates >= 1900-03-01.
const EXCEL_EPOCH = new Date(1899, 11, 30).getTime(); // Dec 30, 1899
function parseExcelDateSerial(serial: number): Date {
  return new Date(EXCEL_EPOCH + serial * 86400000);
}
```

**Función unificada** (usada en los transformers):
```typescript
function normalizeDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") return parseExcelDateSerial(value);
  if (typeof value === "string") return parseSpanishDateString(value);
  return null;
}
```

### Lectura completa de filas en los adapters (Task 11)

**SOCIOS** — columnas por nombre (buscadas dinámicamente con `findColumnIndex` por header):
```
Codigo Socio | Socio | Telefonos | Correo Electronico | Codigo Postal |
Fecha Nacimiento | Membresia | Fecha Inicio | Fecha Vencimiento |
Total Visitas | Visitas Ultimo Mes | Visitas Ultima Semana | Ultima Visita |
Dias Falta | Ultimo Pago
```

Nota: la hoja real tiene `"Socio"` (no `"Nombre"`) y `"Telefonos"` (no `"Telefono"`).
Usar `findColumnIndex(sheet, headerRow, "Socio")` para cada columna.

**VENTAS** — columnas: `# Ticket | Fecha Venta | Num Socio | Socio | Descripcion | Forma Pago | Precio | Descuento | Cargo`

Filas de datos: `headerRow + 1` en adelante. Una fila es dato si `# Ticket` no está vacía.
Fila con texto en col 1 que no sea numérico (como "CANCELADAS") = separador — usar `isCancelled` toggle.

**Retiros** — la hoja `"Retiros"` tiene columnas similares: `Folio | Fecha Retiro | Concepto | Efectivo`.

**Inventario** — columnas: `Producto | Existencia Anterior | Ajuste | Existencia Inicial | Entradas | Salidas | Existencia Actual`

**Campos legacy de Cierre** (Task 8):
Leer estos rows de la hoja Cierre usando `findCierreValue()` que ya existe en el adapter:
- Row ~16: label `"Ventas Anticipo"` → `ventasAnticipo`
- Row ~17: label `"Comision a Pagar"` → `comisionAPagar`
- Row ~21: label `"Total Ventas Web"` → `totalVentasWeb`

Los labels exactos pueden variar — usar `includes()` case-insensitive como ya lo hace `findCierreValue`.

### Extensión de FileAdapter

```typescript
// modules/migration/adapters/types.ts — agregar método sin romper implementaciones existentes

export interface FileAdapter {
  tryAnalyze(buffer: Buffer, filename: string): Promise<AnalysisResult | null>;
  tryParse(buffer: Buffer, filename: string): Promise<CanonicalFile | null>; // nuevo en 1.2
}
```

El `migration.service.ts` usará `tryParse` para el nuevo flujo de previsualización.
El flujo existente (`tryAnalyze`) no cambia.

### Ruta API `/api/migracion/preview`

Patrón idéntico al de `/validate`:
```typescript
// app/api/migracion/preview/route.ts
export async function POST(request: Request): Promise<Response> {
  // 1. Auth check — igual que validate/route.ts
  // 2. Parse FormData, extraer File[], convertir a Buffer[]
  // 3. MigrationService.previewFiles(files)
  // 4. Return JSON
  // ZERO Prisma calls
}
```

### Extensión de `types/api/migracion.ts`

Agregar al archivo existente (no reemplazar):
```typescript
// Agregar exports nuevos sin borrar AnalysisResultSchema existente
export const PreviewResponseSchema = z.object({
  members: z.array(z.object({ ... })),
  shifts: z.array(z.object({ ... })),
  warnings: z.array(z.object({
    filename: z.string(),
    row: z.number().optional(),
    field: z.string(),
    originalValue: z.string(),
    message: z.string(),
  })),
  membershipTypeDistribution: z.record(z.number()),
});
export type PreviewResponseType = z.infer<typeof PreviewResponseSchema>;
```

### Preservar comportamiento de Story 1.1

- `POST /api/migracion/validate` no cambia.
- `FileUploadStep.tsx` no cambia.
- `MigracionManager.tsx` solo se extiende — el step 1 funciona igual.
- Los tests de humo existentes deben seguir pasando.

### Restricciones arquitectónicas

- Todos los parsers en `modules/migration/domain/parsers/` solo importan de `domain.types.ts` y de `@/app/generated/prisma` (para los enums) — nunca de exceljs, Prisma client, ni HTTP.
- Los transformers en `modules/migration/domain/transformers/` solo importan parsers y tipos — nunca exceljs.
- `migration.service.ts` nunca importa exceljs directamente — AD-1 invariant.
- Cero llamadas a Prisma en toda la cadena de preview.

## Dev Agent Record

### Debug Log

- `buffer as AnyBuffer` cast rejected by TS strict mode on Node 20 generic Buffer — changed to `buffer as unknown as AnyBuffer` in both adapters.
- `MONTH_YEAR_RE` only matched 3-letter abbreviations (ENE, FEB…); real Excel data uses full names (ENERO, FEBRERO…) — extended regex and lookup table to handle both.
- Month/year extraction works correctly after fix: 65/65 smoke tests pass.

### Completion Notes

All 12 tasks implemented. Observable parsers: every unrecognized value produces a `ParseWarning` with `code`, `field`, `originalValue`, and `message` — no silent failures. AD-1 invariant preserved: `migration.service.ts` never imports exceljs. Zero Prisma calls in the preview chain. TypeScript clean, ESLint clean.

### File List

**New:**
- `modules/migration/domain/domain.types.ts`
- `modules/migration/domain/parsers/membership-parser.ts`
- `modules/migration/domain/parsers/payment-parser.ts`
- `modules/migration/domain/parsers/date-parser.ts`
- `modules/migration/domain/parsers/null-normalizer.ts`
- `modules/migration/domain/transformers/member-transformer.ts`
- `modules/migration/domain/transformers/shift-transformer.ts`
- `modules/migration/adapters/xlsx-cell-utils.ts`
- `app/api/migracion/preview/route.ts`
- `app/(dashboard)/configuracion/migracion/_components/PreviewStep.tsx`
- `scripts/parse-smoke-test.ts`

**Modified:**
- `modules/migration/domain/canonical.types.ts` — added `horaInicio`, `horaFin`, legacy Cierre fields
- `modules/migration/adapters/types.ts` — added `tryParse` to `FileAdapter` interface
- `modules/migration/adapters/xlsx-socios.adapter.ts` — added `tryParse`
- `modules/migration/adapters/xlsx-cortes.adapter.ts` — added `tryParse`, refactored to shared cell-utils
- `modules/migration/migration.service.ts` — added `previewFiles()`
- `types/api/migracion.ts` — added Story 1.2 schemas and types
- `app/(dashboard)/configuracion/migracion/_components/FileUploadStep.tsx` — updated signature + Continuar button
- `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx` — step 2 wired to PreviewStep
- `package.json` — added `smoke:parsers` script

## Change Log

- 2026-06-26: Story 1.2 implemented. Commit `2c12ee2` pushed to origin/main.
