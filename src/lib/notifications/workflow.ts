import { ObjectId, type WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import type {
  NotificationDocument,
  NotificationKind,
  NotificationSeverity,
  UserDocument,
  UserRole,
} from "@/lib/domain";

export type NotificationSummary = {
  id: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  body: string;
  link: string | null;
  entityType: NotificationDocument["entityType"];
  entityId: string;
  createdAt: string;
  readAt: string | null;
};

export type NotificationCenterData = {
  unreadCount: number;
  items: NotificationSummary[];
};

type CreateNotificationInput = {
  userId: ObjectId;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  body: string;
  entityType: NotificationDocument["entityType"];
  entityId: string;
  link?: string;
};

type CreateRoleNotificationInput = Omit<CreateNotificationInput, "userId">;
type CreateUserNotificationInput = Omit<CreateNotificationInput, "userId">;

function serializeNotification(notification: WithId<NotificationDocument>): NotificationSummary {
  return {
    id: notification._id.toString(),
    kind: notification.kind,
    severity: notification.severity,
    title: notification.title,
    body: notification.body,
    link: notification.link ?? null,
    entityType: notification.entityType,
    entityId: notification.entityId,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
  };
}

export async function createNotification(input: CreateNotificationInput) {
  const notifications = await getCollection("notifications");
  const now = new Date();
  const document: Omit<NotificationDocument, "_id"> = {
    userId: input.userId,
    kind: input.kind,
    severity: input.severity,
    title: input.title,
    body: input.body,
    entityType: input.entityType,
    entityId: input.entityId,
    link: input.link,
    createdAt: now,
    updatedAt: now,
  };
  const result = await notifications.insertOne(document);

  return {
    ...document,
    _id: result.insertedId,
  };
}

export async function notifyUsersByRoles(roles: UserRole[], input: CreateRoleNotificationInput) {
  const users = await getCollection("users");
  const notifications = await getCollection("notifications");
  const recipients = await users
    .find({
      role: { $in: roles },
      status: "active",
    })
    .toArray();

  if (recipients.length === 0) {
    return 0;
  }

  const now = new Date();
  await notifications.insertMany(
    recipients.map((user) => ({
      userId: user._id,
      kind: input.kind,
      severity: input.severity,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
      link: input.link,
      createdAt: now,
      updatedAt: now,
    })),
  );

  return recipients.length;
}

export async function notifyUsersByIds(userIds: ObjectId[], input: CreateUserNotificationInput) {
  if (userIds.length === 0) {
    return 0;
  }

  const notifications = await getCollection("notifications");
  const uniqueUserIds = [...new Set(userIds.map((userId) => userId.toString()))].map((id) => new ObjectId(id));
  const now = new Date();
  await notifications.insertMany(
    uniqueUserIds.map((userId) => ({
      userId,
      kind: input.kind,
      severity: input.severity,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
      link: input.link,
      createdAt: now,
      updatedAt: now,
    })),
  );

  return uniqueUserIds.length;
}

export async function getNotificationCenterForUserId(userId: ObjectId, limit = 8): Promise<NotificationCenterData> {
  const notifications = await getCollection("notifications");
  const [items, unreadCount] = await Promise.all([
    notifications
      .find({
        userId,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray(),
    notifications.countDocuments({
      userId,
      readAt: { $exists: false },
    }),
  ]);

  return {
    unreadCount,
    items: items.map(serializeNotification),
  };
}

export async function getNotificationCenterForSession(
  session: AuthSession,
  limit = 8,
): Promise<NotificationCenterData> {
  const user = await ensureUserRecord(session);

  return getNotificationCenterForUserId(user._id, limit);
}

export async function getUnreadNotificationCountForSession(session: AuthSession) {
  const user = await ensureUserRecord(session);
  const notifications = await getCollection("notifications");

  return notifications.countDocuments({
    userId: user._id,
    readAt: { $exists: false },
  });
}

export async function markAllNotificationsReadForSession(session: AuthSession) {
  const user = await ensureUserRecord(session);
  const notifications = await getCollection("notifications");
  const now = new Date();
  const result = await notifications.updateMany(
    {
      userId: user._id,
      readAt: { $exists: false },
    },
    {
      $set: {
        readAt: now,
        updatedAt: now,
      },
    },
  );

  return result.modifiedCount;
}

export async function getNotificationRecipientsByRoles(roles: UserRole[]) {
  const users = await getCollection("users");
  const recipients = await users
    .find({
      role: { $in: roles },
      status: "active",
    })
    .toArray();

  return new Map(recipients.map((user: WithId<UserDocument>) => [user._id.toString(), user]));
}
