import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import express from "express";
import multer from "multer";
import { addFood, listFood, removeFood } from "../controllers/foodController.js";
import { adminMiddleware } from "../middleware/auth.js";

const foodRouter = express.Router();
const UPLOADS_DIR = path.resolve("uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Only allow genuine raster images, and derive the extension from the MIME
// type instead of trusting the client-supplied filename.
const ALLOWED_IMAGE_TYPES = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
]);

//img storage engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const extension = ALLOWED_IMAGE_TYPES.get(file.mimetype) || ".img";
        cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1,
        fields: 20,
    },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
            const error = new Error("Only JPG, PNG, WEBP or GIF images are allowed");
            error.status = 400;
            return cb(error);
        }
        return cb(null, true);
    },
});

// Admin-only mutations. The read endpoint stays public for the storefront.
foodRouter.post("/add", adminMiddleware, upload.single("image"), addFood);
foodRouter.get("/list", listFood);
foodRouter.post("/remove", adminMiddleware, removeFood);

export default foodRouter;
