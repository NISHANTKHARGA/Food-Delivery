import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        image: { type: String, default: "" },
        quantity: { type: Number, required: true, min: 1 },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    items: {
        type: [orderItemSchema],
        required: true,
        validate: {
            validator: (items) => Array.isArray(items) && items.length > 0,
            message: "An order must contain at least one item",
        },
    },
    amount: { type: Number, required: true, min: 0 },
    address: { type: Object, required: true },
    status: { type: String, default: "Food Processing" },
    // Use a function so the date is evaluated when the document is created,
    // not once at module load.
    date: { type: Date, default: () => Date.now() },
    payment: { type: Boolean, default: false },
    paymentStatus: { type: String, default: "unpaid" },
    sessionId: { type: String, default: "" },
});

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;
