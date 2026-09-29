import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /admin/contacts
router.get("/", async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      include: { contact_type: true, properties: true }
    });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// POST /admin/contacts
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const contact = await prisma.contact.create({ data });
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: "Failed to create contact" });
  }
});

// GET /admin/contacts/types
router.get("/types", async (req, res) => {
  try {
    const types = await prisma.contactType.findMany();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contact types" });
  }
});

// POST /admin/contacts/types
router.post("/types", async (req, res) => {
  try {
    const { name } = req.body;
    const type = await prisma.contactType.create({ data: { name } });
    res.status(201).json(type);
  } catch (error) {
    res.status(500).json({ error: "Failed to create contact type" });
  }
});

// PUT /admin/contacts/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const contact = await prisma.contact.update({
      where: { id },
      data
    });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: "Failed to update contact" });
  }
});

export default router;
