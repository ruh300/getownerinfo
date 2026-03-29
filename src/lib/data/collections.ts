import type { Collection } from "mongodb";

import {
  type AuditLogDocument,
  type ListingDraftDocument,
  type ListingDocument,
  type PaymentDocument,
  type TokenUnlockDocument,
  type UserDocument,
} from "@/lib/domain";
import { getDatabase } from "@/lib/mongodb";

export const collectionNames = {
  users: "users",
  listings: "listings",
  listingDrafts: "listingDrafts",
  payments: "payments",
  tokenUnlocks: "tokenUnlocks",
  auditLogs: "auditLogs",
} as const;

type CollectionMap = {
  users: UserDocument;
  listings: ListingDocument;
  listingDrafts: ListingDraftDocument;
  payments: PaymentDocument;
  tokenUnlocks: TokenUnlockDocument;
  auditLogs: AuditLogDocument;
};

export async function getCollection<K extends keyof CollectionMap>(name: K): Promise<Collection<CollectionMap[K]>> {
  const db = await getDatabase();
  return db.collection<CollectionMap[K]>(collectionNames[name]);
}

export async function ensureCoreIndexes() {
  const users = await getCollection("users");
  const listings = await getCollection("listings");
  const listingDrafts = await getCollection("listingDrafts");
  const tokenUnlocks = await getCollection("tokenUnlocks");
  const auditLogs = await getCollection("auditLogs");

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
    tokenUnlocks.createIndex({ userId: 1, listingId: 1, unlockedAt: -1 }),
    auditLogs.createIndex({ entityType: 1, entityId: 1, createdAt: -1 }),
  ]);
}
