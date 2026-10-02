# Property Management Info & Staff Communication — What Was Built

This covers every change requested in `docs/Changes.prd`: what was built, where to find it, and what's left.

**Commits:** `2256c6e` (main feature, building on the first version `d06fbc4`…`b9819b7`) · `41295f0` (vCard import)

---

## Summary

Every requirement in the PRD is implemented, with one partial item: supporting documents are attached as **links** rather than uploaded files (see [Limitations](#limitations)).

The work falls into three areas, matching the PRD's goals:

1. **Contacts & Properties:** a searchable contact database linked to properties
2. **Knowledge Dashboard:** policies and procedures the admin publishes for staff
3. **Announcements:** targeted, scheduled messages with read and acknowledgment tracking

It also fixes a bug that left the admin **Contacts, Policies and Announcements** tabs stuck on "Loading…".

---

## 1. Contacts & Properties

**Where:** Admin settings → **Contacts** and **Properties** tabs · Staff: **Directory** in the top bar

### What the admin can do
- Create, edit, archive and restore contacts
- Store name/company, type, phone, email, mailing address, city, state, ZIP and notes; date added and last updated are recorded automatically
- Link a contact to **any number of properties**
- Create contact types (Contractor, Tenant, Utility company…), then rename or delete them. A type can't be deleted while contacts still use it.
- Create properties with an address, and **assign staff** to them
- Search and filter by city, state, ZIP, contact type and property

### What staff see
- A read-only directory with the same filters, including ZIP and property
- A Properties column, and a detail panel for each contact
- Archived contacts are hidden
- Their own assigned properties, shown on the dashboard

### Worth knowing
- Filtering runs on the server, so it keeps working as the database grows.
- Filter dropdowns fill themselves from the data: a new city appears as soon as a contact uses it. Nothing is hard-coded.
- City and state ignore case; ZIP matches by prefix (`537` finds `53703`).

### Importing contacts from a vCard (.vcf) file
**Where:** Admin settings → Contacts → **3. Import from vCard (.vcf)**

1. Choose a **default contact type**, then pick a `.vcf` file exported from a phone, Google Contacts or Outlook.
2. Review the **preview** before anything is saved:
   - new contacts are ticked
   - duplicates are unticked, with the reason shown
   - rows with problems (e.g. no name) can't be selected
   - the type can be changed on any row
3. Optionally link everything to properties, then click **Import**.

- **Duplicates** are matched by email (ignoring capitalisation) or phone number (ignoring formatting), against existing contacts (including archived ones) and earlier rows in the same file. They're skipped unless you tick them.
- If a vCard's category matches an existing contact type (e.g. "Tenant"), that type is used instead of the default.
- Company name, extra phone numbers and extra emails are kept in the notes.
- Up to 5,000 contacts per import, saved all at once.

---

## 2. Knowledge Dashboard

**Where:** Admin settings → **Policies** tab · Staff: **Knowledge Base** in the top bar

### What the admin can do
- Create **sections** (e.g. Company Policies, Processing Procedures, Emergency Procedures, Resources): name, describe, reorder and delete them
- Limit a section to **certain staff types**. When none are ticked, everyone sees it.
- Create policies and procedures with a title, short description, content and document links
- Publish, unpublish, edit, archive and restore them
- Reorder policies within a section with ▲/▼
- See who last updated each item, and when

### What staff see
- An **Overview** page with:
  - important messages
  - recent announcements
  - their assigned properties
  - all sections with their descriptions
- A sidebar with every published document, grouped and ordered the way the admin arranged them
- Each document with its description and links to supporting documents
- Only sections their staff type is allowed to see. This is enforced on the server, including when a document is opened directly.

Processing documentation ("how to process a move-in", etc.) is simply a section, so the admin manages all content in one place.

---

## 3. Announcements

**Where:** Admin settings → **Announcements** tab · Staff: bell icon, urgent popup, and the dashboard

### What the admin can do
- Send to **all staff**, or to one or more **people**, **teams** or **staff types**
- Set priority: **Normal**, **Important** or **Urgent**
- Require acknowledgment
- **Schedule** an announcement for later. It publishes automatically at that time.
- Set an **expiry date**, with or without scheduling
- **Edit** or **cancel** a scheduled announcement
- Edit the wording of a sent announcement, or **withdraw** it
- Check **delivery status**: each announcement shows counts, and *View status* lists every recipient with the times it was sent, delivered, viewed and acknowledged

### What staff see
- An unread count on the bell
- A **full-screen popup** for urgent messages
- Colour-coded cards on the dashboard
- Sender, audience, date/time and priority on every message
- An Acknowledge button where required; the date they acknowledged is shown afterwards

### Worth knowing
- Status never goes backwards: opening a message again doesn't undo an acknowledgment.
- **Email is ready but off.** Set `ANNOUNCEMENT_EMAIL_ENABLED=true` to also email recipients. The system is built so other channels (SMS, push) can be added without reworking announcements.

---

## Bug fixes

- **Admin Contacts, Policies and Announcements tabs only showed "Loading…".** A missing `if` in commit `b9819b7`.
- **The client called three endpoints that didn't exist.** Properties list, announcement edit and announcement receipts.
- **Scheduled announcements notified people immediately** instead of at the scheduled time.
- **No database migrations existed** for the contact, policy and announcement tables.
- **Contact creation passed raw request data to the database.** Input is now validated.
- **Viewing a message after acknowledging it overwrote the acknowledgment.**
- **The bell cut messages off at 100 characters.** Full text is now on the dashboard.
- **The Contact Directory scrolled sideways on phones.**
- **The bell button had no label for screen readers.**
- **New route files each opened their own database connection pool.** They now share one.

---

## Deploying

### 1. Update the database

Your live database seems to be managed with `prisma db push` (some existing tables have no migrations). Use whichever matches your setup:

**Using `db push` (most likely):**
```bash
npx prisma db push
```

**Using migrations:**
```bash
npx prisma migrate resolve --applied 20260929150000_pm_info_system
npx prisma migrate deploy
```

Either way, existing announcements are treated as already sent, so they won't go out again.

### 2. Optional: turn on announcement emails

```bash
ANNOUNCEMENT_EMAIL_ENABLED=true
```

---

## Limitations

- **Documents are links, not uploads.** Uploading needs a storage service (e.g. Cloudinary or S3). Once one is chosen, an upload button can fill the same field.
- **The bell refreshes every 60 seconds.** The server already sends real-time events; the client would need `socket.io-client` to receive them instantly.
- **Staff-type changes apply at next login.** Visibility is based on the login token.

### Issues that were already in the repo
- Migration `20260908160000_add_pipeline_category_field` fails on a brand-new database: it adds a column that `init` already creates.
- Departments and the StaffType changes were never written as migrations.
- `client/index.html` has no favicon, which causes a harmless 404 in the console.
- Six `docs/*.md` files show as modified, but only their line endings changed. They were left out of the commit.
- `ts-jest` is missing from `server/node_modules`, so the Jest suite can't run on this machine.

---

## How it was tested

- **Type checks and build** pass for server and client.
- **Migrations** were run on a fresh database, including an old announcement created before the upgrade. It wasn't sent again.
- **An API test** of 47 checks passed. It covered every contact filter, property links, staff-type visibility, the full announcement lifecycle, and the scheduler.
- **A browser walkthrough** on desktop and phone filled in every admin form, then checked the staff views:
  - as a Property Manager, who sees the PM-only content
  - as Maintenance staff, who doesn't

  There were no errors.

---

## Try it yourself

Admin:
- [ ] **Properties:** create a property with an address and assigned staff
- [ ] **Contacts:** add a type; create a contact linked to two properties; edit it; try each filter; archive and restore it
- [ ] **Policies:** create a section limited to one staff type; add a policy with a description and link; publish it and reorder it
- [ ] **Announcements:** send an urgent message to a team with acknowledgment required; schedule another and then cancel it

As a staff member in that team:
- [ ] See the urgent popup and acknowledge it
- [ ] Check the dashboard, the Announcements page and the bell

Then:
- [ ] As staff of a different type, confirm the restricted section and the team message are hidden
- [ ] As admin, open **View status** and confirm the acknowledgment time shows

---

## Appendix A — PRD coverage

| PRD section | Covered in |
|---|---|
| §1 Contact Database / Directory | [Contacts & Properties](#1-contacts--properties) |
| §2 Staff Dashboard | [Knowledge Dashboard](#2-knowledge-dashboard) |
| §3 Company Policies | [Knowledge Dashboard](#2-knowledge-dashboard) (document *links*, see Limitations) |
| §4 Processing Documentation | [Knowledge Dashboard](#2-knowledge-dashboard) |
| §5 Dashboard Organization | [Knowledge Dashboard](#2-knowledge-dashboard) |
| §6 Newsletter / Announcements | [Announcements](#3-announcements) |
| §7 Targeted Messages | [Announcements](#3-announcements) |
| §8 Priority | [Announcements](#3-announcements) |
| §9 Status / Acknowledgment | [Announcements](#3-announcements) |
| §10 Scheduling & Expiry | [Announcements](#3-announcements) |
| §11 Notifications | [Announcements](#3-announcements) |
| §12 Admin Management | All three areas |
| §13 Nothing Hard-Coded | Types, sections, audiences and teams are all managed in the app |
| §14 Data Relationships | [Appendix B](#appendix-b--database-changes) |
| §15 Overall Objective | All three areas |

## Appendix B — Database changes

**New tables:** `PropertyStaff` (staff ↔ property). The first-version tables (contacts, policies, announcements) now have a migration too.

**New fields:**
- **Property:** address, zip, status, timestamps
- **Policy category:** description, visible staff types
- **Policy:** description, updated by
- **Announcement:** multiple targets, status (scheduled / sent / cancelled), sent time, updated by
- **Announcement receipt:** sent and delivered times

**Migrations:** `20260929150000_pm_info_system` and `20260930120000_pm_info_system_enhancements`

## Appendix C — Files changed

**Server** (`server/`)
- New:
  - `src/services/announcement.service.ts`
  - `src/services/contact.service.ts`
  - `src/api/admin/properties.ts`
  - `src/api/client/properties.ts`
  - both migrations
- Updated:
  - `prisma/schema.prisma`
  - `src/server.ts`
  - admin and client routes for announcements, contacts, policies and dashboard

**Client** (`client/src/`)
- New:
  - `components/AdminProperties.tsx`
  - `components/ContactImport.tsx`, `utils/vcard.ts`
- Updated:
  - `AdminContacts`, `AdminPolicies`, `AdminAnnouncements`, `AnnouncementsBell`
  - `AdminSettings`, `ContactsDirectory`, `KnowledgeDashboard`
  - `pmosApi`, `useApi`, `pmos` types, `utils/ui`, `index.css`

## Appendix D — API endpoints

All under `/api/v1`. `admin/*` needs the admin role; `client/*` needs any logged-in user.

**Contacts**
- `GET|POST admin/contacts` · `GET|PUT admin/contacts/:id` (filters: `search`, `type_id`, `city`, `state`, `zip`, `property_id`, `status`)
- `GET admin/contacts/filters`
- `POST admin/contacts/import` (`{ contacts, property_ids?, dry_run? }`)
- `GET|POST admin/contacts/types` · `PUT|DELETE admin/contacts/types/:id`
- `GET client/contacts` · `GET client/contacts/filters` · `GET client/contacts/:id`

**Properties**
- `GET|POST admin/properties` · `PUT admin/properties/:id`
- `GET client/properties?mine=true`

**Policies & dashboard**
- `GET|POST admin/policies` · `PUT|DELETE admin/policies/:id` · `PUT admin/policies/reorder`
- `GET|POST admin/policies/categories` · `PUT|DELETE admin/policies/categories/:id` · `PUT admin/policies/categories/reorder`
- `GET client/dashboard/policies` · `GET client/dashboard/policies/:id`

**Announcements**
- `GET|POST admin/announcements` · `PUT admin/announcements/:id`
- `POST admin/announcements/:id/cancel` · `GET admin/announcements/:id/receipts`
- `GET client/announcements` · `POST client/announcements/:id/view` · `POST client/announcements/:id/acknowledge`
