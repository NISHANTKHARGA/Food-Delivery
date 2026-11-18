import mongoose from "mongoose";

const foodSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true, trim: true, maxlength: 255 },
    category: {
        type: String,
        required: true,
        trim: true,
        enum: ["Salad", "Rolls", "Deserts", "Sandwich", "Cake", "Pure Veg", "Pasta", "Noodels"],
    },
});

const foodModel = mongoose.models.food || mongoose.model("food", foodSchema);

export default foodModel;
