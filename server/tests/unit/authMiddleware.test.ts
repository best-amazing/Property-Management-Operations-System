import { Request, Response, NextFunction } from "express";
import { requireAuth, requireAdmin } from "../../src/utils/authMiddleware";
import jwt from "jsonwebtoken";

jest.mock("jsonwebtoken");

describe("Auth Middleware Unit Tests", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe("requireAuth", () => {
    it("should return 401 if no authorization header is present", () => {
      requireAuth(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("should call next() if valid token is provided", () => {
      req.headers!.authorization = "Bearer valid_token";
      (jwt.verify as jest.Mock).mockReturnValue({ id: "1", role: "staff" });

      requireAuth(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
      expect((req as any).user).toEqual({ id: "1", role: "staff" });
    });
  });

  describe("requireAdmin", () => {
    it("should return 403 if user is not an admin", () => {
      req.headers!.authorization = "Bearer valid_token";
      (jwt.verify as jest.Mock).mockReturnValue({ id: "1", role: "staff" });

      requireAdmin(req as Request, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden. Admin access required." });
    });

    it("should call next() if user is admin", () => {
      req.headers!.authorization = "Bearer valid_token";
      (jwt.verify as jest.Mock).mockReturnValue({ id: "2", role: "admin" });

      requireAdmin(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
    });
  });
});
