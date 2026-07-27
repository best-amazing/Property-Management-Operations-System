import { Router } from "express";
import { getPipelinesHandler } from "./handlers/get-pipelines";
import { getPipelineHandler } from "./handlers/get-pipeline";

const router = Router();

router.get("/", getPipelinesHandler);
router.get("/:id", getPipelineHandler);

export default router;
