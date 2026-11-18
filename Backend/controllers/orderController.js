import mongoose from "mongoose";
import validator from "validator";
import Stripe from "stripe";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import foodModel from "../models/foodModel.js";

const DELIVERY_FEE = 2;
const CURRENCY = "inr";
// Existing pricing convention in this project: displayed prices are
// multiplied by 80 when sent to Stripe in INR.
const INR_UNIT_MULTIPLIER = 80;
const MAX_CART_ITEMS = 50;
const MAX_ITEM_QUANTITY = 20;
const ORDER_STATUSES = new Set(["Food Processing", "Out for delivery", "Delivered"]);

// Lazily construct the Stripe client so that a missing key produces a clear
// error at request time instead of crashing the whole server at import time.
let stripeClient = null;
const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    if (!stripeClient) {
        stripeClient = new Stripe(key);
    }
    return stripeClient;
};

const isValidId = (id) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
const roundMoney = (value) => Math.round(value * 100) / 100;

const ADDRESS_FIELDS = {
    firstName: 60,
    lastName: 60,
    email: 254,
    street: 120,
    city: 60,
    state: 60,
    zipcode: 12,
    country: 60,
    phone: 20,
};
const REQUIRED_ADDRESS_FIELDS = Object.keys(ADDRESS_FIELDS);

const sanitizeAddress = (rawAddress) => {
    if (!rawAddress || typeof rawAddress !== "object" || Array.isArray(rawAddress)) {
        return null;
    }

    const address = {};
    for (const [field, maxLength] of Object.entries(ADDRESS_FIELDS)) {
        const value = rawAddress[field];
        if (typeof value !== "string") {
            address[field] = "";
            continue;
        }
        address[field] = value.trim().slice(0, maxLength);
    }

    const missing = REQUIRED_ADDRESS_FIELDS.filter((field) => address[field].length === 0);
    if (missing.length > 0) return null;
    if (!validator.isEmail(address.email)) return null;
    if (!/^[0-9+\-()\s]{7,20}$/.test(address.phone)) return null;

    return address;
};

/**
 * Rebuilds the order from trusted data in MongoDB. Prices, names and totals
 * sent by the browser are ignored, which prevents price tampering.
 */
const buildOrderItems = async (rawItems) => {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return { error: "Your cart is empty" };
    }
    if (rawItems.length > MAX_CART_ITEMS) {
        return { error: "Too many different items in the cart" };
    }

    const quantities = new Map();

    for (const rawItem of rawItems) {
        const id =
            typeof rawItem === "string"
                ? rawItem
                : rawItem && typeof rawItem === "object"
                  ? rawItem.id ?? rawItem._id
                  : null;

        if (!isValidId(id)) {
            return { error: "Invalid item in cart" };
        }

        const quantity = Number(rawItem && typeof rawItem === "object" ? rawItem.quantity : 1);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
            return { error: "Invalid item quantity" };
        }

        quantities.set(id, Math.min((quantities.get(id) || 0) + quantity, MAX_ITEM_QUANTITY));
    }

    const foods = await foodModel.find({ _id: { $in: [...quantities.keys()] } }).lean();
    if (foods.length !== quantities.size) {
        return { error: "Some items are no longer available" };
    }

    const items = foods.map((food) => ({
        id: String(food._id),
        name: food.name,
        price: food.price,
        image: food.image,
        quantity: quantities.get(String(food._id)),
    }));

    if (items.some((item) => !Number.isFinite(item.price) || item.price < 0)) {
        return { error: "Some items have an invalid price" };
    }

    return { items };
};

// placing user order from frontend
const placeOrder = async (req, res) => {
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

    try {
        const address = sanitizeAddress(req.body?.address);
        if (!address) {
            return res.status(400).json({ success: false, message: "Please provide a valid delivery address" });
        }

        const { items, error } = await buildOrderItems(req.body?.items);
        if (error) {
            return res.status(400).json({ success: false, message: error });
        }

        const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
        // The client-supplied amount is intentionally ignored.
        const amount = roundMoney(subtotal + DELIVERY_FEE);

        const newOrder = new orderModel({
            userId: req.userId,
            items,
            amount,
            address,
        });
        await newOrder.save();

        const stripe = getStripe();
        if (!stripe) {
            await orderModel.findByIdAndDelete(newOrder._id);
            return res.status(503).json({ success: false, message: "Payments are not configured" });
        }

        const lineItems = items.map((item) => ({
            price_data: {
                currency: CURRENCY,
                product_data: {
                    name: String(item.name).slice(0, 250),
                },
                unit_amount: Math.round(item.price * 100 * INR_UNIT_MULTIPLIER),
            },
            quantity: item.quantity,
        }));

        lineItems.push({
            price_data: {
                currency: CURRENCY,
                product_data: {
                    name: "Delivery Charges",
                },
                unit_amount: Math.round(DELIVERY_FEE * 100 * INR_UNIT_MULTIPLIER),
            },
            quantity: 1,
        });

        let session;
        try {
            session = await stripe.checkout.sessions.create({
                line_items: lineItems,
                mode: "payment",
                client_reference_id: String(newOrder._id),
                metadata: {
                    orderId: String(newOrder._id),
                    userId: String(req.userId),
                },
                success_url: `${frontendUrl}/verify?success=true&orderId=${newOrder._id}`,
                cancel_url: `${frontendUrl}/verify?success=false&orderId=${newOrder._id}`,
            });
        } catch (stripeError) {
            // Do not leave an orphaned unpaid order behind if Stripe fails.
            await orderModel.findByIdAndDelete(newOrder._id);
            throw stripeError;
        }

        // Persist the session id so payment can be verified against Stripe.
        newOrder.sessionId = session.id;
        await newOrder.save();

        // Only empty the cart once checkout was created successfully.
        await userModel.findByIdAndUpdate(req.userId, { cartData: {} });

        return res.json({ success: true, session_url: session.url });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

/**
 * Confirms payment by asking Stripe directly instead of trusting the
 * success=true query string supplied by the browser.
 */
const verifyOrder = async (req, res) => {
    const { orderId, success } = req.body || {};

    if (!isValidId(orderId)) {
        return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    try {
        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Prevent one customer from touching another customer's order.
        if (String(order.userId) !== String(req.userId)) {
            return res.status(403).json({ success: false, message: "Not allowed" });
        }

        if (order.payment) {
            return res.json({ success: true, message: "Paid" });
        }

        if (!order.sessionId) {
            return res.status(400).json({ success: false, message: "Payment session not found" });
        }

        const stripe = getStripe();
        if (!stripe) {
            return res.status(503).json({ success: false, message: "Payments are not configured" });
        }

        const session = await stripe.checkout.sessions.retrieve(order.sessionId);
        const isPaid =
            session.payment_status === "paid" &&
            session.metadata?.orderId === String(order._id) &&
            session.metadata?.userId === String(req.userId);

        if (isPaid) {
            order.payment = true;
            order.paymentStatus = session.payment_status;
            await order.save();
            return res.json({ success: true, message: "Paid" });
        }

        // Only remove an unpaid order when the customer explicitly cancelled.
        const cancelled = success === "false" || success === false;
        if (cancelled && session.payment_status !== "paid") {
            await orderModel.findByIdAndDelete(order._id);
            return res.json({ success: false, message: "Not Paid" });
        }

        return res.json({ success: false, message: "Payment not completed" });
    } catch (error) {
        console.error(error);
        return res.status(502).json({ success: false, message: "Could not verify payment" });
    }
};

// user orders for frontend
const userOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({ userId: req.userId });
        return res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

// Listing orders for admin panel
const listOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        return res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

// api for updating order status
const updateStatus = async (req, res) => {
    const { orderId, status } = req.body || {};

    if (!isValidId(orderId)) {
        return res.status(400).json({ success: false, message: "Invalid order id" });
    }
    if (typeof status !== "string" || !ORDER_STATUSES.has(status)) {
        return res.status(400).json({ success: false, message: "Invalid order status" });
    }

    try {
        const updated = await orderModel.findByIdAndUpdate(orderId, { status }, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        return res.json({ success: true, message: "Status Updated" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus };
