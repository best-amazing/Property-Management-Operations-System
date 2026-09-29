import { Router } from "express";
import usersRouter from "./users";
import pipelinesRouter from "./pipelines";
import seedRouter from "./seed";
import staffTypesRouter from "./staff-types";
import teamsRouter from "./teams";
import departmentsRouter from "./departments";
import contactsRouter from "./contacts";
import policiesRouter from "./policies";
import announcementsRouter from "./announcements";
import { requireAdmin } from "../../utils/authMiddleware";

const router = Router();

router.use(requireAdmin);
router.use("/users", usersRouter);
router.use("/pipelines", pipelinesRouter);
router.use("/seed", seedRouter);
router.use("/staff-types", staffTypesRouter);
router.use("/teams", teamsRouter);
router.use("/departments", departmentsRouter);
router.use("/contacts", contactsRouter);
router.use("/policies", policiesRouter);
router.use("/announcements", announcementsRouter);

export default router;

