# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Fundo (artifacts/fundo)

Personal expense tracking web app. Frontend-only, all data in localStorage.

- **Route**: `/` (root)
- **Tech**: React + Vite + Tailwind CSS + shadcn/ui
- **Font**: Outfit (Google Fonts)
- **Theme**: Warm earthy tones — terracotta orange primary, off-white background, dark neutral dark mode
- **Currency**: Philippine Pesos (₱)
- **Persistence**: localStorage key `fundo_envelopes`

#### Data Model
- **Envelope**: top-level budget container (name, totalBudget, eventDate)
- **Subcategory**: inside envelope (name, allocatedBudget?)
- **ExpenseItem**: inside subcategory (name, quantity, estimatedUnitPrice, actualUnitPrice?, status, notes?)
- **ItemStatus**: Unordered | Ordered | Received | Paid

#### Key Files
- `src/context/FundoContext.tsx` — global state + localStorage persistence
- `src/lib/format.ts` — ₱ formatting, budget status helpers
- `src/pages/Dashboard.tsx` — envelope grid
- `src/pages/EnvelopeDetail.tsx` — envelope drill-down with subcategories
- `src/components/EnvelopeCard.tsx` — dashboard card
- `src/components/SubcategorySection.tsx` — collapsible subcategory with items
- `src/components/ExpenseItemRow.tsx` — item row with status cycling
- `src/components/StatusBadge.tsx` — color-coded status badges
- `src/components/BudgetProgressBar.tsx` — progress bar with warning colors
- `src/components/dialogs/` — Create/edit dialogs for all entities
