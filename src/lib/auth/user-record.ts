import type { WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import type { UserDocument } from "@/lib/domain";
import { getCollection } from "@/lib/data/collections";

export async function ensureUserRecord(session: AuthSession): Promise<WithId<UserDocument>> {
  const users = await getCollection("users");
  const now = new Date();
  const fullName = session.user.fullName.trim();
  const phone = session.user.phone?.trim();
  const email = session.user.email?.trim();

  if (!phone) {
    throw new Error("A phone number is required to create a session-backed user.");
  }

  const user = await users.findOneAndUpdate(
    { phone },
    {
      $set: {
        fullName,
        role: session.user.role,
        email: email || undefined,
        phone,
        status: "active",
        lastLoginAt: now,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
        isPhoneVerified: false,
        isEmailVerified: false,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    },
  );

  if (!user) {
    throw new Error("Could not create or load the session user record.");
  }

  return user;
}
