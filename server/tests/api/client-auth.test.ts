import request from "supertest";
import app from "../../src/app";
import { userService } from "../../src/services/user.service";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "../../src/services/mailer";
import { generateOtp } from "../../src/utils/otp";

jest.mock("../../src/services/user.service");
jest.mock("bcryptjs");
jest.mock("../../src/services/mailer");
jest.mock("../../src/utils/otp");
jest.mock("@prisma/client", () => {
  const mocks = {
    pendingLogin: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  };
  return { __mocks__: mocks, PrismaClient: jest.fn(() => mocks) };
});

import * as PrismaClientModule from "@prisma/client";

const prisma = (PrismaClientModule as any).__mocks__;

describe("Client Auth API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    id: "1",
    username: "staff",
    password_hash: "hashed",
    role: "staff",
    display_name: "Staff",
    created_at: new Date(),
  };

  it("should request an OTP code with correct credentials", async () => {
    (userService.findByUsername as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (generateOtp as jest.Mock).mockReturnValue("123456");
    (sendOtpEmail as jest.Mock).mockResolvedValue(undefined);
    (prisma.pendingLogin.create as jest.Mock).mockResolvedValue({ token: "session-token" });

    const res = await request(app)
      .post("/api/v1/client/auth/login")
      .send({ username: "staff", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.requiresOtp).toBe(true);
    expect(res.body.loginSessionToken).toBeDefined();
    expect(sendOtpEmail).toHaveBeenCalledWith("staff", "123456");
  });

  it("should fail login with incorrect password", async () => {
    (userService.findByUsername as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post("/api/v1/client/auth/login")
      .send({ username: "staff", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it("should return 502 when the OTP email fails to send", async () => {
    (userService.findByUsername as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (prisma.pendingLogin.create as jest.Mock).mockResolvedValue({ token: "session-token" });
    (sendOtpEmail as jest.Mock).mockRejectedValue(new Error("smtp down"));

    const res = await request(app)
      .post("/api/v1/client/auth/login")
      .send({ username: "staff", password: "password123" });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("Failed to send verification code");
  });

  it("should verify the OTP and return a token", async () => {
    const pending = {
      id: "pending-1",
      token: "session-token",
      userId: "1",
      codeHash: "hashed-code",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      used: false,
    };
    (prisma.pendingLogin.findUnique as jest.Mock).mockResolvedValue(pending);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app)
      .post("/api/v1/client/auth/login/verify-otp")
      .send({ loginSessionToken: "session-token", code: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe("staff");
    expect(prisma.pendingLogin.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { used: true } })
    );
  });

  it("should reject an invalid OTP and increment attempts", async () => {
    const pending = {
      id: "pending-1",
      token: "session-token",
      userId: "1",
      codeHash: "hashed-code",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      used: false,
    };
    (prisma.pendingLogin.findUnique as jest.Mock).mockResolvedValue(pending);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post("/api/v1/client/auth/login/verify-otp")
      .send({ loginSessionToken: "session-token", code: "000000" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid code");
    expect(prisma.pendingLogin.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attempts: { increment: 1 } } })
    );
  });
});
