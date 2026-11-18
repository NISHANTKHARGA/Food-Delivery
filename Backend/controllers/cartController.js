import mongoose from "mongoose";
import userModel from "../models/userModel.js";
import foodModel from "../models/foodModel.js";

const MAX_QUANTITY = 99;

const isValidId = (id) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

const readCart = async (userId) => {
    const user = await userModel.findById(userId).select("cartData").lean();
    return user ? { ...(user.cartData || {}) } : null;
};

//add items to user cart
const addToCart = async (req, res) => {
    const { itemId } = req.body || {};

    if (!isValidId(itemId)) {
        return res.status(400).json({ success: false, message: "Invalid item id" });
    }

    try {
        const foodExists = await foodModel.exists({ _id: itemId });
        if (!foodExists) {
            return res.status(404).json({ success: false, message: "Food item not found" });
        }

        const cartData = await readCart(req.userId);
        if (!cartData) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const currentQuantity = Number(cartData[itemId]) || 0;
        if (currentQuantity >= MAX_QUANTITY) {
            return res
                .status(400)
                .json({ success: false, message: `You can order at most ${MAX_QUANTITY} of one item` });
        }

        cartData[itemId] = currentQuantity + 1;

        await userModel.findByIdAndUpdate(req.userId, { cartData });
        return res.json({ success: true, message: "Added to cart" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

//remove items from user cart
const removeFromCart = async (req, res) => {
    const { itemId } = req.body || {};

    if (!isValidId(itemId)) {
        return res.status(400).json({ success: false, message: "Invalid item id" });
    }

    try {
        const cartData = await readCart(req.userId);
        if (!cartData) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const currentQuantity = Number(cartData[itemId]) || 0;
        if (currentQuantity > 0) {
            cartData[itemId] = currentQuantity - 1;
        }

        await userModel.findByIdAndUpdate(req.userId, { cartData });
        return res.json({ success: true, message: "Removed from cart" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

// fetch user cart data
const getCart = async (req, res) => {
    try {
        const cartData = await readCart(req.userId);
        if (!cartData) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({ success: true, cartData });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

export { addToCart, removeFromCart, getCart };
