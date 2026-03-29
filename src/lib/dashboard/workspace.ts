import type { WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import type { ListingDocument, PaymentDocument } from "@/lib/domain";
import { getPublicListings, type PublicListingSummary } from "@/lib/listings/public";
import { getBuyerSeekerRequestsForUser, type BuyerSeekerRequestSummary } from "@/lib/seeker-requests/workflow";

export type BuyerUnlockSummary = {
  listingId: string;
  title: string;
  category: ListingDocument["category"];
  priceRwf: number;
  approximateAreaLabel: string;
  unlockedAt: string;
  amountPaidRwf: number;
  ownerName: string;
  ownerPhone: string;
  stillActive: boolean;
};

export type BuyerPaymentSummary = {
  id: string;
  reference: string;
  purpose: PaymentDocument["purpose"];
  amountRwf: number;
  status: PaymentDocument["status"];
  listingId: string | null;
  createdAt: string;
};

export type BuyerWorkspaceData = {
  stats: {
    unlockCount: number;
    totalSpentRwf: number;
    activeUnlockCount: number;
    paymentCount: number;
    seekerRequestCount: number;
    activeSeekerRequestCount: number;
  };
  unlockedListings: BuyerUnlockSummary[];
  recentPayments: BuyerPaymentSummary[];
  recommendedListings: PublicListingSummary[];
  seekerRequests: BuyerSeekerRequestSummary[];
};

function serializePayment(payment: WithId<PaymentDocument>): BuyerPaymentSummary {
  return {
    id: payment._id.toString(),
    reference: payment.reference,
    purpose: payment.purpose,
    amountRwf: payment.amountRwf,
    status: payment.status,
    listingId: payment.listingId?.toString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

export async function getBuyerWorkspaceData(session: AuthSession): Promise<BuyerWorkspaceData> {
  const user = await ensureUserRecord(session);
  const tokenUnlocks = await getCollection("tokenUnlocks");
  const listings = await getCollection("listings");
  const payments = await getCollection("payments");
  const seekerRequests = await getCollection("seekerRequests");
  const unlockRecords = await tokenUnlocks
    .find({
      userId: user._id,
    })
    .sort({ unlockedAt: -1 })
    .limit(12)
    .toArray();
  const listingIds = unlockRecords.map((unlock) => unlock.listingId);
  const unlockedListings = listingIds.length
    ? await listings
        .find({
          _id: { $in: listingIds },
        })
        .toArray()
    : [];
  const listingMap = new Map(unlockedListings.map((listing) => [listing._id.toString(), listing]));
  const recentPayments = await payments
    .find({
      userId: user._id,
      purpose: "token_fee",
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
  const paymentMap = new Map(
    recentPayments
      .filter((payment) => payment.listingId)
      .map((payment) => [payment.listingId!.toString(), payment]),
  );
  const aggregate = await payments
    .aggregate<{ _id: null; totalSpentRwf: number; paymentCount: number }>([
      {
        $match: {
          userId: user._id,
          purpose: "token_fee",
          status: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalSpentRwf: { $sum: "$amountRwf" },
          paymentCount: { $sum: 1 },
        },
      },
    ])
    .toArray();
  const totals = aggregate[0] ?? {
    totalSpentRwf: 0,
    paymentCount: 0,
  };
  const [buyerSeekerRequests, seekerRequestCount, activeSeekerRequestCount] = await Promise.all([
    getBuyerSeekerRequestsForUser(user._id),
    seekerRequests.countDocuments({
      requesterUserId: user._id,
    }),
    seekerRequests.countDocuments({
      requesterUserId: user._id,
      status: "active",
      expiresAt: { $gt: new Date() },
    }),
  ]);

  const unlockedListingSummaries = unlockRecords
    .map((unlock) => {
      const listing = listingMap.get(unlock.listingId.toString());

      if (!listing) {
        return null;
      }

      const payment = paymentMap.get(unlock.listingId.toString());

      return {
        listingId: listing._id.toString(),
        title: listing.title,
        category: listing.category,
        priceRwf: listing.priceRwf,
        approximateAreaLabel: listing.location.approximateAreaLabel,
        unlockedAt: unlock.unlockedAt.toISOString(),
        amountPaidRwf: payment?.amountRwf ?? listing.tokenFeeRwf ?? 10_000,
        ownerName: listing.ownerContact.fullName,
        ownerPhone: listing.ownerContact.phone,
        stillActive: listing.status === "active" && listing.verificationStatus === "approved",
      } satisfies BuyerUnlockSummary;
    })
    .filter((listing): listing is BuyerUnlockSummary => listing !== null);

  const recommendedListings = (await getPublicListings({})).slice(0, 4);

  return {
    stats: {
      unlockCount: unlockRecords.length,
      totalSpentRwf: totals.totalSpentRwf,
      activeUnlockCount: unlockedListingSummaries.filter((listing) => listing.stillActive).length,
      paymentCount: totals.paymentCount,
      seekerRequestCount,
      activeSeekerRequestCount,
    },
    unlockedListings: unlockedListingSummaries,
    recentPayments: recentPayments.map(serializePayment),
    recommendedListings,
    seekerRequests: buyerSeekerRequests,
  };
}
