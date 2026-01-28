# Módulo de Cortes (Shifts)

## Propósito

Gestión de turnos de caja (apertura, cierre, consulta histórica). Permite a los cajeros abrir un turno con fondo inicial, registrar ventas durante el turno, y cerrar con arqueo de caja.

## Estructura

```
cortes/
├── page.tsx                    # Server Component - data fetching inicial
├── cortes-manager.tsx          # Client Island - orquestación del módulo
├── cortes-filtros.tsx          # Client - filtros de búsqueda
├── cortes-lista.tsx            # Presentational - tabla de cortes
├── abrir-corte-modal.tsx       # Client - modal apertura de turno
├── cerrar-corte-modal.tsx      # Client - modal cierre con arqueo
├── detalle-corte-modal.tsx     # Client - vista detallada de un corte
└── README.md                   # Este archivo
```

## Flujo de Datos

### Server (page.tsx)

- Verifica autenticación (requireAuth)
- Carga datos iniciales necesarios
- Pasa datos a componentes cliente

### Client (cortes-manager.tsx)

- Recibe datos iniciales del servidor
- Maneja estado local (filtros, paginación, modales)
- Coordina comunicación con API
- Orquesta componentes hijos

### Presentational (cortes-lista.tsx)

- Muestra tabla de cortes
- Delega acciones al manager
- No maneja estado propio

## Server vs Client Responsibilities

### Server Components

- `page.tsx`: Auth, data fetching inicial, composición

### Client Components

- `cortes-manager.tsx`: Estado, coordinación, API calls
- `cortes-filtros.tsx`: Formulario de filtros
- `*-modal.tsx`: Interactividad de modales
- `cortes-lista.tsx`: Presentacional pero necesita eventos

## Endpoints API Utilizados

```
GET  /api/shifts              # Lista de cortes con filtros
GET  /api/shifts/active       # Corte activo del usuario
POST /api/shifts              # Abrir nuevo corte
POST /api/shifts/close        # Cerrar corte actual
GET  /api/shifts/[id]         # Detalle de un corte específico
GET  /api/shifts/[id]/summary # Resumen completo del corte
```

## Decisiones Importantes

### Patrón Arquitectónico

Siguiendo el patrón establecido en otros módulos:

- Server Component para auth y data inicial
- Client Island para interactividad
- Componentes presentacionales separados
- Modales como componentes independientes

### Responsive Design

- Grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Tablas: scroll horizontal en mobile
- Modales: full-screen en mobile, centrado en desktop
- Botones: stack vertical en mobile, horizontal en desktop

### Manejo de Estado

- Estado de filtros en el manager
- Estado de modales controlado (open/close explícito)
- Recarga de datos después de acciones críticas

### Nomenclatura

- **Frontend/UX**: Español (componentes, props UI, textos)
- **Backend/Dominio**: Inglés (Shift, openedAt, totalAmount)
- Separación clara entre capa visual y lógica de negocio

## Flujo de Usuario

### Apertura de Corte

1. Usuario hace clic en "Abrir Corte"
2. Modal solicita fondo inicial en efectivo
3. Sistema crea registro de Shift en DB
4. Estado actualizado, corte ahora "activo"

### Cierre de Corte

1. Usuario hace clic en "Cerrar Corte"
2. Sistema calcula totales esperados
3. Modal muestra arqueo (efectivo, tarjetas, retiros)
4. Usuario confirma o ajusta montos
5. Sistema cierra Shift y calcula diferencia

### Consulta Histórica

1. Filtros por fecha, cajero, folio
2. Paginación (10 items por página)
3. Vista detallada al hacer clic en un corte

## Consideraciones Técnicas

- Los cortes activos impiden abrir nuevos turnos
- Solo administradores pueden cerrar cortes ajenos
- Diferencias en arqueo se marcan visualmente
- Validación de montos positivos en formularios
- Serialización de Decimal para compatibilidad cliente
