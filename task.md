# PMOS Implementation Tasks

- `[x]` Update Prisma schema with `User`, `Pipeline`, `Ticket`, and `Note` models.
- `[/]` Run Prisma generation and migration.
- `[x]` Create shared PMOS types in frontend (`pmos.ts`).
- `[x]` Implement backend authentication middleware (`authMiddleware.ts`).
- `[x]` Implement backend API controller (`pmosController.ts`).
- `[x]` Implement backend PMOS router (`api/pmos.ts`) and mount it in `index.ts`.
- `[x]` Implement frontend API client (`pmosApi.ts`).
- `[x]` Implement remaining Admin API Handlers (Users: create, update, delete. Pipelines: get, create, update, delete, get single).
- `[x]` Implement remaining Client API Handlers (Tickets: create, update, delete, checklist, get single. Notes: create, delete. Activity: get).
- `[x]` Implement CRUD Database Services for remaining operations.
- `[x]` Implement Frontend Pages (`Login.tsx`, `Board.tsx`, `AdminSettings.tsx`, `History.tsx`).
- `[x]` Implement Frontend Components (`Navbar.tsx`, `TicketDrawer.tsx`, `ActivityModal.tsx`).
- `[x]` Write Backend Unit Tests.
- `[ ]` Write Frontend Unit Tests.
- `[/]` Setup and write E2E Tests.
