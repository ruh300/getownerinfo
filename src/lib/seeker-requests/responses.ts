import { ObjectId, type WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { canCreateListings } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import type {
  SeekerRequestDocument,
  SeekerResponseDocument,
} from "@/lib/domain";
import { createNotification } from "@/lib/notifications/workflow";

const minResponseLength = 16;
const maxResponseLength = 1000;

export type SeekerResponseSummary = {
  id: string;
  seekerRequestId: string;
  requestTitle: string;
  responderName: string;
  responderRole: SeekerResponseDocument["responderRole"];
  responderPhone: string | null;
  message: string;
  status: SeekerResponseDocument["status"];
  createdAt: string;
  updatedAt: string;
};

export type SeekerRequestResponseContext = {
  isRequester: boolean;
  canRespond: boolean;
  existingResponse: SeekerResponseSummary | null;
  responses: SeekerResponseSummary[];
};

function parseObjectId(value: string, label: string) {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}.`);
  }

  return new ObjectId(value);
}

function normalizeResponseMessage(value: string) {
  const normalized = value.trim();

  if (normalized.length < minResponseLength) {
    throw new Error(`Write a more useful response with at least ${minResponseLength} characters.`);
  }

  if (normalized.length > maxResponseLength) {
    throw new Error(`Responses must stay under ${maxResponseLength} characters.`);
  }

  return normalized;
}

function serializeSeekerResponse(
  response: WithId<SeekerResponseDocument>,
  requestMap: Map<string, WithId<SeekerRequestDocument>>,
): SeekerResponseSummary {
  const request = requestMap.get(response.seekerRequestId.toString());

  return {
    id: response._id.toString(),
    seekerRequestId: response.seekerRequestId.toString(),
    requestTitle: request?.title ?? "Unknown seeker request",
    responderName: response.responderName,
    responderRole: response.responderRole,
    responderPhone: response.responderPhone ?? null,
    message: response.message,
    status: response.status,
    createdAt: response.createdAt.toISOString(),
    updatedAt: response.updatedAt.toISOString(),
  };
}

export async function createSeekerResponseForSession(
  session: AuthSession,
  seekerRequestId: string,
  message: string,
) {
  if (!canCreateListings(session.user.role)) {
    throw new Error("Only owner, manager, and admin accounts can respond to seeker requests.");
  }

  const user = await ensureUserRecord(session);
  const seekerRequests = await getCollection("seekerRequests");
  const seekerRequestUnlocks = await getCollection("seekerRequestUnlocks");
  const seekerResponses = await getCollection("seekerResponses");
  const auditLogs = await getCollection("auditLogs");
  const seekerRequestObjectId = parseObjectId(seekerRequestId, "seeker request identifier");
  const now = new Date();
  const seekerRequest = await seekerRequests.findOne({
    _id: seekerRequestObjectId,
    status: "active",
    expiresAt: { $gt: now },
  });

  if (!seekerRequest) {
    throw new Error("This seeker request is not available for owner responses right now.");
  }

  if (seekerRequest.requesterUserId.equals(user._id)) {
    throw new Error("You cannot respond to your own seeker request.");
  }

  const unlock = await seekerRequestUnlocks.findOne({
    userId: user._id,
    seekerRequestId: seekerRequestObjectId,
  });

  if (!unlock) {
    throw new Error("Unlock the seeker request first before sending a direct response.");
  }

  const normalizedMessage = normalizeResponseMessage(message);
  const existingResponse = await seekerResponses.findOne({
    seekerRequestId: seekerRequestObjectId,
    responderUserId: user._id,
  });
  const responseDocument: Omit<SeekerResponseDocument, "_id"> = {
    seekerRequestId: seekerRequestObjectId,
    requesterUserId: seekerRequest.requesterUserId,
    responderUserId: user._id,
    responderRole: session.user.role,
    responderName: user.fullName,
    responderPhone: user.phone ?? session.user.phone,
    message: normalizedMessage,
    status: "sent",
    createdAt: existingResponse?.createdAt ?? now,
    updatedAt: now,
  };
  const result = await seekerResponses.findOneAndUpdate(
    {
      seekerRequestId: seekerRequestObjectId,
      responderUserId: user._id,
    },
    {
      $set: responseDocument,
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    },
  );

  if (!result) {
    throw new Error("Could not save the seeker response.");
  }

  await auditLogs.insertOne({
    actorUserId: user._id,
    entityType: "seeker_request",
    entityId: seekerRequestId,
    action: existingResponse ? "seeker_response_updated" : "seeker_response_created",
    metadata: {
      responderUserId: user._id.toString(),
      requesterUserId: seekerRequest.requesterUserId.toString(),
    },
    createdAt: now,
    updatedAt: now,
  });

  await createNotification({
    userId: seekerRequest.requesterUserId,
    kind: "seeker_response_received",
    severity: "info",
    title: existingResponse ? "A seeker response was updated" : "A seeker response arrived",
    body: `${user.fullName} responded to ${seekerRequest.title}.`,
    entityType: "seeker_request",
    entityId: seekerRequestId,
    link: "/dashboard#notifications",
  });

  const requestMap = new Map([[seekerRequestObjectId.toString(), seekerRequest]]);

  return {
    updated: Boolean(existingResponse),
    response: serializeSeekerResponse(result, requestMap),
  };
}

export async function getBuyerSeekerResponsesForUser(requesterUserId: ObjectId): Promise<SeekerResponseSummary[]> {
  const seekerResponses = await getCollection("seekerResponses");
  const seekerRequests = await getCollection("seekerRequests");
  const responses = await seekerResponses
    .find({
      requesterUserId,
      status: "sent",
    })
    .sort({ updatedAt: -1 })
    .limit(10)
    .toArray();

  if (responses.length === 0) {
    return [];
  }

  const requestIds = [...new Set(responses.map((response) => response.seekerRequestId.toString()))].map((id) => new ObjectId(id));
  const requests = await seekerRequests
    .find({
      _id: { $in: requestIds },
    })
    .toArray();
  const requestMap = new Map(requests.map((request) => [request._id.toString(), request]));

  return responses.map((response) => serializeSeekerResponse(response, requestMap));
}

export async function getSeekerRequestResponseContextForSession(
  session: AuthSession,
  seekerRequestId: string,
): Promise<SeekerRequestResponseContext> {
  const user = await ensureUserRecord(session);
  const seekerRequests = await getCollection("seekerRequests");
  const seekerRequestUnlocks = await getCollection("seekerRequestUnlocks");
  const seekerResponses = await getCollection("seekerResponses");
  const seekerRequestObjectId = parseObjectId(seekerRequestId, "seeker request identifier");
  const seekerRequest = await seekerRequests.findOne({
    _id: seekerRequestObjectId,
  });

  if (!seekerRequest) {
    throw new Error("The selected seeker request could not be found.");
  }

  const requestMap = new Map([[seekerRequestObjectId.toString(), seekerRequest]]);

  if (seekerRequest.requesterUserId.equals(user._id)) {
    const responses = await seekerResponses
      .find({
        seekerRequestId: seekerRequestObjectId,
        status: "sent",
      })
      .sort({ updatedAt: -1 })
      .toArray();

    return {
      isRequester: true,
      canRespond: false,
      existingResponse: null,
      responses: responses.map((response) => serializeSeekerResponse(response, requestMap)),
    };
  }

  if (!canCreateListings(session.user.role)) {
    return {
      isRequester: false,
      canRespond: false,
      existingResponse: null,
      responses: [],
    };
  }

  const unlock = await seekerRequestUnlocks.findOne({
    userId: user._id,
    seekerRequestId: seekerRequestObjectId,
  });

  if (!unlock) {
    return {
      isRequester: false,
      canRespond: false,
      existingResponse: null,
      responses: [],
    };
  }

  const existingResponse = await seekerResponses.findOne({
    seekerRequestId: seekerRequestObjectId,
    responderUserId: user._id,
    status: "sent",
  });

  return {
    isRequester: false,
    canRespond: seekerRequest.status === "active" && seekerRequest.expiresAt > new Date(),
    existingResponse: existingResponse ? serializeSeekerResponse(existingResponse, requestMap) : null,
    responses: existingResponse ? [serializeSeekerResponse(existingResponse, requestMap)] : [],
  };
}

export async function getSeekerResponseCountsForRequester(requesterUserId: ObjectId) {
  const seekerResponses = await getCollection("seekerResponses");
  const grouped = await seekerResponses
    .aggregate<{ _id: ObjectId; count: number }>([
      {
        $match: {
          requesterUserId,
          status: "sent",
        },
      },
      {
        $group: {
          _id: "$seekerRequestId",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  return new Map(grouped.map((item) => [item._id.toString(), item.count]));
}
