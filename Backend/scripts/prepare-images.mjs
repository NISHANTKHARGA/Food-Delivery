import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Local and EC2 deployments serve images from uploads/. Vercel copies these
// same files into dist/images during the build, so keep the local folder in
// sync with the starter menu images checked into the repository.
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = path.join(root, "seed-images");
const target = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(root, "uploads");

if (!fs.existsSync(source)) {
    console.log("No starter image folder found; skipping image preparation.");
    process.exit(0);
}

fs.mkdirSync(target, { recursive: true });

let copied = 0;
for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    fs.copyFileSync(path.join(source, entry.name), path.join(target, entry.name));
    copied += 1;
}

console.log(`Prepared ${copied} starter image(s) in ${target}`);
