const fs = require("fs");
const path = require("path");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const frontendNext = path.join(__dirname, "..", "frontend", ".next");
const rootNext = path.join(__dirname, "..", ".next");

if (fs.existsSync(frontendNext)) {
  copyDir(frontendNext, rootNext);
  console.log("[build] Synced frontend/.next to .next for Vercel deployment.");
}
