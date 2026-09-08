import { Router } from "express";
import { getDepartmentsHandler } from "./handlers/get-departments";

const router = Router();

router.get("/", getDepartmentsHandler);

export default router;
