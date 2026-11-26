// Seeds the shared menu with a small starter catalog.
// Run from Backend/:  node scripts/seed-menu.js
// Image files live in Backend/seed-images/ and are copied into uploads/ during deployment.
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import foodModel from "../models/foodModel.js";

const MENU = [
    {
        name: "Garden Fresh Salad",
        description: "Crisp seasonal greens with tomatoes, cucumber and a light dressing.",
        price: 2.5,
        image: "garden-salad.png",
        category: "Salad",
    },
    {
        name: "Classic Veg Burger",
        description: "A juicy veg patty with lettuce, cheese and house sauce.",
        price: 3,
        image: "classic-pizza.png",
        category: "Sandwich",
    },
    {
        name: "Veg Spring Rolls",
        description: "Golden, crunchy rolls filled with spiced vegetables.",
        price: 2,
        image: "veg-spring-rolls.png",
        category: "Rolls",
    },
    {
        name: "Creamy Alfredo Pasta",
        description: "Pasta tossed in a rich, creamy cheese sauce with herbs.",
        price: 3.5,
        image: "creamy-pasta.png",
        category: "Pasta",
    },
    {
        name: "Chocolate Cake",
        description: "Moist chocolate sponge with a smooth cocoa frosting.",
        price: 2.75,
        image: "chocolate-cake.png",
        category: "Cake",
    },
    {
        name: "Hakka Noodles",
        description: "Wok-tossed noodles with fresh vegetables and soy sauce.",
        price: 3.25,
        image: "hakka-noodles.png",
        category: "Noodels",
    },
    {
        name: "Paneer Wrap",
        description: "Soft wrap loaded with spiced paneer, onions and mint chutney.",
        price: 2.25,
        image: "paneer-wrap.png",
        category: "Rolls",
    },
    {
        name: "Veg Thali",
        description: "A complete meal with curries, rice, bread and a sweet.",
        price: 4,
        image: "veg-thali.png",
        category: "Pure Veg",
    },
    {
        name: "Fudge Brownies",
        description: "Warm, fudgy chocolate brownies — perfect with tea or coffee.",
        price: 2.5,
        image: "brownies.png",
        category: "Deserts",
    },
    {
        name: "Vanilla Ice Cream",
        description: "Creamy classic vanilla scoop to finish your meal.",
        price: 1.75,
        image: "ice-cream.jpg",
        category: "Deserts",
    },
];

const seed = async () => {
    await connectDB();

    for (const item of MENU) {
        await foodModel.updateOne({ name: item.name }, { $set: item }, { upsert: true });
    }

    const total = await foodModel.countDocuments();
    console.log(`Menu seeded. ${MENU.length} items upserted, ${total} items in database.`);
    await mongoose.disconnect();
};

seed().catch(async (error) => {
    console.error("Menu seeding failed:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
