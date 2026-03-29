import { ObjectId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { canCreateListings } from "@/lib/auth/types";
import { getCollection } from "@/lib/data/collections";
import { seekerViewTokenFeeRwf } from "@/lib/seeker-requests/pricing";

function parseObjectId(value: string) {
  if (!ObjectId.isValid(value)) {
    throw new Error("Invalid seeker request identifier.");
  }

  return new ObjectId(value);
}

export async function hasSeekerRequestUnlockForSession(session: AuthSession, seekerRequestId: string) {
  const user = await ensureUserRecord(session);
  const seekerRequestUnlocks = await getCollection("seekerRequestUnlocks");
  const requestObjectId = parseObjectId(seekerRequestId);
  const unlock = await seekerRequestUnlocks.findOne({
    userId: user._id,
    seekerRequestId: requestObjectId,
  });

  return Boolean(unlock);
}

export async function unlockSeekerRequestForSession(session: AuthSession, seekerRequestId: string) {
  if (!canCreateListings(session.user.role)) {
    throw new Error("Only owner, manager, and admin accounts can unlock seeker contact details.");
  }

  const user = await ensureUserRecord(session);
  const seekerRequests = await getCollection("seekerRequests");
  const seekerRequestUnlocks = await getCollection("seekerRequestUnlocks");
  const payments = await getCollection("payments");
  const auditLogs = await getCollection("auditLogs");
  const requestObjectId = parseObjectId(seekerRequestId);
  const now = new Date();
  const seekerRequest = await seekerRequests.findOne({
    _id: requestObjectId,
    status: "active",
    expiresAt: { $gt: now },
  });

  if (!seekerRequest) {
    throw new Error("This seeker request is not available for unlock right now.");
  }

  if (seekerRequest.requesterUserId.equals(user._id)) {
    throw new Error("You cannot unlock contact details for your own seeker request.");
  }

  const existingUnlock = await seekerRequestUnlocks.findOne({
    userId: user._id,
    seekerRequestId: requestObjectId,
  });

  if (existingUnlock) {
    return {
      seekerRequestId,
      unlocked: true,
      reused: true,
    };
  }

  await seekerRequestUnlocks.insertOne({
    userId: user._id,
    requesterUserId: seekerRequest.requesterUserId,
    seekerRequestId: requestObjectId,
    unlockedAt: now,
    fieldsUnlocked: ["seekerName", "seekerPhone", "preferredContactTime", "fullDetails"],
    createdAt: now,
    updatedAt: now,
  });

  await payments.insertOne({
    userId: user._id,
    seekerRequestId: requestObjectId,
    amountRwf: seekerRequest.viewTokenFeeRwf ?? seekerViewTokenFeeRwf,
    currency: "RWF",
    provider: "afripay",
    purpose: "seeker_view_token",
    status: "paid",
    reference: `SVT-${requestObjectId.toString().slice(-6)}-${now.getTime()}`,
    createdAt: now,
    updatedAt: now,
  });

  await auditLogs.insertOne({
    actorUserId: user._id,
    entityType: "seeker_request",
    entityId: seekerRequestId,
    action: "prototype_seeker_contact_unlock",
    metadata: {
      requesterUserId: seekerRequest.requesterUserId.toString(),
      title: seekerRequest.title,
      amountRwf: seekerRequest.viewTokenFeeRwf ?? seekerViewTokenFeeRwf,
    },
    createdAt: now,
    updatedAt: now,
  });

  return {
    seekerRequestId,
    unlocked: true,
    reused: false,
  };
}
