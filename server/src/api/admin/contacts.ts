import { Router } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../utils/prisma";
import {
  contactInclude, findContacts, getContactFilterOptions, parseContact, saveContact,
} from "../../services/contact.service";

const router = Router();

const isKnownError = (e: unknown, code: string) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;

// GET /admin/contacts?search=&type_id=&city=&state=&zip=&property_id=&status=active|archived|all
router.get("/", async (req, res) => {
  try {
    res.json(await findContacts(req.query as Record<string, unknown>, "all"));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// GET /admin/contacts/filters
router.get("/filters", async (_req, res) => {
  try {
    res.json(await getContactFilterOptions("all"));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
});

// GET /admin/contacts/types
router.get("/types", async (_req, res) => {
  try {
    const types = await prisma.contactType.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { contacts: true } } },
    });
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contact types" });
  }
});

// POST /admin/contacts/types
router.post("/types", async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) return res.status(400).json({ error: "Name is required" });
    const type = await prisma.contactType.create({ data: { name } });
    res.status(201).json(type);
  } catch (error) {
    if (isKnownError(error, "P2002")) return res.status(409).json({ error: "A contact type with that name already exists" });
    res.status(500).json({ error: "Failed to create contact type" });
  }
});

// PUT /admin/contacts/types/:id
router.put("/types/:id", async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) return res.status(400).json({ error: "Name is required" });
    const type = await prisma.contactType.update({ where: { id: req.params.id }, data: { name } });
    res.json(type);
  } catch (error) {
    if (isKnownError(error, "P2002")) return res.status(409).json({ error: "A contact type with that name already exists" });
    res.status(500).json({ error: "Failed to update contact type" });
  }
});

// DELETE /admin/contacts/types/:id — only when no contacts use it
router.delete("/types/:id", async (req, res) => {
  try {
    const inUse = await prisma.contact.count({ where: { type_id: req.params.id } });
    if (inUse) return res.status(400).json({ error: `This type is used by ${inUse} contact(s). Reassign them first.` });
    await prisma.contactType.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete contact type" });
  }
});

// GET /admin/contacts/:id
router.get("/:id", async (req, res) => {
  try {
    const contact = await prisma.contact.findUnique({ where: { id: req.params.id }, include: contactInclude });
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

// POST /admin/contacts  (body may include property_ids: string[])
router.post("/", async (req, res) => {
  try {
    const parsed = parseContact(req.body, false);
    if ("error" in parsed) return res.status(400).json({ error: parsed.error });
    const contact = await saveContact(null, parsed.data, parsed.propertyIds);
    res.status(201).json(contact);
  } catch (error) {
    console.error("Failed to create contact:", error);
    res.status(500).json({ error: "Failed to create contact" });
  }
});

// PUT /admin/contacts/:id  (property_ids, when present, replaces the associations)
router.put("/:id", async (req, res) => {
  try {
    const parsed = parseContact(req.body, true);
    if ("error" in parsed) return res.status(400).json({ error: parsed.error });
    const contact = await saveContact(req.params.id, parsed.data, parsed.propertyIds);
    res.json(contact);
  } catch (error) {
    if (isKnownError(error, "P2025")) return res.status(404).json({ error: "Contact not found" });
    console.error("Failed to update contact:", error);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

export default router;
