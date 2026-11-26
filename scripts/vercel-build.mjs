import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const run = (args, cwd) => {
    const command = [npm, ...args].join(" ");
    console.log(`\n> ${command} (${path.relative(root, cwd) || "."})`);
    execSync(command, { cwd, stdio: "inherit", shell: true });
};

const copyDir = (src, dest) => {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(from, to);
        } else {
            fs.copyFileSync(from, to);
        }
    }
};

console.log("Building the Vercel deployment bundle...");

for (const folder of ["Backend", "Frontend", "Admin"]) {
    run(["ci"], path.join(root, folder));
}

run(["run", "build"], path.join(root, "Frontend"));
run(["run", "build"], path.join(root, "Admin"));

const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

copyDir(path.join(root, "Frontend", "dist"), dist);
copyDir(path.join(root, "Admin", "dist"), path.join(dist, "admin"));
copyDir(path.join(root, "Backend", "seed-images"), path.join(dist, "images"));

console.log("\nVercel bundle ready in dist/ (storefront, /admin/ and /images/).");
