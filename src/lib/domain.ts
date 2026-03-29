import type { ObjectId } from "mongodb";

export const userRoles = ["buyer", "owner", "admin", "manager"] as const;
export type UserRole = (typeof userRoles)[number];

export const ownerTypes = ["owner", "manager", "third_party"] as const;
export type OwnerType = (typeof ownerTypes)[number];

export const listingModels = ["A", "B"] as const;
export type ListingModel = (typeof listingModels)[number];

export const listingCategories = [
  "real_estate_rent",
  "real_estate_sale",
  "vehicles_for_sale",
  "vehicle_resellers",
  "furniture",
  "made_in_rwanda",
  "home_appliances",
  "business_industry",
] as const;
export type ListingCategory = (typeof listingCategories)[number];

export const listingStatuses = [
  "draft",
  "pending_approval",
  "active",
  "expired",
  "under_negotiation",
  "sold",
  "rented",
  "not_concluded",
  "rejected",
] as const;
export type ListingStatus = (typeof listingStatuses)[number];

export const verificationStatuses = ["pending", "approved", "rejected"] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

export type TimestampFields = {
  createdAt: Date;
  updatedAt: Date;
};

export type BaseDocument = TimestampFields & {
  _id?: ObjectId;
};

export type ListingMedia = {
  assetId: string;
  publicId: string;
  url: string;
  originalFilename: string;
  bytes?: number;
  format?: string;
  resourceType?: string;
  width?: number;
  height?: number;
  alt?: string;
  isCover: boolean;
};

export type OwnershipProofAsset = {
  assetId: string;
  publicId: string;
  url: string;
  originalFilename: string;
  bytes?: number;
  format?: string;
  resourceType?: string;
  deliveryType: "authenticated";
};

export type ListingLocation = {
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  upiNumber?: string;
  streetAddress?: string;
  houseNumber?: string;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  approximateAreaLabel: string;
};

export type ListingEligibilitySnapshot = {
  eligibleForModelA: boolean;
  forcedModelB: boolean;
  thresholdRwf: number | null;
  reasons: string[];
  selectedModel: ListingModel;
};

export type DraftOwnerContact = {
  fullName: string;
  phone: string;
  email?: string;
};

export type UserDocument = BaseDocument & {
  role: UserRole;
  fullName: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  status: "active" | "pending" | "suspended";
  lastLoginAt?: Date;
};

export type ListingDocument = BaseDocument & {
  ownerUserId: ObjectId;
  ownerContact: DraftOwnerContact;
  ownerType: OwnerType;
  category: ListingCategory;
  title: string;
  description: string;
  priceRwf: number;
  units: number;
  model: ListingModel;
  status: ListingStatus;
  tokenFeeEnabled: boolean;
  tokenFeeRwf?: number;
  durationMonths?: number;
  location: ListingLocation;
  media: ListingMedia[];
  ownershipProof?: OwnershipProofAsset;
  features: string[];
  eligibility: ListingEligibilitySnapshot;
  verificationStatus: VerificationStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedByUserId?: ObjectId;
  reviewNote?: string;
  activatedAt?: Date;
  rejectedAt?: Date;
};

export type ListingDraftDocument = BaseDocument & {
  ownerUserId: ObjectId;
  status: "draft";
  ownerType: OwnerType;
  ownerContact: DraftOwnerContact;
  category: ListingCategory;
  title: string;
  description: string;
  priceRwf: number;
  units: number;
  requestedModel: ListingModel | null;
  durationMonths: 1 | 2 | 3 | 6 | 12;
  tokenFeeEnabled: boolean;
  location: ListingLocation;
  media: ListingMedia[];
  ownershipProof?: OwnershipProofAsset;
  features: string[];
  eligibility: ListingEligibilitySnapshot;
  submittedListingId?: ObjectId;
  submittedAt?: Date;
};

export type PaymentDocument = BaseDocument & {
  userId: ObjectId;
  listingId?: ObjectId;
  amountRwf: number;
  currency: "RWF";
  provider: "afripay";
  purpose: "listing_fee" | "token_fee" | "commission" | "penalty";
  status: "pending" | "paid" | "failed" | "cancelled";
  reference: string;
};

export type TokenUnlockDocument = BaseDocument & {
  userId: ObjectId;
  listingId: ObjectId;
  unlockedAt: Date;
  fieldsUnlocked: Array<"ownerName" | "ownerPhone" | "address" | "keysManager">;
  sessionId?: string;
};

export type AuditLogDocument = BaseDocument & {
  actorUserId?: ObjectId;
  entityType: "listing" | "payment" | "token_unlock" | "penalty" | "user";
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
};
