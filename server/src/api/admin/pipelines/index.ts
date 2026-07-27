import { Router } from "express";
import { getPipelinesHandler } from "./handlers/get-pipelines";
import { getPipelineHandler } from "./handlers/get-pipeline";
import { createPipelineHandler } from "./handlers/create-pipeline";
import { updatePipelineHandler } from "./handlers/update-pipeline";
import { deletePipelineHandler } from "./handlers/delete-pipeline";

const router = Router();

router.get("/", getPipelinesHandler);
router.get("/:id", getPipelineHandler);
router.post("/", createPipelineHandler);
router.patch("/:id", updatePipelineHandler);
router.delete("/:id", deletePipelineHandler);

export default router;
