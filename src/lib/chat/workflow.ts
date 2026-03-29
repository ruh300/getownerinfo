import { ObjectId, type WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import type { BlockedContentType, ChatMessageDocument, ListingDocument } from "@/lib/domain";

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
  buyerName: string;
  buyerPhone: string | null;
  body: string;
  createdAt: string;
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

async function getAvailableListing(listingId: string) {
  const listings = await getCollection("listings");

  return listings.findOne({
    _id: parseObjectId(listingId),
    status: "active",
    verificationStatus: "approved",
  });
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
  const listing = await getAvailableListing(listingId);

  if (!listing) {
    throw new Error("This listing is not available for inquiries right now.");
  }

  const filter = listing.ownerUserId.equals(user._id)
    ? {
        listingId: listingObjectId,
        ownerUserId: user._id,
        status: "sent" as const,
      }
    : {
        listingId: listingObjectId,
        senderUserId: user._id,
      };
  const messages = await chatMessages.find(filter).sort({ createdAt: -1 }).limit(conversationLimit).toArray();

  return messages.reverse().map(serializeMessage);
}

export async function sendListingMessageForSession(
  session: AuthSession,
  listingId: string,
  body: string,
) {
  const user = await ensureUserRecord(session);

  if (session.user.role !== "buyer") {
    throw new Error("Availability questions are currently limited to buyer accounts.");
  }

  const listings = await getCollection("listings");
  const tokenUnlocks = await getCollection("tokenUnlocks");
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

  if (listing.ownerUserId.equals(user._id)) {
    throw new Error("You cannot send a buyer inquiry on your own listing.");
  }

  const normalizedBody = normalizeMessageBody(body);
  const hasUnlock = Boolean(
    await tokenUnlocks.findOne({
      userId: user._id,
      listingId: listingObjectId,
    }),
  );
  const blockedContentTypes = hasUnlock ? [] : detectBlockedContentTypes(normalizedBody);
  const now = new Date();
  const messageDocument: Omit<ChatMessageDocument, "_id"> = {
    listingId: listingObjectId,
    ownerUserId: listing.ownerUserId,
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

  const senderIds = [...new Set(messages.map((message) => message.senderUserId.toString()))].map((id) => new ObjectId(id));
  const listingIds = [...new Set(messages.map((message) => message.listingId.toString()))].map((id) => new ObjectId(id));
  const [buyers, ownedListings] = await Promise.all([
    users
      .find({
        _id: { $in: senderIds },
      })
      .toArray(),
    listings
      .find({
        _id: { $in: listingIds },
      })
      .toArray(),
  ]);
  const buyerMap = new Map(buyers.map((buyer) => [buyer._id.toString(), buyer]));
  const listingMap = new Map(ownedListings.map((listing) => [listing._id.toString(), listing]));

  return messages.flatMap((message) => {
    const listing = listingMap.get(message.listingId.toString());

    if (!listing) {
      return [];
    }

    const buyer = buyerMap.get(message.senderUserId.toString());

    return [
      {
        id: message._id.toString(),
        listingId: listing._id.toString(),
        listingTitle: listing.title,
        listingCategory: listing.category,
        buyerName: message.senderName,
        buyerPhone: buyer?.phone ?? null,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      },
    ];
  });
}

export async function getOwnerInquiryFeed(session: AuthSession): Promise<OwnerInquirySummary[]> {
  const user = await ensureUserRecord(session);

  return getOwnerInquiryFeedForUser(user._id);
}
