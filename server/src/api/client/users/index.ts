import { Router } from "express";
import { getUsersHandler } from "./handlers/get-users";
import { getMeHandler } from "./handlers/get-me";

const router = Router();

router.get("/me", getMeHandler);
router.get("/", getUsersHandler);

export default router;
