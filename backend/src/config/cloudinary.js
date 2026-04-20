const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder: "car-service-inspections",
    public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
  }),
});

/** Service catalog images (admin Services page). */
const serviceImageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const base = String(file.originalname || "image").replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-").slice(0, 48);
    return {
      folder: "car-service-services",
      public_id: `svc-${Date.now()}-${base || "image"}`,
    };
  },
});

/** Shop product images (admin Shop products page). */
const shopProductImageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const base = String(file.originalname || "image").replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-").slice(0, 48);
    return {
      folder: "car-service-shop-products",
      public_id: `shop-${Date.now()}-${base || "image"}`,
    };
  },
});

/** True when real Cloudinary credentials are set (not empty, not .env.example placeholders). */
function isCloudinaryConfigured() {
  const name = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const key = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const secret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  if (!name || !key || !secret) return false;
  const bad = (s) =>
    /your-cloudinary/i.test(s) ||
    /^changeme$/i.test(s) ||
    /^xxx$/i.test(s) ||
    /^example$/i.test(s);
  if (bad(name) || bad(key) || bad(secret)) return false;
  return true;
}

module.exports = {
  cloudinary,
  storage,
  serviceImageStorage,
  shopProductImageStorage,
  isCloudinaryConfigured,
};
