import { Router } from "express";
import usersRouter from "./users";
import pipelinesRouter from "./pipelines";
import seedRouter from "./seed";
import { requireAdmin } from "../../utils/authMiddleware";

const router = Router();

router.use(requireAdmin);
router.use("/users", usersRouter);
router.use("/pipelines", pipelinesRouter);
router.use("/seed", seedRouter);

export default router;
