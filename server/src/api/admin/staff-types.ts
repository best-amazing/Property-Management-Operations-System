import { Router } from "express";
import { staffTypeService } from "../../../services/staff-type.service";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const types = await staffTypeService.findAll();
    res.json(types);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const type = await staffTypeService.create(req.body);
    res.status(201).json(type);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const type = await staffTypeService.update(req.params.id, req.body);
    res.json(type);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await staffTypeService.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
