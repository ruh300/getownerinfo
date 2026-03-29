import { ObjectId, type WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import type { BlockedContentType, ChatMessageDocument, ListingDocument } from "@/lib/domain";
import { createNotification } from "@/lib/notifications/workflow";

const maxMessageLength = 800;
const conversationLimit = 12;
const ownerInboxLimit = 8;

export type ListingMessageSummary = {
  id: string;
  body: string;
  status: ChatMessageDocument["status"];
  blockedContentTypes: BlockedContentType[];
  createdAt: string;
  senderName: string;
  senderRole: ChatMessageDocument["senderRole"];
};

export type OwnerInquirySummary = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingCategory: ListingDocument["category"];
  listingStatus: ListingDocument["status"];
  buyerUserId: string;
  buyerName: string;
  buyerPhone: string | null;
  body: string;
  createdAt: string;
  buyerUnlockedListing: boolean;
  messageCount: number;
  lastSenderRole: ChatMessageDocument["senderRole"];
};

function parseObjectId(value: string) {
  if (!ObjectId.isValid(value)) {
    throw new Error("Invalid listing identifier.");
  }

  return new ObjectId(value);
}

function normalizeMessageBody(body: string) {
  const trimmed = body.trim();

  if (trimmed.length < 4) {
    throw new Error("Write a slightly more detailed question before sending.");
  }

  if (trimmed.length > maxMessageLength) {
    throw new Error(`Messages must stay under ${maxMessageLength} characters.`);
  }

  return trimmed;
}

function detectBlockedContentTypes(body: string): BlockedContentType[] {
  const blocked = new Set<BlockedContentType>();

  if (/\b(?:\+?250[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}|0\d{2}[\s-]?\d{3}[\s-]?\d{3})\b/.test(body)) {
    blocked.add("phone");
  }

  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(body)) {
    blocked.add("email");
  }

  if (/(?:https?:\/\/|www\.)\S+/i.test(body)) {
    blocked.add("link");
  }

  if (
    /(?:google\s*maps|map\s*pin|upi\b|plot\s*#?\s*[a-z0-9-]+|house\s*(?:number|no\.?|#)\s*[a-z0-9-]+|\b(?:kg|kk|kn)\s*\d+\b)/i.test(
      body,
    )
  ) {
    blocked.add("location");
  }

  if (/\b\d{16}\b/.test(body)) {
    blocked.add("id_number");
  }

  return [...blocked];
}

async function getListingForConversation(listingId: string) {
  const listings = await getCollection("listings");

  return listings.findOne({
    _id: parseObjectId(listingId),
    verificationStatus: "approved",
  });
}

async function hasBuyerUnlockedListing(userId: ObjectId, listingId: ObjectId) {
  const tokenUnlocks = await getCollection("tokenUnlocks");
  const unlock = await tokenUnlocks.findOne({
    userId,
    listingId,
  });

  return Boolean(unlock);
}

function getThreadBuyerUserId(message: Pick<ChatMessageDocument, "threadBuyerUserId" | "senderRole" | "senderUserId">) {
  if (message.threadBuyerUserId) {
    return message.threadBuyerUserId;
  }

  return message.senderRole === "buyer" ? message.senderUserId : null;
}

function serializeMessage(message: WithId<ChatMessageDocument>): ListingMessageSummary {
  return {
    id: message._id.toString(),
    body: message.body,
    status: message.status,
    blockedContentTypes: message.blockedContentTypes ?? [],
    createdAt: message.createdAt.toISOString(),
    senderName: message.senderName,
    senderRole: message.senderRole,
  };
}

export async function getListingMessagesForSession(
  session: AuthSession,
  listingId: string,
): Promise<ListingMessageSummary[]> {
  const user = await ensureUserRecord(session);
  const chatMessages = await getCollection("chatMessages");
  const listingObjectId = parseObjectId(listingId);
  const listing = await getListingForConversation(listingId);

  if (!listing) {
    throw new Error("This listing is not available for inquiries right now.");
  }

  const filter =
    session.user.role === "buyer"
      ? {
          listingId: listingObjectId,
          $or: [
            { threadBuyerUserId: user._id },
            { senderUserId: user._id },
          ],
        }
      : listing.ownerUserId.equals(user._id)
        ? {
            listingId: listingObjectId,
            ownerUserId: user._id,
            status: "sent" as const,
          }
        : null;

  if (!filter) {
    throw new Error("This role cannot open the selected conversation.");
  }

  const messages = await chatMessages.find(filter).sort({ createdAt: -1 }).limit(conversationLimit).toArray();

  return messages.reverse().map(serializeMessage);
}

export async function sendListingMessageForSession(
  session: AuthSession,
  listingId: string,
  body: string,
  options?: {
    buyerUserId?: string;
  },
) {
  const user = await ensureUserRecord(session);
  const listings = await getCollection("listings");
  const chatMessages = await getCollection("chatMessages");
  const auditLogs = await getCollection("auditLogs");
  const listingObjectId = parseObjectId(listingId);
  const listing = await listings.findOne({
    _id: listingObjectId,
    status: "active",
    verificationStatus: "approved",
  });

  if (!listing) {
    throw new Error("This listing is not available for inquiries right now.");
  }

  const normalizedBody = normalizeMessageBody(body);
  const now = new Date();

  if (session.user.role === "buyer") {
    if (listing.ownerUserId.equals(user._id)) {
      throw new Error("You cannot send a buyer inquiry on your own listing.");
    }

    const hasUnlock = await hasBuyerUnlockedListing(user._id, listingObjectId);
    const blockedContentTypes = hasUnlock ? [] : detectBlockedContentTypes(normalizedBody);
    const messageDocument: Omit<ChatMessageDocument, "_id"> = {
      listingId: listingObjectId,
      ownerUserId: listing.ownerUserId,
      threadBuyerUserId: user._id,
      senderUserId: user._id,
      senderRole: session.user.role,
      senderName: session.user.fullName.trim(),
      body: normalizedBody,
      status: blockedContentTypes.length > 0 ? "blocked" : "sent",
      blockedContentTypes: blockedContentTypes.length > 0 ? blockedContentTypes : undefined,
      createdAt: now,
      updatedAt: now,
    };
    const insertResult = await chatMessages.insertOne(messageDocument);

    if (blockedContentTypes.length > 0) {
      await auditLogs.insertOne({
        actorUserId: user._id,
        entityType: "chat_message",
        entityId: insertResult.insertedId.toString(),
        action: "buyer_inquiry_blocked_before_unlock",
        metadata: {
          listingId,
          ownerUserId: listing.ownerUserId.toString(),
          blockedContentTypes,
        },
        createdAt: now,
        updatedAt: now,
      });

      return {
        delivered: false,
        message: serializeMessage({
          ...messageDocument,
          _id: insertResult.insertedId,
        }),
        error:
          "Contact details, direct links, and exact location clues stay blocked until you unlock the listing.",
      };
    }

    await auditLogs.insertOne({
      actorUserId: user._id,
      entityType: "chat_message",
      entityId: insertResult.insertedId.toString(),
      action: hasUnlock ? "buyer_inquiry_sent_after_unlock" : "buyer_inquiry_sent_before_unlock",
      metadata: {
        listingId,
        ownerUserId: listing.ownerUserId.toString(),
        unlocked: hasUnlock,
      },
      createdAt: now,
      updatedAt: now,
    });

    await createNotification({
      userId: listing.ownerUserId,
      kind: "buyer_inquiry_received",
      severity: "info",
      title: "New buyer inquiry",
      body: `${session.user.fullName} sent a question about ${listing.title}.`,
      entityType: "chat_message",
      entityId: insertResult.insertedId.toString(),
      link: "/dashboard#notifications",
    });

    return {
      delivered: true,
      message: serializeMessage({
        ...messageDocument,
        _id: insertResult.insertedId,
      }),
      error: null,
    };
  }

  if (!listing.ownerUserId.equals(user._id)) {
    throw new Error("Only the listing owner can reply in this conversation.");
  }

  if (!options?.buyerUserId || !ObjectId.isValid(options.buyerUserId)) {
    throw new Error("A valid buyer conversation target is required for owner replies.");
  }

  if (listing.status !== "active") {
    throw new Error("Owner replies are currently limited to active listings.");
  }

  const threadBuyerUserId = new ObjectId(options.buyerUserId);
  const buyerHasUnlock = await hasBuyerUnlockedListing(threadBuyerUserId, listingObjectId);

  if (!buyerHasUnlock) {
    throw new Error("The buyer must unlock this listing before owner replies are enabled.");
  }

  const existingBuyerMessage = await chatMessages.findOne({
    listingId: listingObjectId,
    ownerUserId: user._id,
    $or: [{ threadBuyerUserId }, { senderUserId: threadBuyerUserId }],
    senderRole: "buyer",
    status: "sent",
  });

  if (!existingBuyerMessage) {
    throw new Error("This buyer does not have an active conversation thread on the listing.");
  }

  const messageDocument: Omit<ChatMessageDocument, "_id"> = {
    listingId: listingObjectId,
    ownerUserId: listing.ownerUserId,
    threadBuyerUserId,
    senderUserId: user._id,
    senderRole: session.user.role,
    senderName: session.user.fullName.trim(),
    body: normalizedBody,
    status: "sent",
    blockedContentTypes: undefined,
    createdAt: now,
    updatedAt: now,
  };
  const insertResult = await chatMessages.insertOne(messageDocument);

  await auditLogs.insertOne({
    actorUserId: user._id,
    entityType: "chat_message",
    entityId: insertResult.insertedId.toString(),
    action: "owner_reply_sent_after_unlock",
    metadata: {
      listingId,
      buyerUserId: threadBuyerUserId.toString(),
    },
    createdAt: now,
    updatedAt: now,
  });

  await createNotification({
    userId: threadBuyerUserId,
    kind: "listing_reply_received",
    severity: "info",
    title: "Owner replied to your listing conversation",
    body: `${listing.ownerContact.fullName} replied about ${listing.title}.`,
    entityType: "chat_message",
    entityId: insertResult.insertedId.toString(),
    link: `/listings/${listingId}`,
  });

  return {
    delivered: true,
    message: serializeMessage({
      ...messageDocument,
      _id: insertResult.insertedId,
    }),
    error: null,
  };
}

export async function getOwnerInquiryFeedForUser(ownerUserId: ObjectId): Promise<OwnerInquirySummary[]> {
  const chatMessages = await getCollection("chatMessages");
  const users = await getCollection("users");
  const listings = await getCollection("listings");
  const tokenUnlocks = await getCollection("tokenUnlocks");
  const messages = await chatMessages
    .find({
      ownerUserId,
      status: "sent",
    })
    .sort({ createdAt: -1 })
    .limit(ownerInboxLimit)
    .toArray();

  if (messages.length === 0) {
    return [];
  }

  const buyerIds = [
    ...new Set(
      messages
        .map((message) => getThreadBuyerUserId(message))
        .filter((buyerUserId): buyerUserId is ObjectId => buyerUserId !== null)
        .map((buyerUserId) => buyerUserId.toString()),
    ),
  ].map((id) => new ObjectId(id));
  const listingIds = [...new Set(messages.map((message) => message.listingId.toString()))].map((id) => new ObjectId(id));
  const [buyers, ownedListings, unlockRecords] = await Promise.all([
    users
      .find({
        _id: { $in: buyerIds },
      })
      .toArray(),
    listings
      .find({
        _id: { $in: listingIds },
      })
      .toArray(),
    tokenUnlocks
      .find({
        userId: { $in: buyerIds },
        listingId: { $in: listingIds },
      })
      .toArray(),
  ]);
  const buyerMap = new Map(buyers.map((buyer) => [buyer._id.toString(), buyer]));
  const listingMap = new Map(ownedListings.map((listing) => [listing._id.toString(), listing]));
  const unlockSet = new Set(unlockRecords.map((unlock) => `${unlock.listingId.toString()}:${unlock.userId.toString()}`));
  const threadMap = new Map<string, WithId<ChatMessageDocument>[]>();

  for (const message of messages) {
    const buyerUserId = getThreadBuyerUserId(message);

    if (!buyerUserId) {
      continue;
    }

    const threadKey = `${message.listingId.toString()}:${buyerUserId.toString()}`;
    const currentThread = threadMap.get(threadKey) ?? [];
    currentThread.push(message);
    threadMap.set(threadKey, currentThread);
  }

  return [...threadMap.entries()].flatMap(([threadKey, threadMessages]) => {
    const [listingId, buyerUserId] = threadKey.split(":");
    const listing = listingMap.get(listingId);
    const buyer = buyerMap.get(buyerUserId);
    const latestMessage = threadMessages[0];

    if (!listing || !buyer || !latestMessage) {
      return [];
    }

    return [
      {
        id: latestMessage._id.toString(),
        listingId,
        listingTitle: listing.title,
        listingCategory: listing.category,
        listingStatus: listing.status,
        buyerUserId,
        buyerName: buyer.fullName,
        buyerPhone: buyer.phone ?? null,
        body: latestMessage.body,
        createdAt: latestMessage.createdAt.toISOString(),
        buyerUnlockedListing: unlockSet.has(`${listingId}:${buyerUserId}`),
        messageCount: threadMessages.length,
        lastSenderRole: latestMessage.senderRole,
      },
    ];
  });
}

export async function getOwnerInquiryFeed(session: AuthSession): Promise<OwnerInquirySummary[]> {
  const user = await ensureUserRecord(session);

  return getOwnerInquiryFeedForUser(user._id);
}
