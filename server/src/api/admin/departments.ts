import { Router } from "express";
import { departmentService } from "../../services/department.service";

const router = Router();

// GET /admin/departments
router.get("/", async (req, res) => {
  try {
    const departments = await departmentService.findAll();
    res.json(departments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/departments
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: "Department name is required." });
      return;
    }
    const department = await departmentService.create({ name: name.trim() });
    res.status(201).json(department);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH /admin/departments/:id
router.patch("/:id", async (req, res) => {
  try {
    const { name } = req.body;
    const department = await departmentService.update(req.params.id, {
      ...(name ? { name: name.trim() } : {}),
    });
    res.json(department);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /admin/departments/:id
router.delete("/:id", async (req, res) => {
  try {
    await departmentService.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
