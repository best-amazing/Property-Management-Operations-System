import { Router } from "express";
import { getTicketsHandler } from "./handlers/get-tickets";
import { getTicketHandler } from "./handlers/get-ticket";
import { createTicketHandler } from "./handlers/create-ticket";
import { updateTicketHandler } from "./handlers/update-ticket";
import { updateChecklistHandler } from "./handlers/update-checklist";
import { deleteTicketHandler } from "./handlers/delete-ticket";

const router = Router();

router.get("/pipeline/:pipelineId", getTicketsHandler);
router.post("/", createTicketHandler);
router.get("/:id", getTicketHandler);
router.patch("/:id/checklist", updateChecklistHandler);
router.patch("/:id", updateTicketHandler);
router.delete("/:id", deleteTicketHandler);

export default router;
