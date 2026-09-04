import { Router } from "express";
import { teamService } from "../../services/team.service";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const teams = await teamService.findAll();
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const team = await teamService.create(req.body);
    res.status(201).json(team);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const team = await teamService.update(req.params.id, req.body);
    res.json(team);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await teamService.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
