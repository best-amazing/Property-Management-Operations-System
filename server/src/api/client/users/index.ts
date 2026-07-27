import { Router } from "express";
import { getUsersHandler } from "./handlers/get-users";

const router = Router();

router.get("/", getUsersHandler);

export default router;
