import { ObjectId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { canCreateListings } from "@/lib/auth/types";
import { getCollection } from "@/lib/data/collections";
import { getFeeSettingsSummary, resolveSeekerViewTokenFeeRwf } from "@/lib/fee-settings/workflow";
import { createNotification } from "@/lib/notifications/workflow";
import { createPaymentRecord } from "@/lib/payments/workflow";

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

  const feeSettings = await getFeeSettingsSummary();
  const unlockAmountRwf = seekerRequest.viewTokenFeeRwf ?? resolveSeekerViewTokenFeeRwf(feeSettings);
  await seekerRequestUnlocks.insertOne({
    userId: user._id,
    requesterUserId: seekerRequest.requesterUserId,
    seekerRequestId: requestObjectId,
    unlockedAt: now,
    fieldsUnlocked: ["seekerName", "seekerPhone", "preferredContactTime", "fullDetails"],
    createdAt: now,
    updatedAt: now,
  });

  await createPaymentRecord({
    userId: user._id,
    seekerRequestId: requestObjectId,
    amountRwf: unlockAmountRwf,
    purpose: "seeker_view_token",
    referencePrefix: "SVT",
    metadata: {
      flow: "prototype_seeker_contact_unlock",
      title: seekerRequest.title,
    },
  });

  await auditLogs.insertOne({
    actorUserId: user._id,
    entityType: "seeker_request",
    entityId: seekerRequestId,
    action: "prototype_seeker_contact_unlock",
    metadata: {
      requesterUserId: seekerRequest.requesterUserId.toString(),
      title: seekerRequest.title,
      amountRwf: unlockAmountRwf,
    },
    createdAt: now,
    updatedAt: now,
  });

  await createNotification({
    userId: seekerRequest.requesterUserId,
    kind: "seeker_request_unlocked",
    severity: "success",
    title: "An owner unlocked your seeker request",
    body: `${user.fullName} unlocked the contact details for ${seekerRequest.title}.`,
    entityType: "seeker_request",
    entityId: seekerRequestId,
    link: "/dashboard#notifications",
  });

  return {
    seekerRequestId,
    unlocked: true,
    reused: false,
  };
}
