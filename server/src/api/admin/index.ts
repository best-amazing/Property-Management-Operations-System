import { Router } from "express";
import usersRouter from "./users";
import pipelinesRouter from "./pipelines";
import seedRouter from "./seed";
import staffTypesRouter from "./staff-types";
import teamsRouter from "./teams";
import departmentsRouter from "./departments";
import { requireAdmin } from "../../utils/authMiddleware";

const router = Router();

router.use(requireAdmin);
router.use("/users", usersRouter);
router.use("/pipelines", pipelinesRouter);
router.use("/seed", seedRouter);
router.use("/staff-types", staffTypesRouter);
router.use("/teams", teamsRouter);
router.use("/departments", departmentsRouter);

export default router;

