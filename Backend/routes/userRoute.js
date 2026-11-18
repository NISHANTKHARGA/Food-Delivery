import express from "express";
import { rateLimit } from "express-rate-limit";
import { loginUser, registerUser, adminLogin } from "../controllers/userController.js";

const userRouter = express.Router();

// Throttle credential endpoints to slow down brute-force / credential stuffing.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts, please try again later." },
});

userRouter.post("/register", authLimiter, registerUser);
userRouter.post("/login", authLimiter, loginUser);
userRouter.post("/admin/login", authLimiter, adminLogin);

export default userRouter;
