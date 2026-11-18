import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { connectDB } from "./config/db.js";
import foodRouter from "./routes/foodRoute.js";
import userRouter from "./routes/userRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";

// ---------------------------------------------------------------------------
// Startup configuration checks (fail fast on missing secrets)
// ---------------------------------------------------------------------------
const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
    process.exit(1);
}

//app config
const app = express();
const port = Number(process.env.PORT) || 4000;

// Honor X-Forwarded-* only when explicitly behind a trusted proxy. This keeps
// rate limiting effective and avoids IP spoofing.
if (process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1);
}

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------
app.disable("x-powered-by");

// helmet's default Cross-Origin-Resource-Policy would block the storefront
// (different origin/port) from loading images served by this API.
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            // Requests without an Origin header (curl, server-to-server, same-origin) are allowed.
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "token"],
        maxAge: 86400,
    })
);

// Limit the size of JSON bodies to reduce memory-exhaustion abuse.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Broad rate limiter for the API surface. Static images are excluded so that
// normal browsing does not exhaust the quota.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", apiLimiter);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
const uploadsDir = path.resolve("uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

app.use("/api/food", foodRouter);
app.use("/images", express.static(uploadsDir, { dotfiles: "deny", index: false, maxAge: "1d" }));
app.use("/api/user", userRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);

app.get("/", (req, res) => {
    res.send("API Working");
});

// ---------------------------------------------------------------------------
// 404 + error handling (never leak stack traces to clients)
// ---------------------------------------------------------------------------
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Not Found" });
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (error?.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, message: "Invalid JSON body" });
    }

    if (error?.name === "MulterError") {
        const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        const message =
            error.code === "LIMIT_FILE_SIZE"
                ? "Image must be 5MB or smaller"
                : "Invalid image upload";
        return res.status(status).json({ success: false, message });
    }

    if (error?.type === "entity.too.large") {
        return res.status(413).json({ success: false, message: "Request body too large" });
    }

    // Validation-style errors thrown by our own middleware.
    if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) {
        return res.status(error.status).json({ success: false, message: error.message });
    }

    console.error(error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});

connectDB().catch((error) => {
    console.error("Database connection failed:", error.message);
});
