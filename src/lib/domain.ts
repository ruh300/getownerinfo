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

export const seekerRequestStatuses = ["active", "fulfilled", "closed", "expired"] as const;
export type SeekerRequestStatus = (typeof seekerRequestStatuses)[number];

export const seekerRequestDurations = [7, 14, 30] as const;
export type SeekerRequestDurationDays = (typeof seekerRequestDurations)[number];
export type SeekerRequestDurationKey = `${SeekerRequestDurationDays}`;

export const seekerResponseStatuses = ["sent", "withdrawn"] as const;
export type SeekerResponseStatus = (typeof seekerResponseStatuses)[number];

export const paymentProviders = ["afripay"] as const;
export type PaymentProvider = (typeof paymentProviders)[number];

export const paymentPurposes = [
  "listing_fee",
  "token_fee",
  "commission",
  "penalty",
  "seeker_post_fee",
  "seeker_view_token",
] as const;
export type PaymentPurpose = (typeof paymentPurposes)[number];

export const paymentStatuses = ["pending", "paid", "failed", "cancelled"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const commissionCaseStatuses = ["due", "paid", "waived"] as const;
export type CommissionCaseStatus = (typeof commissionCaseStatuses)[number];

export const penaltyStatuses = ["due", "paid", "waived"] as const;
export type PenaltyStatus = (typeof penaltyStatuses)[number];

export const penaltyOffenseTypes = [
  "commission_overdue",
  "commission_misreporting",
  "false_not_concluded",
  "listing_misrepresentation",
  "manual_admin",
] as const;
export type PenaltyOffenseType = (typeof penaltyOffenseTypes)[number];

export const investigationCaseTypes = [
  "document_verification",
  "deal_verification",
  "suspicious_activity",
  "payment_dispute",
  "manual_review",
] as const;
export type InvestigationCaseType = (typeof investigationCaseTypes)[number];

export const investigationCasePriorities = ["low", "medium", "high", "urgent"] as const;
export type InvestigationCasePriority = (typeof investigationCasePriorities)[number];

export const investigationCaseStatuses = ["open", "investigating", "resolved", "dismissed"] as const;
export type InvestigationCaseStatus = (typeof investigationCaseStatuses)[number];

export const investigationUpdateTargets = ["owner", "buyer", "payment_provider", "internal"] as const;
export type InvestigationUpdateTarget = (typeof investigationUpdateTargets)[number];

export const investigationUpdateChannels = [
  "phone",
  "email",
  "whatsapp",
  "document_review",
  "payment_gateway",
  "internal_review",
] as const;
export type InvestigationUpdateChannel = (typeof investigationUpdateChannels)[number];

export const investigationUpdateOutcomes = [
  "pending_response",
  "confirmed",
  "disputed",
  "no_response",
  "needs_follow_up",
  "cleared",
] as const;
export type InvestigationUpdateOutcome = (typeof investigationUpdateOutcomes)[number];

export const rateLimitScopes = ["ip", "session"] as const;
export type RateLimitScope = (typeof rateLimitScopes)[number];

export const notificationKinds = [
  "listing_submitted_for_review",
  "listing_approved",
  "listing_rejected",
  "listing_status_changed",
  "listing_unlocked",
  "buyer_inquiry_received",
  "listing_reply_received",
  "seeker_request_created",
  "seeker_request_unlocked",
  "seeker_response_received",
  "seeker_request_fulfilled",
  "seeker_request_closed",
  "seeker_match_message_received",
  "payment_status_changed",
  "commission_case_created",
  "commission_case_paid",
  "commission_case_waived",
  "penalty_created",
  "penalty_adjusted",
  "penalty_paid",
  "penalty_waived",
] as const;
export type NotificationKind = (typeof notificationKinds)[number];

export const notificationSeverities = ["info", "success", "warning"] as const;
export type NotificationSeverity = (typeof notificationSeverities)[number];

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
  seekerRequestId?: ObjectId;
  amountRwf: number;
  currency: "RWF";
  provider: PaymentProvider;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  reference: string;
  providerReference?: string;
  providerTransactionId?: string;
  checkoutUrl?: string;
  checkoutExpiresAt?: Date;
  returnPath?: string;
  idempotencyKey?: string;
  lastProviderStatus?: string;
  lastWebhookAt?: Date;
  paidActionAppliedAt?: Date;
  failureReason?: string;
  settledAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  metadata?: Record<string, unknown>;
};

export type RateLimitBucketDocument = BaseDocument & {
  key: string;
  action: string;
  scope: RateLimitScope;
  identifierHash: string;
  count: number;
  windowMs: number;
  bucketStartedAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
};

export type CommissionCaseDocument = BaseDocument & {
  listingId: ObjectId;
  ownerUserId: ObjectId;
  category: ListingCategory;
  listingModel: ListingModel;
  outcomeStatus: Extract<ListingStatus, "sold" | "rented">;
  finalAmountRwf: number;
  commissionAmountRwf: number;
  saleCommissionRateBps?: number;
  rentalCommissionMonthsEquivalent?: number;
  dueDays: number;
  status: CommissionCaseStatus;
  reportedByUserId: ObjectId;
  statusNote?: string;
  dueAt: Date;
  settledAt?: Date;
  settlementPaymentReference?: string;
};

export type PenaltyDocument = BaseDocument & {
  ownerUserId: ObjectId;
  listingId?: ObjectId;
  commissionCaseId?: ObjectId;
  offenseType: PenaltyOffenseType;
  reason: string;
  sourceEntityType: "listing" | "commission_case" | "payment" | "user";
  sourceEntityId: string;
  baseAmountRwf: number;
  penaltyAmountRwf: number;
  percentageBps: number;
  fixedAmountRwf: number;
  status: PenaltyStatus;
  dueAt: Date;
  assessedAt: Date;
  assessedByUserId?: ObjectId;
  statusNote?: string;
  settledAt?: Date;
  settlementPaymentReference?: string;
};

export type InvestigationCaseDocument = BaseDocument & {
  entityType: "listing" | "commission_case" | "penalty" | "payment" | "user";
  entityId: string;
  caseType: InvestigationCaseType;
  priority: InvestigationCasePriority;
  status: InvestigationCaseStatus;
  title: string;
  summary: string;
  subjectUserId?: ObjectId;
  linkedListingId?: ObjectId;
  linkedCommissionCaseId?: ObjectId;
  linkedPenaltyId?: ObjectId;
  linkedPaymentReference?: string;
  createdByUserId: ObjectId;
  updatedByUserId: ObjectId;
  resolutionNote?: string;
  resolvedAt?: Date;
};

export type InvestigationUpdateDocument = BaseDocument & {
  caseId: ObjectId;
  authorUserId: ObjectId;
  target: InvestigationUpdateTarget;
  channel: InvestigationUpdateChannel;
  outcome: InvestigationUpdateOutcome;
  note: string;
  caseStatusAfter: InvestigationCaseStatus;
};

export type SeekerRequestDocument = BaseDocument & {
  requesterUserId: ObjectId;
  category: ListingCategory;
  title: string;
  details: string;
  budgetMinRwf: number;
  budgetMaxRwf: number;
  quantityLabel: string;
  preferredContactTime: string;
  status: SeekerRequestStatus;
  durationDays: SeekerRequestDurationDays;
  approximateAreaLabel: string;
  district?: string;
  sector?: string;
  contactName: string;
  contactPhone: string;
  postedFeeRwf: number;
  viewTokenFeeRwf: number;
  matchedResponseId?: ObjectId;
  matchedResponderUserId?: ObjectId;
  matchedResponderName?: string;
  closureNote?: string;
  expiresAt: Date;
  fulfilledAt?: Date;
  closedAt?: Date;
};

export type TokenUnlockDocument = BaseDocument & {
  userId: ObjectId;
  listingId: ObjectId;
  unlockedAt: Date;
  fieldsUnlocked: Array<"ownerName" | "ownerPhone" | "address" | "keysManager">;
  sessionId?: string;
};

export type SeekerRequestUnlockDocument = BaseDocument & {
  userId: ObjectId;
  requesterUserId: ObjectId;
  seekerRequestId: ObjectId;
  unlockedAt: Date;
  fieldsUnlocked: Array<"seekerName" | "seekerPhone" | "preferredContactTime" | "fullDetails">;
};

export type SeekerResponseDocument = BaseDocument & {
  seekerRequestId: ObjectId;
  requesterUserId: ObjectId;
  responderUserId: ObjectId;
  responderRole: UserRole;
  responderName: string;
  responderPhone?: string;
  message: string;
  status: SeekerResponseStatus;
};

export type SeekerMatchMessageDocument = BaseDocument & {
  seekerRequestId: ObjectId;
  requesterUserId: ObjectId;
  responderUserId: ObjectId;
  senderUserId: ObjectId;
  senderRole: UserRole;
  senderName: string;
  body: string;
};

export type BlockedContentType = "phone" | "email" | "link" | "location" | "id_number";

export type ChatMessageDocument = BaseDocument & {
  listingId: ObjectId;
  ownerUserId: ObjectId;
  threadBuyerUserId: ObjectId;
  senderUserId: ObjectId;
  senderRole: UserRole;
  senderName: string;
  body: string;
  status: "sent" | "blocked";
  blockedContentTypes?: BlockedContentType[];
};

export type AuditLogDocument = BaseDocument & {
  actorUserId?: ObjectId;
  entityType:
    | "listing"
    | "payment"
    | "commission_case"
    | "investigation_case"
    | "token_unlock"
    | "penalty"
    | "user"
    | "chat_message"
    | "seeker_request"
    | "platform_setting";
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
};

export type NotificationDocument = BaseDocument & {
  userId: ObjectId;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  body: string;
  entityType: AuditLogDocument["entityType"];
  entityId: string;
  link?: string;
  readAt?: Date;
};

export type ListingTokenFeeMatrix = Record<ListingCategory, Record<ListingModel, number>>;
export type SeekerPostFeeByDuration = Record<SeekerRequestDurationKey, number>;

export type FeeSettingsDocument = BaseDocument & {
  key: "default";
  listingTokenFeeMatrix: ListingTokenFeeMatrix;
  seekerPostFeeByDuration: SeekerPostFeeByDuration;
  seekerViewTokenFeeRwf: number;
  saleCommissionRateBpsByCategory: Record<ListingCategory, number>;
  rentalCommissionMonthsEquivalent: number;
  commissionDueDays: number;
  penaltyPercentageBps: number;
  penaltyFixedAmountRwf: number;
  penaltyDueDays: number;
};
