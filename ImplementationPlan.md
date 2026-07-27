# PMOS Implementation Plan

This plan outlines the steps to implement the PMOS (Property Management Operations System) backend API, frontend API client, and shared types as defined in the `PMOS.md` requirements document.

## User Review Required

> [!IMPORTANT]
> The database schema changes will require running a Prisma migration which may require resetting your database if there are existing tables that conflict or are no longer needed. Please confirm if you have any existing data you want to preserve or if it's safe to run a standard migration.

## Open Questions

> [!WARNING]
> 1. In `PMOS.md`, it mentions "Frontend: Existing HTML/JS static" but the client folder contains a Vite/React setup (`App.tsx`, `main.tsx`). Do you want the frontend API implementation to be in TypeScript for the React client or plain JS? I will proceed with TypeScript for the React client based on the current folder structure.
> 2. Do you want to use `axios` or standard `fetch` for the frontend API client? I will plan to use `fetch` to minimise dependencies unless specified otherwise.
> 3. Should we seed the default 4 pipelines and a default admin user via a Prisma seed script?

## Proposed Changes

### Database Schema (Prisma)

#### [MODIFY] [schema.prisma](file:///c:/Users/USER/Work/AB-group/Leads-Automation-Tool/real-estate-scraper/server/prisma/schema.prisma)
Add the following models:
- `User`: id, username, display_name, password_hash, role, created_at
- `Pipeline`: id, label, code, stages (Json), tag_field (Json), category_field (Json), default_checklist (Json), tickets relation, created_by, created_at
- `Ticket`: id, title, property, unit, tag, category, assigned_to, stage_index, checklist (Json), history (Json), notes relation, pipeline relation, created_at, stage_entered_at, completed_at
- `Note`: id, text, author, ticket relation, created_at

### Shared Types (Frontend/Backend)

#### [NEW] [pmos.ts](file:///c:/Users/USER/Work/AB-group/Leads-Automation-Tool/real-estate-scraper/client/src/types/pmos.ts)
Create TypeScript definitions for models and API DTOs (Data Transfer Objects) to ensure type safety between the frontend and backend.
- Enums for Roles (`admin`, `staff`).
- Interfaces for `Pipeline`, `Ticket`, `User`, `Note`.
- API request/response types (e.g., `LoginRequest`, `LoginResponse`, `CreateTicketRequest`).

### Backend Implementation (Refactored)

The backend will be refactored to match a domain-driven folder structure, separating admin features from client features, with individual handlers for each endpoint and abstracted CRUD database helpers.

#### [DELETE] [pmosController.ts](file:///c:/Users/USER/Work/AB-group/property_management_tool/server/src/api/pmosController.ts)
#### [DELETE] [pmos.ts](file:///c:/Users/USER/Work/AB-group/property_management_tool/server/src/api/pmos.ts)

#### CRUD Services (Database Helpers)
We will create service helpers in `server/src/services/` to abstract Prisma queries:
- `user.service.ts`: Helpers for fetching, finding by username, creating users.
- `pipeline.service.ts`: Helpers for pipeline CRUD operations.
- `ticket.service.ts`: Helpers for fetching, creating, and updating tickets.
- `note.service.ts`: Helpers for fetching and creating notes.

#### API Routes and Handlers Structure
The `api` folder will be split into `admin` and `client`, with individual route files and handlers covering the full PMOS API specification.

**Admin Domain** (`server/src/api/admin/`)
- Users API:
  - `users/handlers/get-users.ts` (GET `/`)
  - `users/handlers/create-user.ts` (POST `/`)
  - `users/handlers/update-user.ts` (PATCH `/:id`)
  - `users/handlers/delete-user.ts` (DELETE `/:id`)
- Pipelines API:
  - `pipelines/handlers/get-pipelines.ts` (GET `/`)
  - `pipelines/handlers/get-pipeline.ts` (GET `/:id`)
  - `pipelines/handlers/create-pipeline.ts` (POST `/`)
  - `pipelines/handlers/update-pipeline.ts` (PATCH `/:id`)
  - `pipelines/handlers/delete-pipeline.ts` (DELETE `/:id`)
- `index.ts` (router mounting admin routes)

**Client (Staff/Shared) Domain** (`server/src/api/client/`)
- Auth API:
  - `auth/handlers/login.ts` (POST `/login`)
- Tickets API:
  - `tickets/handlers/get-tickets.ts` (GET `/pipelines/:pipelineId/tickets`)
  - `tickets/handlers/get-ticket.ts` (GET `/:id`)
  - `tickets/handlers/create-ticket.ts` (POST `/`)
  - `tickets/handlers/update-ticket.ts` (PATCH `/:id`)
  - `tickets/handlers/update-checklist.ts` (PATCH `/:id/checklist`)
  - `tickets/handlers/delete-ticket.ts` (DELETE `/:id`)
- Notes API:
  - `notes/handlers/get-notes.ts` (GET `/tickets/:ticketId/notes`)
  - `notes/handlers/create-note.ts` (POST `/tickets/:ticketId/notes`)
  - `notes/handlers/delete-note.ts` (DELETE `/:id`)
- Activity API:
  - `activity/handlers/get-activity.ts` (GET `/activity`)
- `index.ts` (router mounting client routes)

#### [MODIFY] [app.ts](file:///c:/Users/USER/Work/AB-group/property_management_tool/server/src/app.ts)
Update `app.ts` to mount the new `/api/v1/admin` and `/api/v1/client` routers instead of the old PMOS router.

### Frontend Implementation

#### Frontend Pages and Components Structure (`client/src/`)
We need to set up the React client to match the PMOS views:
- `pages/Login.tsx`: Login page to acquire JWT.
- `pages/Board.tsx`: Main Kanban board view with columns, drag-and-drop tickets, and KPI bar.
- `pages/History.tsx`: Flat table of completed tickets.
- `pages/AdminSettings.tsx`: Admin interface with "Team" (users) and "Services" (pipelines) tabs.
- `components/TicketDrawer.tsx`: Slide-out panel for ticket details, checklist, and notes.
- `components/ActivityModal.tsx`: Modal for the 50 most recent notes.
- `components/Navbar.tsx`: Top bar for pipeline selection, active user, and navigation.

#### [NEW] [pmosApi.ts](file:///c:/Users/USER/Work/AB-group/property_management_tool/client/src/services/pmosApi.ts)
Create a service class/object using `fetch` to interact with the backend API. It must implement all the endpoints listed above.
- Request interceptor logic to automatically attach the `Bearer` token from `localStorage` to all requests except login.

## Verification Plan

### Automated Tests

#### Backend Unit Tests
- Add unit tests for the controllers and authentication middleware (e.g., `pmosController.test.ts`, `authMiddleware.test.ts`) using a testing framework like Jest and `supertest`.
- Test role-based access control (Admin vs. Staff) and JWT validation.

#### Frontend Unit Tests
- Add unit tests for the frontend API client (`pmosApi.test.ts`) using Vitest or Jest to ensure correct request formatting and response handling.

#### End-to-End (E2E) Tests
- Set up an E2E testing framework (e.g., Cypress or Playwright) to test the core PMOS workflows from the UI.
- Scenarios will include: Admin login, pipeline creation, ticket creation, moving a ticket through stages, and staff restricted access.

### Manual Verification
- We will verify the schema compiles with `npx prisma generate`.
- We will test the `POST /api/auth/login` and user creation endpoints (using a script or curl) to ensure JWT auth works.
- We will verify the frontend `pmosApi.ts` compiles and correctly imports the shared types.
