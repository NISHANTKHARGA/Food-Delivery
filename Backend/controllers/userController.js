import crypto from "node:crypto";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";

const BCRYPT_ROUNDS = 12;
// bcrypt silently truncates anything past 72 bytes, so reject longer inputs.
const MAX_PASSWORD_LENGTH = 72;
const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 60;

// Used to keep login timing roughly constant when the account does not exist,
// which makes user enumeration via response-time analysis harder.
let dummyHashPromise = null;
const burnCompareTime = async (password) => {
    if (!dummyHashPromise) {
        dummyHashPromise = bcrypt.hash("not-a-real-password", BCRYPT_ROUNDS);
    }
    const hash = await dummyHashPromise;
    await bcrypt.compare(password, hash);
};

const createToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

const createAdminToken = () =>
    jwt.sign({ id: "admin", isAdmin: true }, process.env.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "12h",
    });

const asString = (value) => (typeof value === "string" ? value : "");
const cleanName = (value) =>
    asString(value)
        .trim()
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .slice(0, MAX_NAME_LENGTH);

const safeEqual = (a, b) => {
    const hashA = crypto.createHash("sha256").update(String(a)).digest();
    const hashB = crypto.createHash("sha256").update(String(b)).digest();
    return crypto.timingSafeEqual(hashA, hashB);
};

//login user
const loginUser = async (req, res) => {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const normalisedEmail = email.trim().toLowerCase();

    if (
        !validator.isEmail(normalisedEmail) ||
        password.length === 0 ||
        password.length > MAX_PASSWORD_LENGTH
    ) {
        return res.status(401).json({ success: false, message: "Invalid Credentials" });
    }

    try {
        const user = await userModel.findOne({ email: normalisedEmail }).select("+password");

        if (!user) {
            // Generic message avoids revealing whether an account exists.
            await burnCompareTime(password);
            return res.status(401).json({ success: false, message: "Invalid Credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid Credentials" });
        }

        const token = createToken(user._id);
        return res.json({ success: true, token });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

//register user
const registerUser = async (req, res) => {
    const { name, password, email } = req.body || {};

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ success: false, message: "Name, email and password are required" });
    }

    const normalisedEmail = email.trim().toLowerCase();
    const displayName = cleanName(name);

    try {
        if (displayName.length < 2) {
            return res.status(400).json({ success: false, message: "Please enter a valid name" });
        }
        if (!validator.isEmail(normalisedEmail)) {
            return res.status(400).json({ success: false, message: "Please Enter a valid E-mail" });
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ success: false, message: "Please enter a strong password" });
        }
        if (password.length > MAX_PASSWORD_LENGTH) {
            return res.status(400).json({ success: false, message: "Password is too long" });
        }

        //checking user exists or not
        const exists = await userModel.findOne({ email: normalisedEmail }).lean();
        if (exists) {
            return res.status(409).json({ success: false, message: "User already exists" });
        }

        //hashing user password
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const newUser = new userModel({
            name: displayName,
            email: normalisedEmail,
            password: hashedPassword,
        });

        const user = await newUser.save();
        const token = createToken(user._id);
        return res.json({ success: true, token });
    } catch (error) {
        // Duplicate key can still happen under a race between check and insert.
        if (error?.code === 11000) {
            return res.status(409).json({ success: false, message: "User already exists" });
        }
        console.error(error);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

//admin login (credentials come from the environment, never hardcoded)
const adminLogin = async (req, res) => {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        return res.status(503).json({ success: false, message: "Admin login is not configured" });
    }

    const emailMatches = safeEqual(email.trim().toLowerCase(), adminEmail.trim().toLowerCase());
    const passwordMatches = safeEqual(password, adminPassword);

    if (!emailMatches || !passwordMatches) {
        return res.status(401).json({ success: false, message: "Invalid Credentials" });
    }

    return res.json({ success: true, token: createAdminToken() });
};

export { loginUser, registerUser, adminLogin };
