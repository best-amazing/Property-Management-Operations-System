import { Router } from "express";
import { getNotesHandler } from "./handlers/get-notes";
import { createNoteHandler } from "./handlers/create-note";
import { updateNoteHandler } from "./handlers/update-note";
import { deleteNoteHandler } from "./handlers/delete-note";

const router = Router();

router.get("/:ticketId", getNotesHandler);
router.post("/:ticketId", createNoteHandler);
router.patch("/:id", updateNoteHandler);
router.delete("/:id", deleteNoteHandler);

export default router;
