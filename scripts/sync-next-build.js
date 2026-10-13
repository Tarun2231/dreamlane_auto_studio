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

function findNftFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findNftFiles(full));
    } else if (entry.name.endsWith(".nft.json")) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Next.js NFT (Node File Tracing) computes relative file paths based on frontend/.next location.
 * When synced to the repository root .next for Vercel, paths like ../../../../node_modules/...
 * or ../../../../backend/... now resolve relative to root/.next rather than frontend/.next.
 * This function remaps all relative paths so they resolve to actual files on disk and drops
 * any non-existent references that would cause Vercel deployment lstat ENOENT failures.
 */
function remapNftFiles(frontendNext, rootNext) {
  const nftFiles = findNftFiles(rootNext);
  let updatedCount = 0;
  for (const nft of nftFiles) {
    const dir = path.dirname(nft);
    const relFromRootNext = path.relative(rootNext, dir);
    const origDir = path.join(frontendNext, relFromRootNext);

    let data;
    try {
      data = JSON.parse(fs.readFileSync(nft, "utf8"));
    } catch {
      continue;
    }

    if (!Array.isArray(data.files)) continue;

    const newFiles = [];
    const seen = new Set();

    for (const rel of data.files) {
      // 1. Resolve relative to the original build directory in frontend/.next
      const targetFromOrig = path.resolve(origDir, rel);
      if (fs.existsSync(targetFromOrig)) {
        const newRel = path.relative(dir, targetFromOrig).replace(/\\/g, "/");
        if (!seen.has(newRel)) {
          seen.add(newRel);
          newFiles.push(newRel);
        }
        continue;
      }

      // 2. Resolve relative to current directory in root .next
      const targetFromCurrent = path.resolve(dir, rel);
      if (fs.existsSync(targetFromCurrent)) {
        const norm = rel.replace(/\\/g, "/");
        if (!seen.has(norm)) {
          seen.add(norm);
          newFiles.push(norm);
        }
        continue;
      }

      // 3. Drop non-existent file references to prevent Vercel lstat ENOENT errors
    }

    data.files = newFiles;
    fs.writeFileSync(nft, JSON.stringify(data), "utf8");
    updatedCount++;
  }
  console.log(`[build] Remapped ${updatedCount} .nft.json files for root .next deployment.`);
}

const rootDir = path.join(__dirname, "..");
const frontendNext = path.join(rootDir, "frontend", ".next");
const rootNext = path.join(rootDir, ".next");
const frontendBackend = path.join(rootDir, "frontend", "backend");
const rootBackend = path.join(rootDir, "backend");

if (fs.existsSync(frontendNext)) {
  copyDir(frontendNext, rootNext);
  console.log("[build] Synced frontend/.next to .next for Vercel deployment.");
  remapNftFiles(frontendNext, rootNext);
}

// Ensure backend is also available at root if referenced
if (!fs.existsSync(rootBackend) && fs.existsSync(frontendBackend)) {
  try {
    fs.symlinkSync(frontendBackend, rootBackend, "junction");
    console.log("[build] Created backend junction at root.");
  } catch {
    try {
      fs.symlinkSync("frontend/backend", rootBackend);
      console.log("[build] Created backend symlink at root.");
    } catch {
      // ignore
    }
  }
}
