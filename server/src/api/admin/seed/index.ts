import { Router } from "express";
import { resetTicketsHandler } from "./handlers/reset-tickets";

const router = Router();

router.post("/tickets", resetTicketsHandler);

export default router;
