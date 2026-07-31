import { Router } from "express";
import { loginHandler } from "./handlers/login";
import { verifyOtpHandler } from "./handlers/verify-otp";
import { otpSendLimiter, otpVerifyLimiter } from "../../../middlewares/rateLimiter";

const router = Router();

router.post("/login", otpSendLimiter, loginHandler);
router.post("/login/verify-otp", otpVerifyLimiter, verifyOtpHandler);

export default router;
