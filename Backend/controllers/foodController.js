import path from "node:path";
import fs from "node:fs/promises";
import mongoose from "mongoose";
import foodModel from "../models/foodModel.js";
import { UPLOADS_DIR } from "../config/uploads.js";
const CATEGORIES = new Set([
    "Salad",
    "Rolls",
    "Deserts",
    "Sandwich",
    "Cake",
    "Pure Veg",
    "Pasta",
    "Noodels",
]);
const MAX_NAME = 100;
const MAX_DESCRIPTION = 1000;
const MAX_PRICE = 1_000_000;

const cleanupFile = async (file) => {
    if (!file?.path) return;
    try {
        await fs.unlink(file.path);
    } catch {
        // Best effort cleanup only.
    }
};

const removeUploadedImage = async (imageName) => {
    if (typeof imageName !== "string" || imageName.length === 0) return;

    // Never trust the stored value as a path: resolve it inside uploads/ and
    // refuse anything that escapes the directory.
    const safeName = path.basename(imageName);
    const target = path.resolve(UPLOADS_DIR, safeName);
    if (!target.startsWith(`${UPLOADS_DIR}${path.sep}`)) return;

    try {
        await fs.unlink(target);
    } catch {
        // Missing file is fine.
    }
};

//add food item
const addFood = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "An image is required" });
    }

    const { name, description, price, category } = req.body || {};

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanDescription = typeof description === "string" ? description.trim() : "";
    const cleanCategory = typeof category === "string" ? category.trim() : "";
    const numericPrice = Number(price);

    const isValid =
        cleanName.length > 0 &&
        cleanName.length <= MAX_NAME &&
        cleanDescription.length > 0 &&
        cleanDescription.length <= MAX_DESCRIPTION &&
        CATEGORIES.has(cleanCategory) &&
        Number.isFinite(numericPrice) &&
        numericPrice >= 0 &&
        numericPrice <= MAX_PRICE;

    if (!isValid) {
        await cleanupFile(req.file);
        return res.status(400).json({ success: false, message: "Please provide valid food details" });
    }

    const food = new foodModel({
        name: cleanName,
        description: cleanDescription,
        price: numericPrice,
        category: cleanCategory,
        image: req.file.filename,
    });

    try {
        await food.save();
        return res.json({ success: true, message: "Food Added" });
    } catch (error) {
        await cleanupFile(req.file);
        console.error(error);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

//all food list

const listFood = async (req, res) => {
    try {
        const foods = await foodModel.find({});
        return res.json({ success: true, data: foods });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

//remove food item
const removeFood = async (req, res) => {
    const { id } = req.body || {};

    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid food id" });
    }

    try {
        const food = await foodModel.findById(id);
        if (!food) {
            return res.status(404).json({ success: false, message: "Food not found" });
        }

        await removeUploadedImage(food.image);
        await foodModel.findByIdAndDelete(id);

        return res.json({ success: true, message: "Food Removed" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

export { addFood, listFood, removeFood };
