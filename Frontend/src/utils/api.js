import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/+$/, "");

export const getErrorMessage = (error, fallback = "Something went wrong") => {
    const message = error?.response?.data?.message;
    if (typeof message === "string" && message.trim().length > 0) {
        return message;
    }
    if (error?.code === "ERR_NETWORK") {
        return "Cannot reach the server. Please try again.";
    }
    return fallback;
};

export const isUnauthorized = (error) => error?.response?.status === 401;

export default axios;
