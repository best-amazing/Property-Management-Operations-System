Use this clarification for the developer:

```text
The Categories/Departments and Pipelines should be treated as two separate concepts.

The existing Pipelines are workflows that determine how a ticket moves through stages.

The Departments/Categories determine which group of staff should have access to the ticket.

At the moment, we have three main Departments/Categories:

1. General Operations
2. Acquisition Department
   - This department covers property acquisitions and cold calling.
3. Property Management

The Administrator should also have the ability to create additional Departments/Categories in the future.

For example, if we later create a new department, the Admin should be able to add it from the Admin panel without requiring a code change.

### Department / Category Structure

Each Department/Category can have one or more Pipelines associated with it.

For example:

**Acquisition Department**
- Acquisition Pipeline
- Cold Calling Pipeline
- Lead Follow-Up Pipeline

**Property Management**
- Leasing & Placement
- Maintenance & Vendors
- Unit Turns
- Escalation & Legal

**General Operations**
- General Tasks
- Administrative Requests
- Other internal workflows

These are just examples. The key requirement is that the Admin should be able to configure which pipelines belong to each Department/Category.

### Important Relationship

The structure should be:

Department / Category
→ Contains one or more Pipelines
→ Each Pipeline contains its own Stages
→ Tickets move through the Stages of their assigned Pipeline

So:

**Department/Category = access grouping**

**Pipeline = workflow**

**Stage = current position inside that workflow**

### Example

A ticket could be:

Department:
Property Management

Pipeline:
Maintenance & Vendors

Stage:
Triaged

Another ticket could be:

Department:
Property Management

Pipeline:
Unit Turns

Stage:
Walkthrough

Both tickets belong to the same Department, but they follow different Pipelines.

### Staff Access

Staff access should be controlled primarily by Department/Category.

For example:

**Cold Caller Staff**
→ Department Access: Acquisition Department
→ Can access the pipelines under the Acquisition Department that the Admin allows for that Staff Type.

**Property Management Staff**
→ Department Access: Property Management
→ Can access the Property Management pipelines allowed for that Staff Type.

A Staff Type does not necessarily need access to every pipeline inside a Department.

The Administrator should be able to control this.

For example:

Cold Caller Staff
→ Department: Acquisition Department
→ Allowed Pipelines:
   - Cold Calling
   - Lead Follow-Up

Acquisition Manager
→ Department: Acquisition Department
→ Allowed Pipelines:
   - Cold Calling
   - Lead Follow-Up
   - Acquisition Pipeline

### Admin Configuration

The Administrator should be able to:

- Create a Department/Category.
- Edit or delete a Department/Category.
- Create Pipelines under a Department/Category.
- Move or assign a Pipeline to a Department/Category.
- Create and edit Stages inside each Pipeline.
- Create Staff Types.
- Assign Staff Types to one or more Departments.
- Select which Pipelines within those Departments each Staff Type can access.
- Set the permissions for that Staff Type.
- Assign individual users to a Staff Type.

Nothing should be hard-coded.

The Admin should be able to create a completely new Department, create Pipelines under it, create a Staff Type for it, and assign users to it without requiring developer changes.

### Final RBAC Structure

The preferred structure is:

USER
→ STAFF TYPE
→ ALLOWED DEPARTMENT(S)
→ ALLOWED PIPELINE(S)
→ PERMISSIONS
→ TICKETS

While the ticket itself should follow:

TICKET
→ DEPARTMENT/CATEGORY
→ PIPELINE
→ STAGE

### Team Lead

The Team Lead structure remains the same.

A Team Lead should be able to view the tickets of all staff members assigned to their team, including the pipelines those staff members have access to, but should not have the same system-wide control as an Administrator.

### Summary for Implementation

Please do not map one Department directly to one Pipeline.

A Department can contain multiple Pipelines.

RBAC should support both:

1. Department-level access
2. Pipeline-level access within that Department

The Administrator should be able to configure all of this through the application.

Current Departments:

- General Operations
- Acquisition Department — property acquisitions and cold calling
- Property Management

The Admin must be able to add more Departments and create/assign Pipelines under them in the future.
```