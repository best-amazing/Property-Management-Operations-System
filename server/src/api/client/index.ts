import { Router } from "express";
import authRouter from "./auth";
import pipelinesRouter from "./pipelines";
import ticketsRouter from "./tickets";
import notesRouter from "./notes";
import activityRouter from "./activity";
import usersRouter from "./users";
import { requireAuth } from "../../utils/authMiddleware";

const router = Router();

router.use("/auth", authRouter);

router.use(requireAuth);
router.use("/pipelines", pipelinesRouter);
router.use("/tickets", ticketsRouter);
router.use("/notes", notesRouter);
router.use("/activity", activityRouter);
router.use("/users", usersRouter);

export default router;
