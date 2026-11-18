import mongoose from "mongoose";

export const connectDB = async () => {
  await mongoose
    .connect(
      "mongodb+srv://Rajalbert302_db_user:jyI7gH5b2rldISWW@cluster0.oj3ymqx.mongodb.net/Food-Delivery-App"
    )
    .then(() => console.log("DB Connected"));
};
