import { ObjectId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import type { SeekerRequestStatus } from "@/lib/domain";
import { createNotification, notifyUsersByIds } from "@/lib/notifications/workflow";

type SeekerRequestLifecycleStatus = Extract<SeekerRequestStatus, "fulfilled" | "closed">;

type UpdateSeekerRequestLifecycleInput = {
  status: SeekerRequestLifecycleStatus;
  responseId?: string;
  closureNote?: string;
};

export type SeekerRequestLifecycleResult = {
  seekerRequestId: string;
  previousStatus: SeekerRequestStatus;
  status: SeekerRequestStatus;
};

function parseObjectId(value: string, label: string) {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}.`);
  }

  return new ObjectId(value);
}

function normalizeClosureNote(value?: string) {
  const normalized = value?.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length > 300) {
    throw new Error("Closure notes must stay under 300 characters.");
  }

  return normalized;
}

export async function updateSeekerRequestLifecycleForSession(
  session: AuthSession,
  seekerRequestId: string,
  input: UpdateSeekerRequestLifecycleInput,
): Promise<SeekerRequestLifecycleResult> {
  const user = await ensureUserRecord(session);
  const seekerRequests = await getCollection("seekerRequests");
  const seekerResponses = await getCollection("seekerResponses");
  const auditLogs = await getCollection("auditLogs");
  const seekerRequestObjectId = parseObjectId(seekerRequestId, "seeker request identifier");
  const now = new Date();
  const seekerRequest = await seekerRequests.findOne({
    _id: seekerRequestObjectId,
  });

  if (!seekerRequest) {
    throw new Error("The seeker request could not be found.");
  }

  if (!seekerRequest.requesterUserId.equals(user._id)) {
    throw new Error("Only the requester can close or fulfill this seeker request.");
  }

  if (seekerRequest.status !== "active") {
    throw new Error("This seeker request is no longer active.");
  }

  if (seekerRequest.expiresAt <= now) {
    throw new Error("This seeker request has already expired.");
  }

  const closureNote = normalizeClosureNote(input.closureNote);
  const update: Record<string, unknown> = {
    status: input.status,
    updatedAt: now,
  };
  const unset: Record<string, "" | 1> = {};

  if (closureNote) {
    update.closureNote = closureNote;
  } else {
    unset.closureNote = "";
  }
  let matchedResponderName: string | undefined;
  let responderUserIdsToNotify: ObjectId[] = [];

  if (input.status === "fulfilled") {
    if (!input.responseId) {
      throw new Error("Choose the matching owner response before marking this seeker request fulfilled.");
    }

    const responseObjectId = parseObjectId(input.responseId, "response identifier");
    const response = await seekerResponses.findOne({
      _id: responseObjectId,
      seekerRequestId: seekerRequestObjectId,
      status: "sent",
    });

    if (!response) {
      throw new Error("The selected response could not be matched to this seeker request.");
    }

    update.matchedResponseId = response._id;
    update.matchedResponderUserId = response.responderUserId;
    update.matchedResponderName = response.responderName;
    update.fulfilledAt = now;
    unset.closedAt = "";
    matchedResponderName = response.responderName;
    responderUserIdsToNotify = [response.responderUserId];
  }

  if (input.status === "closed") {
    update.closedAt = now;
    unset.matchedResponseId = "";
    unset.matchedResponderUserId = "";
    unset.matchedResponderName = "";
    unset.fulfilledAt = "";

    const respondingUsers = await seekerResponses
      .find(
        {
          seekerRequestId: seekerRequestObjectId,
          status: "sent",
        },
        {
          projection: {
            responderUserId: 1,
          },
        },
      )
      .toArray();

    responderUserIdsToNotify = respondingUsers.map((response) => response.responderUserId);
  }

  await seekerRequests.updateOne(
    {
      _id: seekerRequestObjectId,
    },
    {
      $set: update,
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    },
  );

  await auditLogs.insertOne({
    actorUserId: user._id,
    entityType: "seeker_request",
    entityId: seekerRequestId,
    action: input.status === "fulfilled" ? "seeker_request_fulfilled" : "seeker_request_closed",
    metadata: {
      closureNote,
      matchedResponderName,
      responseId: input.responseId,
    },
    createdAt: now,
    updatedAt: now,
  });

  await createNotification({
    userId: user._id,
    kind: input.status === "fulfilled" ? "seeker_request_fulfilled" : "seeker_request_closed",
    severity: input.status === "fulfilled" ? "success" : "info",
    title: input.status === "fulfilled" ? "Seeker request fulfilled" : "Seeker request closed",
    body:
      input.status === "fulfilled"
        ? `${seekerRequest.title} was marked fulfilled${matchedResponderName ? ` with ${matchedResponderName}` : ""}.`
        : `${seekerRequest.title} was closed and removed from the active demand board.`,
    entityType: "seeker_request",
    entityId: seekerRequestId,
    link: "/dashboard#notifications",
  });

  if (responderUserIdsToNotify.length > 0) {
    await notifyUsersByIds(responderUserIdsToNotify, {
      kind: input.status === "fulfilled" ? "seeker_request_fulfilled" : "seeker_request_closed",
      severity: input.status === "fulfilled" ? "success" : "warning",
      title:
        input.status === "fulfilled"
          ? "A seeker chose a match"
          : "A seeker request you answered has closed",
      body:
        input.status === "fulfilled"
          ? `${seekerRequest.title} was marked fulfilled${matchedResponderName ? ` and your response was selected` : ""}.`
          : `${seekerRequest.title} was closed by the requester.`,
      entityType: "seeker_request",
      entityId: seekerRequestId,
      link: `/seeker-requests/${seekerRequestId}`,
    });
  }

  return {
    seekerRequestId,
    previousStatus: seekerRequest.status,
    status: input.status,
  };
}
