// Vercel catch-all API function: forwards /api/* to the Express application.
// The Express app owns routing, auth, Stripe checkout and image uploads.
import app from "../Backend/server.js";

export default function handler(req, res) {
    return app(req, res);
}
