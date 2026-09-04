import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting PMOS seed...");

  // ── 1. Global Categories ──────────────────────────────────
  const categoriesData = [
    "Finance",
    "Property Management",
    "Maintenance",
    "Leasing",
    "General Operations"
  ];
  const categoryMap: Record<string, string> = {};
  for (const c of categoriesData) {
    const created = await prisma.ticketCategory.upsert({
      where: { name: c },
      update: {},
      create: { name: c },
    });
    categoryMap[c] = created.id;
    console.log(`  ✓ Category: ${c}`);
  }

  // ── 2. Staff Types ────────────────────────────────────────
  const pmStaffType = await prisma.staffType.upsert({
    where: { name: "Property Management Staff" },
    update: {},
    create: {
      name: "Property Management Staff",
      permissions: ["view", "create", "edit", "comment", "change_status"],
      allowed_categories: [categoryMap["Property Management"], categoryMap["Leasing"], categoryMap["Maintenance"]],
    },
  });
  console.log(`  ✓ Staff Type: ${pmStaffType.name}`);

  // ── 3. Users ──────────────────────────────────────────────
  const adminPassword = "TeamA@2026";
  const usersData = [
    { username: "amazingpropertiesusa1@gmail.com",  display_name: "admin", password: adminPassword,  role: "admin", staff_type_id: null },
    { username: "priya",  display_name: "Priya Shah",  password: "priya123",  role: "staff", staff_type_id: pmStaffType.id },
    { username: "jordan", display_name: "Jordan Lee",  password: "jordan123", role: "staff", staff_type_id: pmStaffType.id },
    { username: "ephraimedy@gmail.com", display_name: "Ephraim", password: "Ed1d1ongeph@", role: "staff", staff_type_id: pmStaffType.id },
  ];

  for (const u of usersData) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { display_name: u.display_name, role: u.role, password_hash: hash },
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

  // ── 4. Teams ──────────────────────────────────────────────
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

  // Assign staff to team
  await prisma.user.updateMany({
    where: { role: "staff" },
    data: { team_id: team.id }
  });

  // ── 5. Pipelines ──────────────────────────────────────────
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
      category_field: { label: "Source", options: ["Zillow","Apartments.com","MLS","Referral","Drive-by","Other"] },
      default_checklist: ["ID collected","Pay stubs / bank statements","Rental history checked","Background check run"],
      created_by: "admin",
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
      category_field: { label: "Category", options: ["HVAC","Plumbing","Electrical","General","Appliance"] },
      default_checklist: ["Photos before","Photos after","Invoice uploaded","Tenant notified"],
      created_by: "admin",
    },
    {
      id: "turns",
      label: "Unit Turns", code: "D",
      stages: ["Notice Received","Walkthrough","Scope Defined","Vendor Work","Touch-ups","Turn Complete","Re-Leased"],
      tag_field: { label: "Priority", options: [
        { name: "Rush",     swatch: "Amber", slaDays: 3 },
        { name: "Standard", swatch: "Pine",  slaDays: 7 },
      ]},
      category_field: { label: "Turn Size", options: ["Light Turn","Standard Turn","Heavy Turn"] },
      default_checklist: ["Smoke detectors tested","All lights functioning","Plumbing leak-free","Doors/locks tested","Deep clean complete","Marketing photos taken"],
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
      category_field: { label: "Violation Type", options: ["Non-payment","Noise","Damage","Lease Violation","Illegal Activity","Unauthorized Occupant","Habitability"] },
      default_checklist: ["Complaint documented","Facts verified (photos / witness / vendor report)","Notice delivered in writing"],
      created_by: "admin",
    },
  ];

  for (const p of pipelinesData) {
    await prisma.pipeline.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
    console.log(`  ✓ Pipeline: ${p.label}`);
  }

  // ── 3. Sample Tickets ─────────────────────────────────────
  const ticketsData = [
    {
      pipeline_id: "leasing", stage_index: 2,
      title: "Maplewood #4B — Sarah Chen", property: "Maplewood Apartments", unit: "4B",
      tag: "Hot", category: "Zillow", assigned_to: "Priya Shah", team_id: team.id,
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
      tag: "Warm", category: "Referral", assigned_to: "Jordan Lee", team_id: team.id,
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
      tag: "Emergency", category: "HVAC", assigned_to: "Vendor: ColdStar HVAC", team_id: team.id,
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
      tag: "Standard", category: "Standard Turn", assigned_to: "Jordan Lee", team_id: team.id,
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
      pipeline_id: "escalation", stage_index: 3,
      title: "Oak St #2 — Late rent, 2nd month", property: "Oak Street Duplex", unit: "2",
      tag: "Moderate", category: "Non-payment", assigned_to: "Priya Shah", team_id: team.id,
      checklist: [
        { label: "Complaint documented", done: false },
        { label: "Facts verified (photos / witness / vendor report)", done: false },
        { label: "Notice delivered in writing", done: false },
      ],
      history: [],
    },
  ];

  for (const t of ticketsData) {
    const existing = await prisma.ticket.findFirst({ where: { title: t.title } });
    if (!existing) {
      await prisma.ticket.create({ data: t });
      console.log(`  ✓ Ticket: ${t.title}`);
    } else {
      console.log(`  - Ticket already exists, skipping: ${t.title}`);
    }
  }

  console.log("\n✅ Seed complete!");
  console.log("\nAdmin password:", adminPassword);
  console.log("  staff passwords: priya123, jordan123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
