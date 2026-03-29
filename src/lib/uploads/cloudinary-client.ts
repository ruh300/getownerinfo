import type { ListingMedia, OwnershipProofAsset } from "@/lib/domain";

export type UploadAssetKind = "listing-image" | "ownership-proof";

type SignedUploadPayload = {
  status: "ok";
  assetKind: UploadAssetKind;
  upload: {
    apiKey: string;
    cloudName: string;
    deliveryType: "upload" | "authenticated";
    folder: string;
    allowedFormats: string[];
    allowedMimeTypes: string[];
    maxFileSizeBytes: number;
    publicId: string;
    resourceType: "auto";
    signature: string;
    tags: string[];
    timestamp: number;
    uploadUrl: string;
  };
};

type CloudinaryUploadResponse = {
  asset_id: string;
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  resource_type?: string;
  original_filename?: string;
};

async function requestSignedUpload(file: File, assetKind: UploadAssetKind) {
  const response = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assetKind,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });

  const payload = (await response.json()) as SignedUploadPayload & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message || "Could not prepare upload.");
  }

  return payload.upload;
}

function normalizeFilename(file: File, response: CloudinaryUploadResponse) {
  return response.original_filename ? `${response.original_filename}${file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ""}` : file.name;
}

export async function uploadListingImage(file: File): Promise<ListingMedia> {
  const upload = await requestSignedUpload(file, "listing-image");

  if (!upload.allowedMimeTypes.includes(file.type)) {
    throw new Error("Unsupported image format. Use JPG, PNG, or WEBP.");
  }

  if (file.size > upload.maxFileSizeBytes) {
    throw new Error("Listing images must be 5MB or smaller.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", upload.apiKey);
  formData.append("timestamp", String(upload.timestamp));
  formData.append("signature", upload.signature);
  formData.append("folder", upload.folder);
  formData.append("public_id", upload.publicId);
  formData.append("type", upload.deliveryType);
  formData.append("overwrite", "false");
  formData.append("unique_filename", "false");
  formData.append("use_filename", "false");
  formData.append("allowed_formats", upload.allowedFormats.join(","));
  formData.append("tags", upload.tags.join(","));

  const response = await fetch(upload.uploadUrl, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as CloudinaryUploadResponse & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Cloudinary upload failed.");
  }

  return {
    assetId: payload.asset_id,
    publicId: payload.public_id,
    url: payload.secure_url,
    originalFilename: normalizeFilename(file, payload),
    bytes: payload.bytes,
    format: payload.format,
    resourceType: payload.resource_type,
    width: payload.width,
    height: payload.height,
    isCover: false,
  };
}

export async function uploadOwnershipProof(file: File): Promise<OwnershipProofAsset> {
  const upload = await requestSignedUpload(file, "ownership-proof");

  if (!upload.allowedMimeTypes.includes(file.type)) {
    throw new Error("Ownership proof must be JPG, PNG, or PDF.");
  }

  if (file.size > upload.maxFileSizeBytes) {
    throw new Error("Ownership proof files must be 10MB or smaller.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", upload.apiKey);
  formData.append("timestamp", String(upload.timestamp));
  formData.append("signature", upload.signature);
  formData.append("folder", upload.folder);
  formData.append("public_id", upload.publicId);
  formData.append("type", upload.deliveryType);
  formData.append("overwrite", "false");
  formData.append("unique_filename", "false");
  formData.append("use_filename", "false");
  formData.append("allowed_formats", upload.allowedFormats.join(","));
  formData.append("tags", upload.tags.join(","));

  const response = await fetch(upload.uploadUrl, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as CloudinaryUploadResponse & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Ownership proof upload failed.");
  }

  return {
    assetId: payload.asset_id,
    publicId: payload.public_id,
    url: payload.secure_url,
    originalFilename: normalizeFilename(file, payload),
    bytes: payload.bytes,
    format: payload.format,
    resourceType: payload.resource_type,
    deliveryType: "authenticated",
  };
}
