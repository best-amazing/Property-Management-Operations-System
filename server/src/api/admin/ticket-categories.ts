import { Router } from "express";
import { ticketCategoryService } from "../../../services/ticket-category.service";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const categories = await ticketCategoryService.findAll();
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const category = await ticketCategoryService.create(req.body);
    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await ticketCategoryService.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
