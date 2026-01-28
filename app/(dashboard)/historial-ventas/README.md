# Sales History Module

## Purpose

Provides admin-level sales history viewing with advanced filtering, pagination, and statistics. Displays ticket-based sales with full transaction details.

## File Structure

```
historial-ventas/
├── page.tsx                     # Server Component - data fetching
├── historial-ventas-manager.tsx # Client Component - state & orchestration
├── historial-stats.tsx          # Client Component - stats cards
├── historial-filtros.tsx        # Client Component - filter UI
├── historial-lista.tsx          # Client Component - sales list & pagination
└── README.md
```

## Data Flow

1. **page.tsx** (Server): Fetches cashiers, products, members from DB
2. **historial-ventas-manager.tsx** (Client): Manages filters, API calls to `/api/sales/history`
3. Child components receive data via props and emit events upward

## Server vs Client Responsibilities

### Server (page.tsx)

- Permission check (`requireAdmin()`)
- Static data fetching (cashiers, products, members)
- No state management

### Client (manager + children)

- Filter state
- API calls to `/api/sales/history` with query params
- Pagination
- UI interactions

## Architecture Decisions

### Why Client-Side Filtering?

Sales history requires dynamic, user-driven filtering with multiple parameters. Server Component re-fetching on every filter change would be slower than client-side API calls.

### Component Separation

- **Stats**: Isolated calculation logic, reusable
- **Filtros**: Complex form state, responsive collapse
- **Lista**: Pure presentation, receives formatted data

### Responsive Pattern

- **Mobile-first**: Stacked layouts, condensed info
- **Breakpoints**:
  - `sm:` (640px): 2-column grids, inline filters
  - `lg:` (1024px): 3-4 column grids, expanded layout
- **Cards over tables**: Better readability on small screens

## Key Features

- **Pagination**: Server-side (10 items/page)
- **Quick filters**: Today/Week/Month shortcuts
- **Advanced filters**: 9+ filter options (collapsible)
- **Real-time stats**: Calculated from current result set
- **Cancelled sales**: Visual distinction (red bg/border)

## API Integration

**Endpoint**: `GET /api/sales/history`

**Query Params**:

- search, startDate, endDate
- cashier, product, member, paymentMethod
- productType (todos | membresias | productos)
- orderBy (date | total | ticket)
- order (asc | desc)
- onlyActive (boolean)
- page, perPage

**Response**: `{ tickets[], total, page, perPage, totalPages }`

## Responsive Behavior

- **Desktop**: Multi-column filters, side-by-side pagination
- **Tablet**: 2-column grids, inline actions
- **Mobile**: Stacked layout, condensed tickets, icon-only buttons

## Future Improvements

- Export to Excel/PDF
- Ticket detail modal
- Date range presets
- Saved filter profiles
