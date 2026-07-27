import request from "supertest";
import app from "../../src/app";
import { userService } from "../../src/services/user.service";
import jwt from "jsonwebtoken";

jest.mock("../../src/services/user.service");

describe("Admin Users API", () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(() => {
    adminToken = jwt.sign({ id: "1", username: "admin", role: "admin" }, "default_secret");
    staffToken = jwt.sign({ id: "2", username: "staff", role: "staff" }, "default_secret");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should block non-admins from getting users", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it("should get all users for admin", async () => {
    const mockUsers = [{ id: "1", username: "admin", role: "admin" }];
    (userService.findAll as jest.Mock).mockResolvedValue(mockUsers);

    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockUsers);
    expect(userService.findAll).toHaveBeenCalled();
  });

  it("should create a user", async () => {
    const newUser = { id: "3", username: "new", role: "staff" };
    (userService.create as jest.Mock).mockResolvedValue(newUser);

    const res = await request(app)
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "new", password: "pwd", role: "staff", display_name: "New" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(newUser);
    expect(userService.create).toHaveBeenCalledWith({ username: "new", password: "pwd", role: "staff", display_name: "New" });
  });

  it("should delete a user", async () => {
    (userService.delete as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .delete("/api/v1/admin/users/3")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
    expect(userService.delete).toHaveBeenCalledWith("3");
  });

  it("should not allow admin to delete themselves", async () => {
    const res = await request(app)
      .delete("/api/v1/admin/users/1")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(userService.delete).not.toHaveBeenCalled();
  });
});
