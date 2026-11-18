import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: 254,
        },
        password: {
            type: String,
            required: true,
            // Never return the hash by accident: queries must opt in with +password.
            select: false,
        },
        cartData: { type: Object, default: {} },
    },
    { minimize: false } //if not false it will not create cart data with default value
);

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
