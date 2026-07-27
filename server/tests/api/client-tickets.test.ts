import request from "supertest";
import app from "../../src/app";
import { ticketService } from "../../src/services/ticket.service";
import jwt from "jsonwebtoken";

jest.mock("../../src/services/ticket.service");

describe("Client Tickets API", () => {
  let staffToken: string;

  beforeAll(() => {
    staffToken = jwt.sign({ id: "2", username: "staff", display_name: "Staff", role: "staff" }, "default_secret");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should get tickets for a pipeline", async () => {
    const mockTickets = [{ id: "1", title: "Fix Sink", pipeline_id: "p1" }];
    (ticketService.findAllByPipeline as jest.Mock).mockResolvedValue(mockTickets);

    const res = await request(app)
      .get("/api/v1/client/tickets/pipeline/p1")
      .set("Authorization", `Bearer ${staffToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockTickets);
    expect(ticketService.findAllByPipeline).toHaveBeenCalledWith("p1", undefined);
  });

  it("should create a ticket", async () => {
    const newTicket = { id: "2", title: "New Ticket" };
    (ticketService.create as jest.Mock).mockResolvedValue(newTicket);

    const res = await request(app)
      .post("/api/v1/client/tickets")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ title: "New Ticket", pipeline_id: "p1" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(newTicket);
  });
});
