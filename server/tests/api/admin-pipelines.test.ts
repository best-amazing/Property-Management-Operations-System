import request from "supertest";
import app from "../../src/app";
import { pipelineService } from "../../src/services/pipeline.service";
import jwt from "jsonwebtoken";

jest.mock("../../src/services/pipeline.service");

describe("Admin Pipelines API", () => {
  let adminToken: string;

  beforeAll(() => {
    adminToken = jwt.sign({ id: "1", username: "admin", role: "admin" }, "default_secret");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should get all pipelines", async () => {
    const mockPipelines = [{ id: "1", label: "Maintenance" }];
    (pipelineService.findAll as jest.Mock).mockResolvedValue(mockPipelines);

    const res = await request(app)
      .get("/api/v1/admin/pipelines")
      .set("Authorization", `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockPipelines);
  });

  it("should create a pipeline", async () => {
    const newPipeline = { id: "2", label: "New Pipeline" };
    (pipelineService.create as jest.Mock).mockResolvedValue(newPipeline);

    const res = await request(app)
      .post("/api/v1/admin/pipelines")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ label: "New Pipeline" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(newPipeline);
  });

  it("should delete a pipeline", async () => {
    (pipelineService.delete as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .delete("/api/v1/admin/pipelines/2")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
    expect(pipelineService.delete).toHaveBeenCalledWith("2");
  });
});
