import { v2 as cloudinary } from "cloudinary";

import { env } from "@/lib/env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export const cloudinaryFolders = {
  listingImages: "getownerinfo/listing-images",
  ownershipProofs: "getownerinfo/ownership-proofs",
} as const;

export type CloudinaryFolderKey = keyof typeof cloudinaryFolders;
export type UploadAssetKind = "listing-image" | "ownership-proof";

export function getCloudinaryFolder(key: CloudinaryFolderKey) {
  return cloudinaryFolders[key];
}

const uploadConfigByAssetKind = {
  "listing-image": {
    folder: cloudinaryFolders.listingImages,
    deliveryType: "upload",
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    tags: ["getownerinfo", "listing-image"],
  },
  "ownership-proof": {
    folder: cloudinaryFolders.ownershipProofs,
    deliveryType: "authenticated",
    maxFileSizeBytes: 10 * 1024 * 1024,
    allowedFormats: ["jpg", "jpeg", "png", "pdf"],
    allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    tags: ["getownerinfo", "ownership-proof"],
  },
} as const;

export function getCloudinaryUploadConfig(assetKind: UploadAssetKind) {
  return uploadConfigByAssetKind[assetKind];
}

function slugifyFilename(filename: string) {
  return filename
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function createSignedUploadParams(assetKind: UploadAssetKind, originalFilename: string) {
  const config = getCloudinaryUploadConfig(assetKind);
  const timestamp = Math.floor(Date.now() / 1000);
  const safeName = slugifyFilename(originalFilename) || assetKind;
  const publicId = `${safeName}-${timestamp}`;

  const paramsToSign = {
    allowed_formats: config.allowedFormats.join(","),
    folder: config.folder,
    overwrite: "false",
    public_id: publicId,
    tags: config.tags.join(","),
    timestamp,
    type: config.deliveryType,
    unique_filename: "false",
    use_filename: "false",
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return {
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    deliveryType: config.deliveryType,
    folder: config.folder,
    allowedFormats: config.allowedFormats,
    allowedMimeTypes: config.allowedMimeTypes,
    maxFileSizeBytes: config.maxFileSizeBytes,
    publicId,
    resourceType: "auto",
    signature,
    tags: config.tags,
    timestamp,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
  };
}
