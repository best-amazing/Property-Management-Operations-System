import { Router } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../utils/prisma";

const router = Router();

const propertyInclude = {
  contacts: { include: { contact: { include: { contact_type: true } } } },
  staff: { include: { user: { select: { id: true, display_name: true, username: true } } } },
} satisfies Prisma.PropertyInclude;

const FIELDS = ["name", "address", "city", "state", "zip", "status"] as const;

function parseProperty(body: Record<string, any>, partial: boolean): { error: string } | { data: Record<string, any>; staffIds?: string[] } {
  const data: Record<string, any> = {};
  for (const field of FIELDS) {
    if (body[field] === undefined) continue;
    const value = typeof body[field] === "string" ? body[field].trim() : body[field];
    data[field] = value === "" && field !== "name" ? null : value;
  }
  if ((!partial || data.name !== undefined) && !data.name) return { error: "Property name is required" };
  if (data.status !== undefined && !["active", "archived"].includes(data.status)) return { error: "Invalid status" };

  let staffIds: string[] | undefined;
  if (body.staff_ids !== undefined) {
    if (!Array.isArray(body.staff_ids)) return { error: "staff_ids must be an array" };
    staffIds = [...new Set<string>(body.staff_ids.filter((x: unknown) => typeof x === "string" && x))];
  }
  return { data, staffIds };
}

async function saveProperty(id: string | null, data: Record<string, any>, staffIds?: string[]) {
  return prisma.$transaction(async tx => {
    const property = id
      ? await tx.property.update({ where: { id }, data })
      : await tx.property.create({ data: data as Prisma.PropertyCreateInput });
    if (staffIds) {
      await tx.propertyStaff.deleteMany({ where: { property_id: property.id } });
      if (staffIds.length) {
        await tx.propertyStaff.createMany({
          data: staffIds.map(user_id => ({ user_id, property_id: property.id })),
          skipDuplicates: true,
        });
      }
    }
    return tx.property.findUniqueOrThrow({ where: { id: property.id }, include: propertyInclude });
  });
}

// GET /admin/properties?status=active|archived|all
router.get("/", async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "all";
    const properties = await prisma.property.findMany({
      where: status === "all" ? {} : { status },
      include: propertyInclude,
      orderBy: { name: "asc" },
    });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// POST /admin/properties  (body may include staff_ids: string[])
router.post("/", async (req, res) => {
  try {
    const parsed = parseProperty(req.body, false);
    if ("error" in parsed) return res.status(400).json({ error: parsed.error });
    res.status(201).json(await saveProperty(null, parsed.data, parsed.staffIds));
  } catch (error) {
    console.error("Failed to create property:", error);
    res.status(500).json({ error: "Failed to create property" });
  }
});

// PUT /admin/properties/:id  (staff_ids, when present, replaces the assignments)
router.put("/:id", async (req, res) => {
  try {
    const parsed = parseProperty(req.body, true);
    if ("error" in parsed) return res.status(400).json({ error: parsed.error });
    res.json(await saveProperty(req.params.id, parsed.data, parsed.staffIds));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ error: "Property not found" });
    }
    console.error("Failed to update property:", error);
    res.status(500).json({ error: "Failed to update property" });
  }
});

export default router;
