````text
### 09-03-2026

### 1. Rename PMOS Pipeline Board

- Change the application name from **“PMOS Pipeline Board”** to **“AB Investment Groups.”**

### 2. Implement Staff Types, Team Leads, and Role-Based Ticket Access

We need to redesign the current user access system so that employees do not automatically see every ticket in the system.

Access should be controlled through **Staff Type/Role and permissions**. The categories shown on the board, such as Finance, Property Management, Maintenance, Leasing, General Operations, etc., should remain **ticket categories/departments**, not user roles.

The structure should be:

**User → Staff Type → Permissions → Allowed Ticket Categories → Tickets**

The Administrator controls the entire structure.

### A. Administrator

The Administrator has full system access and complete control over users, Staff Types, permissions, teams, and tickets.

The Administrator must be able to:

- Create, edit, and delete Staff Types.
- Create and manage users.
- Assign users to a Staff Type.
- Create and manage teams.
- Assign Team Leads to teams.
- Assign staff members to Team Leads.
- Create, edit, assign, reassign, and delete tickets.
- See all tickets across the entire system.
- Determine which ticket categories/departments each Staff Type can access.
- Determine what actions each Staff Type is allowed to perform.
- Change permissions at any time without requiring a developer to modify the code.

### Staff Type Configuration

The Administrator should be able to create a Staff Type, for example:

- Property Management Staff
- Finance Staff
- Maintenance Staff
- Leasing Staff
- General Operations Staff

These are **not hard-coded roles**.

The Administrator should be able to create any Staff Type in the future and decide what that Staff Type has access to.

For each Staff Type, the Administrator should be able to select:

**Ticket Categories/Departments they can access:**
- Finance
- Property Management
- Maintenance
- Leasing
- General Operations
- Any additional categories created in the future

The Administrator should also be able to determine what actions that Staff Type can perform, such as:

- View tickets
- Create tickets
- Edit tickets
- Assign tickets
- Reassign tickets
- Change ticket status
- Move tickets between board columns
- Add comments/updates
- Close/complete tickets

### Example

If the Administrator creates:

**Staff Type: Property Management Staff**

and gives it access to:

- Property Management
- Leasing

then any employee assigned to **Property Management Staff** should automatically have access to tickets within those categories.

If the Administrator later changes the Staff Type to also include **Maintenance**, everyone assigned to that Staff Type should gain access to Maintenance tickets without requiring code changes.

### B. Team Lead

There should be a separate **Team Lead** user level.

A Team Lead should have more visibility than regular Staff but less control than an Administrator.

A Team Lead should:

- Be assigned to a specific team.
- Be able to see the tickets belonging to all staff members on their team.
- Be able to monitor the status and progress of their team's tickets.
- Be able to view their team's workload.
- Be able to manage their team's tickets according to the permissions granted by the Administrator.
- Be able to view tickets assigned to their staff even when those tickets fall under different ticket categories that their staff are authorized to handle.

A Team Lead should NOT:

- Have full system-wide administrative access.
- Create or delete Staff Types.
- Change system-wide permissions.
- Manage Administrator settings.
- Automatically control tickets belonging to teams/staff outside their assigned team.
- Have the same level of control as an Administrator.

### Team Structure Example

**Team Lead: Kelvin Thompson**

Team Members:
- Staff Member A
- Staff Member B
- Staff Member C

When Kelvin logs in, he should be able to see the tickets belonging to **Staff A, Staff B, and Staff C** and monitor their work.

However, Kelvin should not automatically see or control every ticket belonging to other teams unless the Administrator gives him that access.

### C. Staff

Regular Staff access is determined by the **Staff Type assigned to that employee**.

Staff should:

- Only see ticket categories/departments their Staff Type has permission to access.
- Only see tickets they are authorized to access.
- Be able to perform only the actions allowed by their Staff Type permissions.
- Not automatically have access to every ticket on the board.

### Important Distinction

Do NOT build the system like this:

```text
Finance Role
Maintenance Role
Property Management Role
Leasing Role
````

Instead, build it like this:

```text
USER
  ↓
STAFF TYPE
  ↓
PERMISSIONS
  ↓
ALLOWED TICKET CATEGORIES
  ↓
TICKETS
```

For example:

```text
Kelvin Thompson
→ Staff Type: Finance Staff
→ Access: Finance + Accounting + Loan/Finance
→ Permissions: View + Edit + Update Status
```

Another employee could be:

```text
Monique Trice
→ Staff Type: Property Management Staff
→ Access: Property Management + Leasing
→ Permissions: View + Edit + Update Status
```

Another could be:

```text
Alain Ndoutoume
→ Staff Type: Maintenance Staff
→ Access: Maintenance
→ Permissions: View + Edit + Update Status
```

These Staff Types and permissions must be configurable by the Administrator.

### Ticket Assignment

Each ticket should have, at minimum:

* Ticket Title
* Ticket Category/Department
* Assigned Staff Member
* Assigned Team
* Team Lead
* Status
* Priority
* Due Date/SLA
* Existing ticket fields

The system should use these fields and the user's permissions to determine what the user can see and what actions they can perform.

### Login / Dashboard Behavior

When an **Administrator** logs in:

> Show ALL tickets.

When a **Team Lead** logs in:

> Show tickets belonging to the staff/team they manage, based on the permissions established by the Administrator.

When **Staff** logs in:

> Show only the tickets and categories their Staff Type gives them access to, along with tickets specifically assigned to them.

### Permission Hierarchy

The overall hierarchy should be:

**ADMINISTRATOR**
→ Full system access and complete control

**TEAM LEAD**
→ Visibility and management of their team's tickets, but limited administrative control

**STAFF**
→ Access determined by their assigned Staff Type and permissions

### Developer Objective

The goal is to build a **flexible, configurable Staff Type and Permission Management system**.

Do NOT hard-code departments, Staff Types, or permissions into the application.

The Administrator must be able to create a new Staff Type, select the ticket categories that Staff Type can access, define what actions they can perform, assign employees to that Staff Type, and modify those permissions later — all from within the application.

The existing board layout should remain largely the same. The major change is the **access-control logic behind the board**, so each user sees and interacts with only the tickets they are authorized to access.

```
```