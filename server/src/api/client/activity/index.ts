import { Router } from "express";
import { getActivityHandler } from "./handlers/get-activity";

const router = Router();

router.get("/", getActivityHandler);

export default router;
