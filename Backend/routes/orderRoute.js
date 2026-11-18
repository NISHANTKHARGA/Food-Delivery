import express from "express";
import authMiddleware, { adminMiddleware } from "../middleware/auth.js";
import {
    placeOrder,
    verifyOrder,
    userOrders,
    listOrders,
    updateStatus,
} from "../controllers/orderController.js";

const orderRouter = express.Router();

// Customer endpoints (authenticated as the customer).
orderRouter.post("/place", authMiddleware, placeOrder);
orderRouter.post("/verify", authMiddleware, verifyOrder);
orderRouter.post("/userorders", authMiddleware, userOrders);

// Admin-only endpoints.
orderRouter.get("/list", adminMiddleware, listOrders);
orderRouter.post("/status", adminMiddleware, updateStatus);

export default orderRouter;
