import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting PMOS seed...");

  // ── 1. Departments ─────────────────────────────────────────
  const departmentsData = [
    "General Operations",
    "Acquisition Department",
    "Property Management"
  ];
  
  const departmentMap: Record<string, string> = {};
  for (const d of departmentsData) {
    const created = await prisma.department.upsert({
      where: { name: d },
      update: {},
      create: { name: d },
    });
    departmentMap[d] = created.id;
    console.log(`  ✓ Department: ${d}`);
  }

  // ── 2. Pipelines ──────────────────────────────────────────
  const pipelinesData = [
    {
      id: "leasing",
      label: "Leasing & Placement", code: "A",
      stages: ["New Lead","Contacted","Showing","Applied","Screening","Approved","Lease Sent","Signed & Paid","Moved In"],
      tag_field: { label: "Lead Temp", options: [
        { name: "Hot",  swatch: "Amber", slaDays: 2 },
        { name: "Warm", swatch: "Pine",  slaDays: 4 },
        { name: "Cold", swatch: "Slate", slaDays: 7 },
      ]},
      default_checklist: ["ID collected","Pay stubs / bank statements","Rental history checked","Background check run"],
      department_id: departmentMap["Property Management"],
      created_by: "admin",
      ticket_fields: [
        { key: "property", label: "Property", type: "text", required: true },
        { key: "unit", label: "Unit", type: "text" },
        { key: "motivation", label: "Motivation", type: "select", options: ["Hot", "Warm", "Cold"] },
        { key: "monthly_rent", label: "Monthly rent", type: "number" },
        { key: "viewing_date", label: "Viewing date", type: "date" },
      ],
    },
    {
      id: "maintenance",
      label: "Maintenance & Vendors", code: "C",
      stages: ["Reported","Triaged","Vendor Assigned","Confirmed","Scheduled","In Progress","Invoice Pending","Closed"],
      tag_field: { label: "Urgency", options: [
        { name: "Emergency", swatch: "Rust",  slaDays: 1 },
        { name: "Urgent",    swatch: "Amber", slaDays: 2 },
        { name: "Routine",   swatch: "Pine",  slaDays: 7 },
      ]},
      default_checklist: ["Photos before","Photos after","Invoice uploaded","Tenant notified"],
      department_id: departmentMap["Property Management"],
      created_by: "admin",
      ticket_fields: [
        { key: "property", label: "Property", type: "text" },
        { key: "unit", label: "Unit", type: "text" },
        { key: "category", label: "Category", type: "select", options: ["Plumbing", "Electrical", "HVAC", "General"] },
        { key: "vendor", label: "Vendor", type: "text" },
        { key: "estimated_cost", label: "Estimated cost", type: "number" },
      ],
    },
    {
      id: "turns",
      label: "Unit Turns", code: "D",
      stages: ["Notice Received","Walkthrough","Scope Defined","Vendor Work","Touch-ups","Turn Complete","Re-Leased"],
      tag_field: { label: "Priority", options: [
        { name: "Rush",     swatch: "Amber", slaDays: 3 },
        { name: "Standard", swatch: "Pine",  slaDays: 7 },
      ]},
      default_checklist: ["Smoke detectors tested","All lights functioning","Plumbing leak-free","Doors/locks tested","Deep clean complete","Marketing photos taken"],
      department_id: departmentMap["Property Management"],
      created_by: "admin",
    },
    {
      id: "escalation",
      label: "Escalation & Legal", code: "E",
      stages: ["Logged","Verifying","Verbal Warning","Written Notice","Cure or Quit","Eviction Filed","Resolved"],
      tag_field: { label: "Severity", options: [
        { name: "Severe",   swatch: "Rust",  slaDays: 2  },
        { name: "Moderate", swatch: "Amber", slaDays: 5  },
        { name: "Minor",    swatch: "Slate", slaDays: 10 },
      ]},
      default_checklist: ["Complaint documented","Facts verified (photos / witness / vendor report)","Notice delivered in writing"],
      department_id: departmentMap["Property Management"],
      created_by: "admin",
    },
    {
      id: "cold_calling",
      label: "Cold Calling", code: "F",
      stages: ["List Built","Dialing","Interested","Negotiating","Under Contract","Closed"],
      tag_field: { label: "Motivation", options: [
        { name: "High",   swatch: "Rust",  slaDays: 2  },
        { name: "Medium", swatch: "Amber", slaDays: 5  },
        { name: "Low",    swatch: "Slate", slaDays: 10 },
      ]},
      default_checklist: ["Owner verified","Property valued","Offer sent"],
      department_id: departmentMap["Acquisition Department"],
      created_by: "admin",
    }
  ];

  for (const p of pipelinesData) {
    await prisma.pipeline.upsert({
      where: { id: p.id },
      update: { department_id: p.department_id, ticket_fields: p.ticket_fields },
      create: p,
    });
    console.log(`  ✓ Pipeline: ${p.label}`);
  }

  // ── 3. Staff Types ────────────────────────────────────────
  const pmStaffType = await prisma.staffType.upsert({
    where: { name: "Property Management Staff" },
    update: {},
    create: {
      name: "Property Management Staff",
      permissions: ["view", "create", "edit", "comment", "change_status"],
      allowed_departments: [departmentMap["Property Management"]],
      allowed_pipelines: ["leasing", "maintenance", "turns", "escalation"],
    },
  });
  console.log(`  ✓ Staff Type: ${pmStaffType.name}`);
  
  const acqStaffType = await prisma.staffType.upsert({
    where: { name: "Acquisition Staff" },
    update: {},
    create: {
      name: "Acquisition Staff",
      permissions: ["view", "create", "edit", "comment", "change_status"],
      allowed_departments: [departmentMap["Acquisition Department"]],
      allowed_pipelines: ["cold_calling"],
    },
  });
  console.log(`  ✓ Staff Type: ${acqStaffType.name}`);

  // ── 4. Users ──────────────────────────────────────────────
  const adminPassword = "TeamA@2026";
  const usersData = [
    { username: "amazingpropertiesusa1@gmail.com",  display_name: "admin", password: adminPassword,  role: "admin", staff_type_id: null },
    { username: "priya",  display_name: "Priya Shah",  password: "priya123",  role: "staff", staff_type_id: pmStaffType.id },
    { username: "jordan", display_name: "Jordan Lee",  password: "jordan123", role: "staff", staff_type_id: pmStaffType.id },
    { username: "hunter", display_name: "Hunter Blake", password: "hunter123", role: "staff", staff_type_id: acqStaffType.id },
    { username: "ephraimedy@gmail.com", display_name: "Ephraim Admin", password: "Ed1d1ongeph@", role: "admin", staff_type_id: null },
    { username: "saintsidus@gmail.com", display_name: "Saintsidus Staff", password: "Ed1d1ongeph@", role: "staff", staff_type_id: pmStaffType.id },
    { username: "jeffephraim8@gmail.com", display_name: "Jeff Acq", password: "Ed1d1ongeph@", role: "staff", staff_type_id: acqStaffType.id },
  ];

  for (const u of usersData) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { display_name: u.display_name, role: u.role, password_hash: hash, staff_type_id: u.staff_type_id },
      create: {
        username: u.username,
        display_name: u.display_name,
        password_hash: hash,
        role: u.role,
        staff_type_id: u.staff_type_id,
      },
    });
    console.log(`  ✓ User: ${u.username} (${u.role})`);
  }

  // ── 5. Teams ──────────────────────────────────────────────
  const adminUser = await prisma.user.findUnique({ where: { username: "amazingpropertiesusa1@gmail.com" }});
  const team = await prisma.team.upsert({
    where: { name: "Alpha Team" },
    update: {},
    create: {
      name: "Alpha Team",
      lead_id: adminUser?.id,
    },
  });
  console.log(`  ✓ Team: ${team.name}`);

  // Assign PM staff to team
  await prisma.user.updateMany({
    where: { role: "staff", staff_type_id: pmStaffType.id },
    data: { team_id: team.id }
  });

  // ── 6. Sample Tickets ─────────────────────────────────────
  const ticketsData = [
    {
      pipeline_id: "leasing", stage_index: 2,
      title: "Maplewood #4B — Sarah Chen", property: "Maplewood Apartments", unit: "4B",
      tag: "Hot", assigned_to: "Priya Shah", team_id: team.id,
      checklist: [
        { label: "ID collected", done: false },
        { label: "Pay stubs / bank statements", done: false },
        { label: "Rental history checked", done: false },
        { label: "Background check run", done: false },
      ],
      history: [{ stageIndex: 2, stageName: "Showing", enteredAt: new Date(Date.now() - 86400000).toISOString() }],
    },
    {
      pipeline_id: "leasing", stage_index: 0,
      title: "Oak St #1 — Marcus Webb", property: "Oak Street Duplex", unit: "1",
      tag: "Warm", assigned_to: "Jordan Lee", team_id: team.id,
      checklist: [
        { label: "ID collected", done: false },
        { label: "Pay stubs / bank statements", done: false },
        { label: "Rental history checked", done: false },
        { label: "Background check run", done: false },
      ],
      history: [],
    },
    {
      pipeline_id: "maintenance", stage_index: 2,
      title: "Maplewood #4B — No heat", property: "Maplewood Apartments", unit: "4B",
      tag: "Emergency", assigned_to: "Vendor: ColdStar HVAC", team_id: team.id,
      checklist: [
        { label: "Photos before", done: false },
        { label: "Photos after", done: false },
        { label: "Invoice uploaded", done: false },
        { label: "Tenant notified", done: false },
      ],
      history: [],
    },
    {
      pipeline_id: "turns", stage_index: 3,
      title: "Maplewood #9C — Move-out turn", property: "Maplewood Apartments", unit: "9C",
      tag: "Standard", assigned_to: "Jordan Lee", team_id: team.id,
      checklist: [
        { label: "Smoke detectors tested", done: false },
        { label: "All lights functioning", done: false },
        { label: "Plumbing leak-free", done: false },
        { label: "Doors/locks tested", done: false },
        { label: "Deep clean complete", done: false },
        { label: "Marketing photos taken", done: false },
      ],
      history: [],
    },
    {
      pipeline_id: "escalation", stage_index: 0,
      title: "Oak St #2 — Late rent, 2nd month", property: "Oak Street Duplex", unit: "2",
      tag: "Severe", assigned_to: "admin", team_id: team.id,
      checklist: [
        { label: "Complaint documented", done: false },
        { label: "Facts verified (photos / witness / vendor report)", done: false },
        { label: "Notice delivered in writing", done: false },
      ],
      history: [],
    },
    {
      pipeline_id: "cold_calling", stage_index: 0,
      title: "123 Main St - Distressed Seller", property: "123 Main St", unit: "",
      tag: "High", assigned_to: "Hunter Blake", team_id: null,
      checklist: [
        { label: "Owner verified", done: false },
        { label: "Property valued", done: false },
        { label: "Offer sent", done: false },
      ],
      history: [],
    }
  ];

  for (const t of ticketsData) {
    const existing = await prisma.ticket.findFirst({ where: { title: t.title } });
    if (!existing) {
      await prisma.ticket.create({ data: t });
    } else {
      console.log(`  - Ticket already exists, skipping: ${t.title}`);
    }
  }

  console.log("\n✅ Seed complete!\n");
  console.log("Admin password: TeamA@2026");
  console.log("  staff passwords: priya123, jordan123, hunter123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
