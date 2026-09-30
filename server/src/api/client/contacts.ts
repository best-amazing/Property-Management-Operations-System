import { Router } from "express";
import prisma from "../../utils/prisma";
import { contactInclude, findContacts, getContactFilterOptions } from "../../services/contact.service";

const router = Router();

// GET /client/contacts?search=&type_id=&city=&state=&zip=&property_id=
// Staff read-only access to active contacts
router.get("/", async (req, res) => {
  try {
    const query = { ...(req.query as Record<string, unknown>), status: "active" };
    res.json(await findContacts(query));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// GET /client/contacts/filters — dropdown options for the directory
router.get("/filters", async (_req, res) => {
  try {
    res.json(await getContactFilterOptions("active"));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
});

// GET /client/contacts/:id
router.get("/:id", async (req, res) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, status: "active" },
      include: contactInclude,
    });
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

export default router;
