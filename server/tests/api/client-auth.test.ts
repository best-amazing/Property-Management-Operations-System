import request from "supertest";
import app from "../../src/app";
import { userService } from "../../src/services/user.service";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

jest.mock("../../src/services/user.service");
jest.mock("bcryptjs");

describe("Client Auth API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should login successfully with correct credentials", async () => {
    const mockUser = {
      id: "1",
      username: "staff",
      password_hash: "hashed",
      role: "staff",
      display_name: "Staff",
      created_at: new Date()
    };
    (userService.findByUsername as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post("/api/v1/client/auth/login")
      .send({ username: "staff", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe("staff");
  });

  it("should fail login with incorrect password", async () => {
    const mockUser = {
      id: "1",
      username: "staff",
      password_hash: "hashed",
    };
    (userService.findByUsername as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post("/api/v1/client/auth/login")
      .send({ username: "staff", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });
});
