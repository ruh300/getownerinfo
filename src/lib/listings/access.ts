import { ObjectId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import { getFeeSettingsSummary, resolveListingTokenFeeRwf } from "@/lib/fee-settings/workflow";
import { createNotification } from "@/lib/notifications/workflow";
import { createPaymentRecord } from "@/lib/payments/workflow";

function parseObjectId(value: string) {
  if (!ObjectId.isValid(value)) {
    throw new Error("Invalid listing identifier.");
  }

  return new ObjectId(value);
}

export async function hasListingUnlockForSession(session: AuthSession, listingId: string) {
  const user = await ensureUserRecord(session);
  const tokenUnlocks = await getCollection("tokenUnlocks");
  const listingObjectId = parseObjectId(listingId);
  const unlock = await tokenUnlocks.findOne({
    userId: user._id,
    listingId: listingObjectId,
  });

  return Boolean(unlock);
}

export async function unlockListingForSession(session: AuthSession, listingId: string) {
  const user = await ensureUserRecord(session);
  const listings = await getCollection("listings");
  const tokenUnlocks = await getCollection("tokenUnlocks");
  const auditLogs = await getCollection("auditLogs");
  const listingObjectId = parseObjectId(listingId);
  const listing = await listings.findOne({
    _id: listingObjectId,
    status: "active",
    verificationStatus: "approved",
  });

  if (!listing) {
    throw new Error("This listing is not available for unlock right now.");
  }

  const existingUnlock = await tokenUnlocks.findOne({
    userId: user._id,
    listingId: listingObjectId,
  });

  if (existingUnlock) {
    return {
      listingId,
      unlocked: true,
      reused: true,
    };
  }

  const now = new Date();
  const feeSettings = listing.tokenFeeEnabled ? await getFeeSettingsSummary() : null;
  const unlockAmountRwf = listing.tokenFeeEnabled
    ? listing.tokenFeeRwf ?? resolveListingTokenFeeRwf(feeSettings!, listing.category, listing.model)
    : 0;
  await tokenUnlocks.insertOne({
    userId: user._id,
    listingId: listingObjectId,
    unlockedAt: now,
    fieldsUnlocked: ["ownerName", "ownerPhone", "address", "keysManager"],
    createdAt: now,
    updatedAt: now,
  });

  if (unlockAmountRwf > 0) {
    await createPaymentRecord({
      userId: user._id,
      listingId: listingObjectId,
      amountRwf: unlockAmountRwf,
      purpose: "token_fee",
      referencePrefix: "TOKEN",
      metadata: {
        flow: "prototype_listing_unlock",
        listingTitle: listing.title,
      },
    });
  }

  await auditLogs.insertOne({
    actorUserId: user._id,
    entityType: "token_unlock",
    entityId: listingId,
    action: "prototype_listing_unlock",
    metadata: {
      listingTitle: listing.title,
      ownerPhone: listing.ownerContact.phone,
      amountRwf: unlockAmountRwf,
    },
    createdAt: now,
    updatedAt: now,
  });

  await createNotification({
    userId: listing.ownerUserId,
    kind: "listing_unlocked",
    severity: "success",
    title: "A buyer unlocked your listing",
    body: `${user.fullName} unlocked contact access for ${listing.title}.`,
    entityType: "token_unlock",
    entityId: listingId,
    link: "/dashboard#notifications",
  });

  return {
    listingId,
    unlocked: true,
    reused: false,
  };
}
