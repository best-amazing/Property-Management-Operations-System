import { Router } from "express";
import { getUsersHandler } from "./handlers/get-users";

import { createUserHandler } from "./handlers/create-user";
import { updateUserHandler } from "./handlers/update-user";
import { deleteUserHandler } from "./handlers/delete-user";

const router = Router();

router.get("/", getUsersHandler);
router.post("/", createUserHandler);
router.patch("/:id", updateUserHandler);
router.delete("/:id", deleteUserHandler);

export default router;
