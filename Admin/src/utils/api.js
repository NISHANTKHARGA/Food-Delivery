import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/+$/, "");

const ADMIN_TOKEN_KEY = "adminToken";

export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY) || "";

export const saveAdminToken = (token) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const clearAdminToken = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
};

export const applyAdminToken = (token) => {
    axios.defaults.headers.common.token = token || "";
};

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

let unauthorizedHandler = null;

// Lets the app drop an expired/invalid admin session from anywhere.
export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = handler;
};

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401 && typeof unauthorizedHandler === "function") {
            unauthorizedHandler();
        }
        return Promise.reject(error);
    }
);

export default axios;
