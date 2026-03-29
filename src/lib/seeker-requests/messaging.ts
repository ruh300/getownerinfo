import { ObjectId, type WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import type {
  ListingCategory,
  SeekerMatchMessageDocument,
  SeekerRequestDocument,
  SeekerResponseDocument,
  UserRole,
} from "@/lib/domain";
import { createNotification } from "@/lib/notifications/workflow";

const minMessageLength = 4;
const maxMessageLength = 1200;

export type SeekerMatchMessageSummary = {
  id: string;
  seekerRequestId: string;
  senderUserId: string;
  senderName: string;
  senderRole: UserRole;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type SeekerMatchConversationData = {
  requestId: string;
  requestTitle: string;
  requestCategory: ListingCategory;
  requestStatus: SeekerRequestDocument["status"];
  isRequester: boolean;
  viewerUserId: string;
  counterpartName: string;
  counterpartRole: UserRole | null;
  counterpartPhone: string | null;
  matchedAt: string | null;
  messageCount: number;
  latestMessagePreview: string | null;
  latestMessageAt: string | null;
  messages: SeekerMatchMessageSummary[];
};

export type SeekerMatchConversationSummary = Omit<SeekerMatchConversationData, "messages" | "viewerUserId">;

type MatchedConversationContext = {
  request: WithId<SeekerRequestDocument>;
  matchedResponse: WithId<SeekerResponseDocument>;
  isRequester: boolean;
  counterpartName: string;
  counterpartRole: UserRole | null;
  counterpartPhone: string | null;
};

function parseObjectId(value: string, label: string) {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}.`);
  }

  return new ObjectId(value);
}

function normalizeMessageBody(value: string) {
  const normalized = value.trim();

  if (normalized.length < minMessageLength) {
    throw new Error(`Write a clearer message with at least ${minMessageLength} characters.`);
  }

  if (normalized.length > maxMessageLength) {
    throw new Error(`Messages must stay under ${maxMessageLength} characters.`);
  }

  return normalized;
}

function serializeMatchMessage(message: WithId<SeekerMatchMessageDocument>): SeekerMatchMessageSummary {
  return {
    id: message._id.toString(),
    seekerRequestId: message.seekerRequestId.toString(),
    senderUserId: message.senderUserId.toString(),
    senderName: message.senderName,
    senderRole: message.senderRole,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
  };
}

function buildConversationSummary(
  context: MatchedConversationContext,
  messages: WithId<SeekerMatchMessageDocument>[],
): SeekerMatchConversationData {
  const latestMessage = messages.at(-1) ?? null;

  return {
    requestId: context.request._id.toString(),
    requestTitle: context.request.title,
    requestCategory: context.request.category,
    requestStatus: context.request.status,
    isRequester: context.isRequester,
    viewerUserId: context.isRequester
      ? context.request.requesterUserId.toString()
      : context.matchedResponse.responderUserId.toString(),
    counterpartName: context.counterpartName,
    counterpartRole: context.counterpartRole,
    counterpartPhone: context.counterpartPhone,
    matchedAt: context.request.fulfilledAt?.toISOString() ?? null,
    messageCount: messages.length,
    latestMessagePreview: latestMessage?.body ?? null,
    latestMessageAt: latestMessage?.createdAt.toISOString() ?? null,
    messages: messages.map((message) => serializeMatchMessage(message)),
  };
}

async function getMatchedConversationContextForUser(
  userId: ObjectId,
  seekerRequestId: string,
): Promise<MatchedConversationContext> {
  const seekerRequests = await getCollection("seekerRequests");
  const seekerResponses = await getCollection("seekerResponses");
  const seekerRequestObjectId = parseObjectId(seekerRequestId, "seeker request identifier");
  const request = await seekerRequests.findOne({
    _id: seekerRequestObjectId,
  });

  if (!request) {
    throw new Error("The selected seeker request could not be found.");
  }

  if (
    request.status !== "fulfilled" ||
    !request.matchedResponseId ||
    !request.matchedResponderUserId
  ) {
    throw new Error("Matched follow-up messaging opens only after a requester selects a fulfilled owner match.");
  }

  const isRequester = request.requesterUserId.equals(userId);
  const isMatchedResponder = request.matchedResponderUserId.equals(userId);

  if (!isRequester && !isMatchedResponder) {
    throw new Error("Only the requester and the matched responder can access this conversation.");
  }

  const matchedResponse = await seekerResponses.findOne({
    _id: request.matchedResponseId,
    seekerRequestId: seekerRequestObjectId,
    responderUserId: request.matchedResponderUserId,
    status: "sent",
  });

  if (!matchedResponse) {
    throw new Error("The matched owner response could not be loaded for this seeker request.");
  }

  return {
    request,
    matchedResponse,
    isRequester,
    counterpartName: isRequester ? matchedResponse.responderName : request.contactName,
    counterpartRole: isRequester ? matchedResponse.responderRole : "buyer",
    counterpartPhone: isRequester ? matchedResponse.responderPhone ?? null : request.contactPhone,
  };
}

export async function getSeekerMatchConversationForSession(
  session: AuthSession,
  seekerRequestId: string,
): Promise<SeekerMatchConversationData> {
  const user = await ensureUserRecord(session);
  const seekerMatchMessages = await getCollection("seekerMatchMessages");
  const context = await getMatchedConversationContextForUser(user._id, seekerRequestId);
  const messages = await seekerMatchMessages
    .find({
      seekerRequestId: context.request._id,
    })
    .sort({ createdAt: 1 })
    .toArray();

  return buildConversationSummary(context, messages);
}

export async function sendSeekerMatchMessageForSession(
  session: AuthSession,
  seekerRequestId: string,
  body: string,
) {
  const user = await ensureUserRecord(session);
  const seekerMatchMessages = await getCollection("seekerMatchMessages");
  const auditLogs = await getCollection("auditLogs");
  const context = await getMatchedConversationContextForUser(user._id, seekerRequestId);
  const normalizedBody = normalizeMessageBody(body);
  const now = new Date();
  const messageDocument: Omit<SeekerMatchMessageDocument, "_id"> = {
    seekerRequestId: context.request._id,
    requesterUserId: context.request.requesterUserId,
    responderUserId: context.matchedResponse.responderUserId,
    senderUserId: user._id,
    senderRole: session.user.role,
    senderName: user.fullName,
    body: normalizedBody,
    createdAt: now,
    updatedAt: now,
  };
  const result = await seekerMatchMessages.insertOne(messageDocument);
  const recipientUserId = context.isRequester
    ? context.matchedResponse.responderUserId
    : context.request.requesterUserId;

  await auditLogs.insertOne({
    actorUserId: user._id,
    entityType: "seeker_request",
    entityId: seekerRequestId,
    action: "seeker_match_message_sent",
    metadata: {
      senderRole: session.user.role,
      recipientUserId: recipientUserId.toString(),
    },
    createdAt: now,
    updatedAt: now,
  });

  await createNotification({
    userId: recipientUserId,
    kind: "seeker_match_message_received",
    severity: "info",
    title: context.isRequester ? "The seeker sent a follow-up message" : "The matched owner sent a follow-up message",
    body: `${user.fullName} sent a new message about ${context.request.title}.`,
    entityType: "seeker_request",
    entityId: seekerRequestId,
    link: `/seeker-requests/${seekerRequestId}`,
  });

  return {
    message: serializeMatchMessage({
      ...messageDocument,
      _id: result.insertedId,
    }),
  };
}

export async function getSeekerMatchConversationFeedForUser(
  userId: ObjectId,
  limit = 6,
): Promise<SeekerMatchConversationSummary[]> {
  const seekerRequests = await getCollection("seekerRequests");
  const seekerResponses = await getCollection("seekerResponses");
  const seekerMatchMessages = await getCollection("seekerMatchMessages");
  const requests = await seekerRequests
    .find({
      status: "fulfilled",
      matchedResponderUserId: { $exists: true },
      $or: [{ requesterUserId: userId }, { matchedResponderUserId: userId }],
    })
    .sort({ fulfilledAt: -1, updatedAt: -1 })
    .limit(limit)
    .toArray();

  if (requests.length === 0) {
    return [];
  }

  const matchedResponseIds = requests
    .map((request) => request.matchedResponseId)
    .filter((value): value is ObjectId => Boolean(value));
  const requestIds = requests.map((request) => request._id);
  const [responses, messages] = await Promise.all([
    matchedResponseIds.length > 0
      ? seekerResponses
          .find({
            _id: { $in: matchedResponseIds },
            status: "sent",
          })
          .toArray()
      : Promise.resolve([]),
    seekerMatchMessages
      .find({
        seekerRequestId: { $in: requestIds },
      })
      .sort({ createdAt: 1 })
      .toArray(),
  ]);
  const responseMap = new Map(responses.map((response) => [response._id.toString(), response]));
  const messagesByRequest = new Map<string, WithId<SeekerMatchMessageDocument>[]>();

  for (const message of messages) {
    const key = message.seekerRequestId.toString();
    const bucket = messagesByRequest.get(key);

    if (bucket) {
      bucket.push(message);
    } else {
      messagesByRequest.set(key, [message]);
    }
  }

  return requests.flatMap((request) => {
    const matchedResponse = request.matchedResponseId
      ? responseMap.get(request.matchedResponseId.toString())
      : null;

    if (!matchedResponse || !request.matchedResponderUserId) {
      return [];
    }

    const context: MatchedConversationContext = {
      request,
      matchedResponse,
      isRequester: request.requesterUserId.equals(userId),
      counterpartName: request.requesterUserId.equals(userId)
        ? matchedResponse.responderName
        : request.contactName,
      counterpartRole: request.requesterUserId.equals(userId)
        ? matchedResponse.responderRole
        : "buyer",
      counterpartPhone: request.requesterUserId.equals(userId)
        ? matchedResponse.responderPhone ?? null
        : request.contactPhone,
    };
    const conversation = buildConversationSummary(
      context,
      messagesByRequest.get(request._id.toString()) ?? [],
    );

    return [
      {
        requestId: conversation.requestId,
        requestTitle: conversation.requestTitle,
        requestCategory: conversation.requestCategory,
        requestStatus: conversation.requestStatus,
        isRequester: conversation.isRequester,
        counterpartName: conversation.counterpartName,
        counterpartRole: conversation.counterpartRole,
        counterpartPhone: conversation.counterpartPhone,
        matchedAt: conversation.matchedAt,
        messageCount: conversation.messageCount,
        latestMessagePreview: conversation.latestMessagePreview,
        latestMessageAt: conversation.latestMessageAt,
      },
    ];
  });
}
