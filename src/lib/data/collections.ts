import type { Collection } from "mongodb";

import {
  type AuditLogDocument,
  type ChatMessageDocument,
  type CommissionCaseDocument,
  type FeeSettingsDocument,
  type InvestigationCaseDocument,
  type InvestigationUpdateDocument,
  type ListingDraftDocument,
  type ListingDocument,
  type NotificationDocument,
  type PenaltyDocument,
  type PaymentDocument,
  type RateLimitBucketDocument,
  type SeekerMatchMessageDocument,
  type SeekerResponseDocument,
  type SeekerRequestUnlockDocument,
  type SeekerRequestDocument,
  type TokenUnlockDocument,
  type UserDocument,
} from "@/lib/domain";
import { getDatabase } from "@/lib/mongodb";

declare global {
  var getownerinfoEnsureCoreIndexesPromise: Promise<void> | undefined;
}

let ensureCoreIndexesPromise: Promise<void> | undefined;

export const collectionNames = {
  users: "users",
  listings: "listings",
  listingDrafts: "listingDrafts",
  seekerRequests: "seekerRequests",
  payments: "payments",
  commissionCases: "commissionCases",
  investigationCases: "investigationCases",
  investigationUpdates: "investigationUpdates",
  penalties: "penalties",
  feeSettings: "feeSettings",
  tokenUnlocks: "tokenUnlocks",
  seekerRequestUnlocks: "seekerRequestUnlocks",
  seekerResponses: "seekerResponses",
  seekerMatchMessages: "seekerMatchMessages",
  chatMessages: "chatMessages",
  auditLogs: "auditLogs",
  notifications: "notifications",
  rateLimitBuckets: "rateLimitBuckets",
} as const;

type CollectionMap = {
  users: UserDocument;
  listings: ListingDocument;
  listingDrafts: ListingDraftDocument;
  seekerRequests: SeekerRequestDocument;
  payments: PaymentDocument;
  commissionCases: CommissionCaseDocument;
  investigationCases: InvestigationCaseDocument;
  investigationUpdates: InvestigationUpdateDocument;
  penalties: PenaltyDocument;
  feeSettings: FeeSettingsDocument;
  tokenUnlocks: TokenUnlockDocument;
  seekerRequestUnlocks: SeekerRequestUnlockDocument;
  seekerResponses: SeekerResponseDocument;
  seekerMatchMessages: SeekerMatchMessageDocument;
  chatMessages: ChatMessageDocument;
  auditLogs: AuditLogDocument;
  notifications: NotificationDocument;
  rateLimitBuckets: RateLimitBucketDocument;
};

export async function getCollection<K extends keyof CollectionMap>(name: K): Promise<Collection<CollectionMap[K]>> {
  await ensureCoreIndexes();
  const db = await getDatabase();
  return db.collection<CollectionMap[K]>(collectionNames[name]);
}

async function initializeCoreIndexes() {
  const db = await getDatabase();
  const users = db.collection<UserDocument>(collectionNames.users);
  const listings = db.collection<ListingDocument>(collectionNames.listings);
  const listingDrafts = db.collection<ListingDraftDocument>(collectionNames.listingDrafts);
  const seekerRequests = db.collection<SeekerRequestDocument>(collectionNames.seekerRequests);
  const payments = db.collection<PaymentDocument>(collectionNames.payments);
  const commissionCases = db.collection<CommissionCaseDocument>(collectionNames.commissionCases);
  const investigationCases = db.collection<InvestigationCaseDocument>(collectionNames.investigationCases);
  const investigationUpdates = db.collection<InvestigationUpdateDocument>(collectionNames.investigationUpdates);
  const penalties = db.collection<PenaltyDocument>(collectionNames.penalties);
  const feeSettings = db.collection<FeeSettingsDocument>(collectionNames.feeSettings);
  const tokenUnlocks = db.collection<TokenUnlockDocument>(collectionNames.tokenUnlocks);
  const seekerRequestUnlocks = db.collection<SeekerRequestUnlockDocument>(collectionNames.seekerRequestUnlocks);
  const seekerResponses = db.collection<SeekerResponseDocument>(collectionNames.seekerResponses);
  const seekerMatchMessages = db.collection<SeekerMatchMessageDocument>(collectionNames.seekerMatchMessages);
  const chatMessages = db.collection<ChatMessageDocument>(collectionNames.chatMessages);
  const auditLogs = db.collection<AuditLogDocument>(collectionNames.auditLogs);
  const notifications = db.collection<NotificationDocument>(collectionNames.notifications);
  const rateLimitBuckets = db.collection<RateLimitBucketDocument>(collectionNames.rateLimitBuckets);

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true, sparse: true }),
    users.createIndex({ phone: 1 }, { unique: true, sparse: true }),
    listings.createIndex({ ownerUserId: 1, status: 1 }),
    listings.createIndex({ category: 1, model: 1, status: 1 }),
    listings.createIndex({ verificationStatus: 1, createdAt: -1 }),
    listings.createIndex({ status: 1, submittedAt: -1 }),
    listingDrafts.createIndex({ "ownerContact.phone": 1, createdAt: -1 }),
    listingDrafts.createIndex({ ownerUserId: 1, updatedAt: -1 }),
    listingDrafts.createIndex({ category: 1, status: 1, createdAt: -1 }),
    seekerRequests.createIndex({ requesterUserId: 1, createdAt: -1 }),
    seekerRequests.createIndex({ status: 1, expiresAt: 1, createdAt: -1 }),
    seekerRequests.createIndex({ category: 1, status: 1, createdAt: -1 }),
    payments.createIndex({ userId: 1, purpose: 1, createdAt: -1 }),
    payments.createIndex({ status: 1, createdAt: -1 }),
    payments.createIndex({ listingId: 1, purpose: 1, createdAt: -1 }, { sparse: true }),
    payments.createIndex({ seekerRequestId: 1, purpose: 1, createdAt: -1 }, { sparse: true }),
    payments.createIndex({ reference: 1 }, { unique: true }),
    payments.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true }),
    payments.createIndex({ providerReference: 1 }, { sparse: true }),
    payments.createIndex({ providerTransactionId: 1 }, { sparse: true }),
    commissionCases.createIndex({ listingId: 1 }, { unique: true }),
    commissionCases.createIndex({ ownerUserId: 1, status: 1, dueAt: 1 }),
    commissionCases.createIndex({ status: 1, dueAt: 1 }),
    investigationCases.createIndex({ entityType: 1, entityId: 1, status: 1, createdAt: -1 }),
    investigationCases.createIndex({ status: 1, priority: 1, updatedAt: -1 }),
    investigationCases.createIndex({ subjectUserId: 1, updatedAt: -1 }, { sparse: true }),
    investigationUpdates.createIndex({ caseId: 1, createdAt: -1 }),
    investigationUpdates.createIndex({ authorUserId: 1, createdAt: -1 }),
    penalties.createIndex({ ownerUserId: 1, status: 1, createdAt: -1 }),
    penalties.createIndex({ status: 1, dueAt: 1 }),
    penalties.createIndex({ commissionCaseId: 1, offenseType: 1 }, { unique: true, sparse: true }),
    penalties.createIndex({ listingId: 1, createdAt: -1 }, { sparse: true }),
    feeSettings.createIndex({ key: 1 }, { unique: true }),
    tokenUnlocks.createIndex({ userId: 1, listingId: 1, unlockedAt: -1 }),
    seekerRequestUnlocks.createIndex({ userId: 1, seekerRequestId: 1, unlockedAt: -1 }),
    seekerRequestUnlocks.createIndex({ requesterUserId: 1, unlockedAt: -1 }),
    seekerResponses.createIndex({ seekerRequestId: 1, responderUserId: 1 }, { unique: true }),
    seekerResponses.createIndex({ requesterUserId: 1, createdAt: -1 }),
    seekerResponses.createIndex({ responderUserId: 1, createdAt: -1 }),
    seekerMatchMessages.createIndex({ seekerRequestId: 1, createdAt: -1 }),
    seekerMatchMessages.createIndex({ requesterUserId: 1, createdAt: -1 }),
    seekerMatchMessages.createIndex({ responderUserId: 1, createdAt: -1 }),
    chatMessages.createIndex({ listingId: 1, senderUserId: 1, createdAt: -1 }),
    chatMessages.createIndex({ listingId: 1, threadBuyerUserId: 1, createdAt: -1 }),
    chatMessages.createIndex({ ownerUserId: 1, status: 1, createdAt: -1 }),
    chatMessages.createIndex({ senderUserId: 1, status: 1, createdAt: -1 }),
    auditLogs.createIndex({ entityType: 1, entityId: 1, createdAt: -1 }),
    auditLogs.createIndex({ action: 1, createdAt: -1 }),
    auditLogs.createIndex({ actorUserId: 1, createdAt: -1 }, { sparse: true }),
    notifications.createIndex({ userId: 1, readAt: 1, createdAt: -1 }),
    notifications.createIndex({ userId: 1, createdAt: -1 }),
    rateLimitBuckets.createIndex({ key: 1 }, { unique: true }),
    rateLimitBuckets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    rateLimitBuckets.createIndex({ action: 1, scope: 1, bucketStartedAt: -1 }),
  ]);
}

export async function ensureCoreIndexes() {
  if (process.env.NODE_ENV === "production") {
    if (!ensureCoreIndexesPromise) {
      ensureCoreIndexesPromise = initializeCoreIndexes().catch((error) => {
        ensureCoreIndexesPromise = undefined;
        throw error;
      });
    }

    return ensureCoreIndexesPromise;
  }

  if (!global.getownerinfoEnsureCoreIndexesPromise) {
    global.getownerinfoEnsureCoreIndexesPromise = initializeCoreIndexes().catch((error) => {
      global.getownerinfoEnsureCoreIndexesPromise = undefined;
      throw error;
    });
  }

  return global.getownerinfoEnsureCoreIndexesPromise;
}
