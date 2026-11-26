import fs from "node:fs";
import path from "node:path";

// On Vercel the filesystem is read-only outside /tmp, and each invocation may
// run in a fresh container. Local/EC2 deployments keep using ./uploads.
export const UPLOADS_DIR =
    process.env.UPLOADS_DIR || (process.env.VERCEL ? "/tmp/uploads" : path.resolve("uploads"));

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
