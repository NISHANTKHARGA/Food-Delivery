import jwt from "jsonwebtoken";

const unauthorized = (res, message = "Not Authorized! Login Again") =>
    res.status(401).json({ success: false, message });

/**
 * Accepts either the legacy `token` header or a standard
 * `Authorization: Bearer <token>` header.
 */
const getToken = (req) => {
    const raw = req.headers.token || req.headers.authorization;
    if (typeof raw !== "string") return null;
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
    const trimmed = token.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const verifyToken = (token) =>
    jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

/**
 * Authenticates a customer. On success the (trusted) user id is placed on
 * req.userId and overwrites any client-supplied userId, preventing
 * horizontal privilege escalation / cart hijacking.
 */
const authMiddleware = (req, res, next) => {
    const token = getToken(req);
    if (!token) {
        return unauthorized(res);
    }

    try {
        const decoded = verifyToken(token);
        if (!decoded?.id || decoded.isAdmin) {
            return unauthorized(res);
        }

        req.userId = decoded.id;
        req.body = req.body && typeof req.body === "object" ? req.body : {};
        req.body.userId = decoded.id;
        return next();
    } catch {
        return unauthorized(res);
    }
};

/**
 * Authenticates an administrator. Only tokens issued by the admin login
 * endpoint (which carry isAdmin: true) are accepted.
 */
export const adminMiddleware = (req, res, next) => {
    const token = getToken(req);
    if (!token) {
        return unauthorized(res);
    }

    try {
        const decoded = verifyToken(token);
        if (decoded?.isAdmin !== true) {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }

        req.isAdmin = true;
        return next();
    } catch {
        return unauthorized(res);
    }
};

export default authMiddleware;
