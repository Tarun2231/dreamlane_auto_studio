const path = require("path");
const fs = require("fs");
const multer = require("multer");

const UPLOAD_ROOT = process.env.VERCEL
  ? path.join("/tmp", "uploads", "public")
  : path.join(__dirname, "..", "..", "uploads", "public");

function ensureDirs() {
  for (const d of ["service-images", "shop-products"]) {
    try {
      fs.mkdirSync(path.join(UPLOAD_ROOT, d), { recursive: true });
    } catch (e) {
      console.error("localImageUpload ensureDirs failed:", e);
    }
  }
}
ensureDirs();

const limits = { fileSize: 5 * 1024 * 1024 };
function imageFileFilter(req, file, cb) {
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype)) {
    return cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed."));
  }
  cb(null, true);
}

function diskStorage(subfolder) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_ROOT, subfolder)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const allowed = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
      const e = allowed.has(ext) ? ext : ".jpg";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${e}`);
    },
  });
}

function makeLocalUpload(subfolder) {
  return multer({
    storage: diskStorage(subfolder),
    limits,
    fileFilter: imageFileFilter,
  });
}

const localServiceImage = makeLocalUpload("service-images");
const localShopProductImage = makeLocalUpload("shop-products");

/** Public URL path (served by Express at GET /api/uploads/...). */
function publicImageUrl(subfolder, filename) {
  return `/api/uploads/${subfolder}/${filename}`;
}

module.exports = {
  UPLOAD_ROOT,
  localServiceImage,
  localShopProductImage,
  publicImageUrl,
};
