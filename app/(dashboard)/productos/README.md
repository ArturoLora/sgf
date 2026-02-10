# Módulo de Productos - Arquitectura Limpia

## 📋 Descripción

Módulo refactorizado siguiendo el patrón de arquitectura limpia establecido en ventas, cortes, historial-ventas e inventario.

## 🏗️ Estructura

```
app/(dashboard)/productos/
├── _components/              # UI Components
│   ├── productos-manager.tsx       # Orchestration
│   ├── productos-stats.tsx         # Stats display
│   ├── productos-tabla.tsx         # Table presentation
│   ├── productos-filtros.tsx       # Filter controls
│   ├── productos-skeleton.tsx      # Loading state
│   ├── crear-producto-modal.tsx    # Create modal
│   ├── editar-producto-modal.tsx   # Edit modal
│   ├── detalle-producto-modal.tsx  # Detail modal
│   ├── entrada-modal.tsx           # Entry modal
│   ├── traspaso-modal.tsx          # Transfer modal
│   └── ajuste-modal.tsx            # Adjustment modal
├── page.tsx                  # Server component
└── loading.tsx               # Loading wrapper

lib/
├── api/
│   └── products.client.ts    # API client (pure fetch)
└── domain/
    └── products/
        ├── index.ts          # Public exports
        ├── calculations.ts   # Stock calculations
        ├── filters.ts        # Filter logic
        ├── validators.ts     # Validation rules
        ├── formatters.ts     # Display formatting
        ├── pagination.ts     # Pagination logic
        └── statistics.ts     # Stats calculations

types/api/
└── products.ts               # Source of truth (backend)
```

## 🎯 Capas de Arquitectura

### 1. Types Layer (`types/api/products.ts`)

- **Propósito**: Fuente de verdad del backend
- **Contiene**: Schemas Zod, tipos TypeScript
- **Regla**: Solo lo que existe en el backend

### 2. API Client Layer (`lib/api/products.client.ts`)

- **Propósito**: Comunicación con API
- **Características**:
  - 1 función = 1 endpoint
  - Solo fetch calls
  - Sin loops ni lógica
  - Manejo de errores básico

### 3. Domain Layer (`lib/domain/products/`)

- **Propósito**: Lógica de negocio pura
- **Características**:
  - Funciones puras
  - Sin React
  - Sin fetch
  - 100% testeable

#### Módulos Domain:

**calculations.ts**

- Cálculos de stock
- Validaciones de cantidades
- Análisis de déficit
- Distribución de inventario

**filters.ts**

- Filtrado por búsqueda
- Filtrado por estado
- Ordenamiento
- Aplicación combinada

**validators.ts**

- Validación de productos
- Validación de stock
- Validación de traspasos
- Validación de ajustes

**formatters.ts**

- Formato de precios
- Formato de estados
- Mensajes de éxito/error
- Labels de ubicación

**pagination.ts**

- Lógica de paginación
- Cálculo de rangos
- Navegación de páginas

**statistics.ts**

- Estadísticas generales
- Análisis de stock
- Análisis de valor
- Top productos

### 4. Container Layer (Manager)

- **Propósito**: Orquestación
- **Características**:
  - Coordina flujo
  - Usa domain + API
  - No calcula
  - No formatea

### 5. Presentation Layer (UI Components)

- **Propósito**: Solo presentación
- **Características**:
  - Recibe datos procesados
  - No lógica de negocio
  - Props tipados

## 🔄 Flujo de Datos

```
Server (page.tsx)
    ↓
ProductsService.getAllProducts()
    ↓
calculateProductStatistics() [domain]
    ↓
ProductosManager (client orchestration)
    ↓
applyFilters() [domain]
    ↓
paginateProducts() [domain]
    ↓
ProductosTabla (presentation)
```

## 📝 Convenciones

### Naming

- **Domain**: verbo + sustantivo (`calculateStockStatus`)
- **API**: verbo + recurso (`fetchProducts`)
- **Components**: sustantivo (`ProductosTabla`)
- **Formatters**: `format` + tipo (`formatPrice`)
- **Validators**: `validate` + tipo (`validateStockQuantity`)

### Types

- ❌ `any`, `as`, `!`
- ✅ Props tipados
- ✅ Return types explícitos
- ✅ Usar tipos del backend

### Architecture

- ❌ Lógica en UI
- ❌ Cálculos en API client
- ❌ React en domain
- ✅ Separación clara
- ✅ Single responsibility

## 🧪 Testing

```typescript
// Domain - fácil de testear
describe("calculateStockStatus", () => {
  it("should detect low stock", () => {
    const result = calculateStockStatus(3, 5);
    expect(result.isLow).toBe(true);
  });
});

// Validators - fácil de testear
describe("validateStockQuantity", () => {
  it("should reject negative quantities", () => {
    const result = validateStockQuantity(-1, 10);
    expect(result.valid).toBe(false);
  });
});
```

## 🚀 Uso

### Crear producto

```typescript
import { createProduct } from "@/lib/api/products.client";
import { validateProductData } from "@/lib/domain/products";

// Validar
const validation = validateProductData(data);
if (!validation.valid) {
  // Mostrar errores
  return;
}

// Crear
const product = await createProduct(data);
```

### Filtrar productos

```typescript
import { applyFilters } from "@/lib/domain/products";

const filtered = applyFilters(products, {
  search: "proteína",
  status: "activos",
  orderBy: "name",
  order: "asc",
});
```

### Calcular estadísticas

```typescript
import { calculateProductStatistics } from "@/lib/domain/products";

const stats = calculateProductStatistics(products);
// { total, active, lowStock, inventoryValue, ... }
```

## ⚠️ Prohibido

1. **No duplicar schemas** - Usar los del backend
2. **No lógica en UI** - Mover a domain
3. **No fetch en domain** - Usar API client
4. **No cálculos en manager** - Usar domain
5. **No any/as/!** - Tipar correctamente

## ✅ Checklist Cumplido

- [x] API client limpio (solo fetch)
- [x] Domain layer completo
  - [x] Calculations
  - [x] Filters
  - [x] Validators
  - [x] Formatters
  - [x] Pagination
  - [x] Statistics
- [x] Manager orquesta (no calcula)
- [x] UI solo presenta
- [x] Page.tsx usa domain
- [x] Types del backend
- [x] Sin any/as/!
- [x] README completo

## 🔗 Referencias

Ver módulos similares para consistencia:

- `app/(dashboard)/ventas`
- `app/(dashboard)/cortes`
- `app/(dashboard)/historial-ventas`
- `lib/domain/inventory`
