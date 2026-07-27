import request from "supertest";
import app from "../../src/app";
import { noteService } from "../../src/services/note.service";
import jwt from "jsonwebtoken";

jest.mock("../../src/services/note.service");

describe("Client Notes API", () => {
  let staffToken: string;

  beforeAll(() => {
    staffToken = jwt.sign({ id: "2", username: "staff", display_name: "Staff", role: "staff" }, "default_secret");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should get notes for a ticket", async () => {
    const mockNotes = [{ id: "1", text: "Some note", ticket_id: "t1" }];
    (noteService.findAllByTicket as jest.Mock).mockResolvedValue(mockNotes);

    const res = await request(app)
      .get("/api/v1/client/notes/t1")
      .set("Authorization", `Bearer ${staffToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockNotes);
    expect(noteService.findAllByTicket).toHaveBeenCalledWith("t1");
  });

  it("should create a note for a ticket", async () => {
    const newNote = { id: "2", text: "New Note", ticket_id: "t1" };
    (noteService.create as jest.Mock).mockResolvedValue(newNote);

    const res = await request(app)
      .post("/api/v1/client/notes/t1")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ text: "New Note" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(newNote);
    expect(noteService.create).toHaveBeenCalledWith(expect.objectContaining({
      text: "New Note",
      ticket_id: "t1",
      author: "Staff"
    }));
  });
});
